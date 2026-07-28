/**
 * Round-trip test for the .metro loader.
 *
 * Builds a synthetic .metro file that matches the game's MetroFormat.ts layout
 * ([header][index][thumbnail][gzip bundle]), then verifies that reading it,
 * editing a field, and writing it back preserves EVERYTHING the game cares about:
 * autosaves (with full data), timelapse frames, viewport, version, and the
 * thumbnail — while updating money and the header stats.
 *
 * Run: bun test
 */

import { test, expect } from 'bun:test';
import { promisify } from 'util';
import * as zlib from 'zlib';
import { tmpdir } from 'os';
import { join } from 'path';
import fs from 'fs/promises';

import { readMetroSave, writeMetroSave } from '../metro-loader.ts';

const gzip = promisify(zlib.gzip);
const HEADER_SIZE = 4096;

function crc32(data: Buffer): number {
    let crc = 0xffffffff;
    for (let i = 0; i < data.length; i++) {
        crc ^= data[i];
        for (let j = 0; j < 8; j++) crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
    return (crc ^ 0xffffffff) >>> 0;
}

/** Build a save game object shaped like the game's SaveGameSchema */
function makeSave(name: string, money: number, id: string) {
    return {
        id,
        name,
        version: 3,
        timestamp: 1_700_000_000_000,
        cityCode: 'nyc',
        gameSessionId: 'session-abc',
        timelapse: { frames: [{ day: 1, elapsedSeconds: 86400, capturedAt: 1, image: 'data:image/png;base64,AAAA' }] },
        viewport: { zoom: 12, pitch: 45 },
        data: {
            tracks: [{ id: 'tr1' }],
            trains: [{ id: 't1' }, { id: 't2' }],
            routes: [{ id: 'r1' }],
            stations: [{ id: 's1' }, { id: 's2' }, { id: 's3' }],
            money,
            elapsedSeconds: 172800,
            ownedTrainCount: 5,
            transitCost: 2.75,
            gameMode: 'normal',
            timeConfig: { elapsedSeconds: 172800 },
        },
    };
}

async function buildMetroFile(path: string) {
    const mainSave = makeSave('My City', 500_000, 'save-main');
    const autosaves = [makeSave('Auto 1', 111, 'save-a1'), makeSave('Auto 2', 222, 'save-a2')];
    const bundle = { mainSave, autosaves };

    const compressed = await gzip(Buffer.from(JSON.stringify(bundle), 'utf8'));

    // Lightweight autosave index (metadata-only, as the game writes it)
    const indexArr = autosaves.map((s) => ({
        name: s.name,
        timestamp: s.timestamp,
        cityCode: s.cityCode,
        gameSessionId: s.gameSessionId,
        stats: { stations: 3, routes: 1, trains: 2, money: s.data.money, elapsedSeconds: 172800 },
    }));
    const indexBuf = Buffer.from(JSON.stringify(indexArr), 'utf8');

    // Fake thumbnail bytes (a stand-in PNG blob)
    const thumbnail = Buffer.from('PNG-THUMBNAIL-BYTES-1234567890', 'utf8');

    const indexOffset = HEADER_SIZE;
    const thumbOffset = indexOffset + indexBuf.length;
    const dataOffset = thumbOffset + thumbnail.length;

    const header = Buffer.alloc(HEADER_SIZE);
    header.write('METR', 0, 4, 'utf8');
    header.writeUInt32LE(indexOffset, 8);
    header.writeUInt32LE(indexBuf.length, 12);
    header.writeUInt32LE(thumbOffset, 16);
    header.writeUInt32LE(thumbnail.length, 20);
    header.writeUInt32LE(dataOffset, 24);
    header.writeUInt32LE(compressed.length, 28);
    header.writeBigInt64LE(BigInt(mainSave.timestamp), 32);
    header.write(mainSave.name, 40, 255, 'utf8');
    header.write(mainSave.cityCode, 296, 31, 'utf8');
    header.write(mainSave.gameSessionId, 328, 63, 'utf8');
    header.write(JSON.stringify({ stations: 3, routes: 1, trains: 2, money: 500_000, elapsedSeconds: 172800 }), 392, 511, 'utf8');
    header.writeUInt32LE(autosaves.length, 904);
    header.writeUInt32LE(10, 908);
    header.writeUInt32LE(crc32(compressed), 912);
    header.writeUInt8(1, 916); // not a tutorial save

    await fs.writeFile(path, Buffer.concat([header, indexBuf, thumbnail, compressed]));
}

test('editing money preserves autosaves, timelapse, viewport, thumbnail; updates stats', async () => {
    const path = join(tmpdir(), `roundtrip-${process.pid}.metro`);
    await buildMetroFile(path);

    // Read → edit → write
    const save = await readMetroSave(path);
    expect(save.data.money).toBe(500_000);
    expect(save._bundle.autosaves.length).toBe(2);

    save.data.money = 999_999_999;
    save.data.ownedTrainCount = 100;
    await writeMetroSave(path, save);

    // Read back
    const reloaded = await readMetroSave(path);

    // Edited fields applied
    expect(reloaded.data.money).toBe(999_999_999);
    expect(reloaded.data.ownedTrainCount).toBe(100);

    // Header stats recomputed from data (money reflected; menu reads this without decompressing)
    expect(reloaded.stats.money).toBe(999_999_999);
    expect(reloaded.stats.stations).toBe(3);
    expect(reloaded.stats.routes).toBe(1);
    expect(reloaded.stats.trains).toBe(2); // array length, matching the game
    expect(reloaded.stats.elapsedSeconds).toBe(172800);

    // Autosaves preserved WITH full data (this was destroyed before the fix)
    expect(reloaded._bundle.autosaves.length).toBe(2);
    expect(reloaded._bundle.autosaves[0].data.money).toBe(111);
    expect(reloaded._bundle.autosaves[1].data.stations.length).toBe(3);
    expect(reloaded._bundle.autosaves[0].name).toBe('Auto 1');

    // mainSave extras preserved (timelapse/viewport/version were dropped before the fix)
    expect(reloaded._bundle.mainSave.timelapse.frames.length).toBe(1);
    expect(reloaded._bundle.mainSave.viewport.zoom).toBe(12);
    expect(reloaded._bundle.mainSave.version).toBe(3);

    // Other data fields intact
    expect(reloaded.data.transitCost).toBe(2.75);
    expect(reloaded.data.gameMode).toBe('normal');
    expect(reloaded.data.elapsedSeconds).toBe(172800);

    // Thumbnail preserved and correctly offset (was corrupted before the fix)
    expect(Buffer.from(reloaded._thumbnail!).toString('utf8')).toBe('PNG-THUMBNAIL-BYTES-1234567890');

    await fs.unlink(path).catch(() => {});
});
