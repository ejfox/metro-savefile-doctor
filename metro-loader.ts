/**
 * .metro Binary Format Loader
 *
 * Reads and writes Subway Builder .metro save files
 * Format spec: 4KB header + autosave index + optional thumbnail + compressed bundle
 *
 * IMPORTANT: This writer is LOSSLESS. It preserves the entire decompressed
 * bundle (mainSave + full autosaves + timelapse/viewport/version/etc.) and the
 * thumbnail, mutating only the edited fields. Earlier versions rebuilt a lossy
 * subset of the bundle, which destroyed autosaves and timelapse data.
 *
 * Header layout must stay in sync with the game's MetroFormat.ts:
 *   0-3    Magic "METR"
 *   8-11   Autosave index offset (uint32)
 *   12-15  Autosave index size (uint32)
 *   16-19  Thumbnail offset (uint32)
 *   20-23  Thumbnail size (uint32)
 *   24-27  Game data offset (uint32)
 *   28-31  Game data size (uint32)
 *   32-39  Timestamp (int64)
 *   40-295 Save name (256 bytes, UTF-8)
 *   296-327 City code (32 bytes, UTF-8)
 *   328-391 Game session ID (64 bytes, UTF-8)
 *   392-903 Stats JSON (512 bytes, UTF-8)
 *   904-907 Autosave count (uint32)
 *   908-911 Max autosaves (uint32)
 *   912-915 Data checksum (CRC32, uint32)
 *   916     Tutorial-save flag (uint8)
 */

import fs from 'fs/promises';
import { promisify } from 'util';
import * as zlib from 'zlib';

const gunzip = promisify(zlib.gunzip);
const gzip = promisify(zlib.gzip);

const HEADER_SIZE = 4096;
const MAGIC = 'METR';

/**
 * Calculate CRC32 checksum of data
 * Used to verify data integrity - must match the algorithm in MetroFormat.ts
 */
function calculateChecksum(data: Buffer): number {
    let crc = 0xffffffff;
    for (let i = 0; i < data.length; i++) {
        crc ^= data[i];
        for (let j = 0; j < 8; j++) {
            crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
        }
    }
    return (crc ^ 0xffffffff) >>> 0;
}

export type SaveStats = {
    stations: number;
    routes: number;
    trains: number;
    money: number;
    elapsedSeconds: number;
};

export type MetroSaveData = {
    // Header metadata
    name: string;
    cityCode: string;
    timestamp: number;
    gameSessionId: string;
    stats: SaveStats;

    // Game data (live reference into the bundle's mainSave.data)
    data: any;

    // Preserved state for lossless round-tripping
    _bundle?: any; // Full decompressed bundle { mainSave, autosaves, ... }
    _isBundle?: boolean; // Whether the file used the mainSave/autosaves bundle shape
    _headerBuffer?: Buffer; // Original 4KB header (preserves flags we don't touch)
    _autosaveIndex?: any[]; // Lightweight autosave index (metadata region, preserved verbatim)
    _thumbnail?: Buffer; // Preserved thumbnail PNG bytes (empty if none)
};

/**
 * Recompute header stats from game data.
 * Mirrors MetroFormat.extractStats so the home menu (which reads stats straight
 * from the header without decompressing) shows the edited values.
 */
function computeStats(data: any): SaveStats {
    const stations = Array.isArray(data?.stations) ? data.stations.length : 0;
    const routes = Array.isArray(data?.routes) ? data.routes.length : 0;
    const trains = Array.isArray(data?.trains) ? data.trains.length : 0;
    const money = typeof data?.money === 'number' ? data.money : 0;
    const elapsedSeconds = typeof data?.elapsedSeconds === 'number' ? data.elapsedSeconds : 0;
    return { stations, routes, trains, money, elapsedSeconds };
}

/**
 * Read a .metro save file
 */
export async function readMetroSave(filepath: string): Promise<MetroSaveData> {
    const fileBuffer = await fs.readFile(filepath);

    // Verify header
    const magic = fileBuffer.toString('utf8', 0, 4);
    if (magic !== MAGIC) {
        throw new Error(`Invalid .metro file: magic bytes "${magic}" != "${MAGIC}"`);
    }

    // Parse header
    const header = parseHeader(fileBuffer.subarray(0, HEADER_SIZE));

    // Read autosave index (lightweight metadata region — preserved verbatim on write)
    let autosaveIndex: any[] = [];
    if (header.autosaveIndexSize > 0) {
        const indexBuffer = fileBuffer.subarray(
            header.autosaveIndexOffset,
            header.autosaveIndexOffset + header.autosaveIndexSize
        );
        try {
            autosaveIndex = JSON.parse(indexBuffer.toString('utf8'));
        } catch (err) {
            console.warn('Failed to parse autosave index:', err);
        }
    }

    // Preserve the thumbnail bytes so they survive a round-trip
    let thumbnail = Buffer.alloc(0);
    if (header.thumbnailSize > 0) {
        thumbnail = Buffer.from(
            fileBuffer.subarray(header.thumbnailOffset, header.thumbnailOffset + header.thumbnailSize)
        );
    }

    // Read and decompress game data
    const compressedData = fileBuffer.subarray(header.gameDataOffset, header.gameDataOffset + header.gameDataSize);
    const decompressed = await gunzip(compressedData);
    const bundle = JSON.parse(decompressed.toString('utf8'));

    // Extract main save data (bundle format uses mainSave; v1 saves are flat)
    const isBundle = !!bundle.mainSave;
    const mainSave = isBundle ? bundle.mainSave : bundle;
    const data = mainSave.data || mainSave;

    return {
        name: header.name,
        cityCode: header.cityCode,
        timestamp: header.timestamp,
        gameSessionId: header.gameSessionId,
        stats: header.stats,
        data,
        _bundle: bundle,
        _isBundle: isBundle,
        _headerBuffer: Buffer.from(fileBuffer.subarray(0, HEADER_SIZE)),
        _autosaveIndex: autosaveIndex,
        _thumbnail: thumbnail,
    };
}

/**
 * Write a .metro save file (lossless — preserves autosaves, timelapse, thumbnail)
 */
export async function writeMetroSave(filepath: string, saveData: MetroSaveData): Promise<void> {
    // Recompute stats from the (possibly edited) game data so the header stays accurate
    const stats = computeStats(saveData.data);

    // Reuse the full preserved bundle, mutating only what we edited.
    let bundle: any;
    if (saveData._bundle && saveData._isBundle && saveData._bundle.mainSave) {
        bundle = saveData._bundle;
        bundle.mainSave.data = saveData.data;
        bundle.mainSave.stats = stats;
        bundle.mainSave.name = saveData.name;
        bundle.mainSave.timestamp = saveData.timestamp;
        bundle.mainSave.cityCode = saveData.cityCode;
        if (saveData.gameSessionId) {
            bundle.mainSave.gameSessionId = saveData.gameSessionId;
        }
    } else if (saveData._bundle) {
        // v1 flat save: mutate the preserved object in place
        bundle = saveData._bundle;
        if (bundle.data) {
            bundle.data = saveData.data;
        } else {
            bundle = saveData.data;
        }
    } else {
        // Last-resort fallback (e.g. constructed without reading): minimal bundle
        bundle = {
            mainSave: {
                id: saveData.gameSessionId,
                name: saveData.name,
                timestamp: saveData.timestamp,
                cityCode: saveData.cityCode,
                gameSessionId: saveData.gameSessionId,
                stats,
                data: saveData.data,
            },
            autosaves: [],
        };
    }

    // Compress bundle
    const bundleJson = JSON.stringify(bundle);
    const compressed = await gzip(Buffer.from(bundleJson, 'utf8'));

    // Autosave index region (preserved verbatim)
    const autosaveIndex = saveData._autosaveIndex || [];
    const autosaveIndexBuffer = Buffer.from(JSON.stringify(autosaveIndex), 'utf8');

    // Thumbnail (preserved verbatim)
    const thumbnail = saveData._thumbnail && saveData._thumbnail.length > 0 ? saveData._thumbnail : Buffer.alloc(0);

    // Calculate offsets: [header][index][thumbnail][gameData]
    const autosaveIndexOffset = HEADER_SIZE;
    const autosaveIndexSize = autosaveIndexBuffer.length;
    const thumbnailOffset = autosaveIndexOffset + autosaveIndexSize;
    const thumbnailSize = thumbnail.length;
    const gameDataOffset = thumbnailOffset + thumbnailSize;
    const gameDataSize = compressed.length;

    // Reuse existing header (keeps tutorial flag, max-autosaves, reserved bytes) or make a fresh one
    const header = saveData._headerBuffer ? Buffer.from(saveData._headerBuffer) : Buffer.alloc(HEADER_SIZE);
    const isFreshHeader = !saveData._headerBuffer;

    // Magic + offsets
    header.write(MAGIC, 0, 4, 'utf8');
    header.writeUInt32LE(autosaveIndexOffset, 8);
    header.writeUInt32LE(autosaveIndexSize, 12);
    header.writeUInt32LE(thumbnailOffset, 16);
    header.writeUInt32LE(thumbnailSize, 20);
    header.writeUInt32LE(gameDataOffset, 24);
    header.writeUInt32LE(gameDataSize, 28);

    // Timestamp (int64)
    header.writeBigInt64LE(BigInt(Math.floor(saveData.timestamp)), 32);

    // Name (256 bytes)
    const nameBuffer = Buffer.alloc(256);
    nameBuffer.write(saveData.name, 0, 255, 'utf8');
    nameBuffer.copy(header, 40);

    // City code (32 bytes)
    const cityBuffer = Buffer.alloc(32);
    cityBuffer.write(saveData.cityCode, 0, 31, 'utf8');
    cityBuffer.copy(header, 296);

    // Game session ID (64 bytes)
    const sessionBuffer = Buffer.alloc(64);
    sessionBuffer.write(saveData.gameSessionId, 0, 63, 'utf8');
    sessionBuffer.copy(header, 328);

    // Stats JSON (512 bytes)
    const statsBuffer = Buffer.alloc(512);
    statsBuffer.write(JSON.stringify(stats), 0, 511, 'utf8');
    statsBuffer.copy(header, 392);

    // Autosave count + max autosaves (only default max on a brand-new header)
    header.writeUInt32LE(autosaveIndex.length, 904);
    if (isFreshHeader) {
        header.writeUInt32LE(10, 908);
    }

    // Checksum of compressed data (offset 912)
    header.writeUInt32LE(calculateChecksum(compressed), 912);

    // Combine all parts
    const parts = [header, autosaveIndexBuffer];
    if (thumbnailSize > 0) {
        parts.push(thumbnail);
    }
    parts.push(compressed);

    await fs.writeFile(filepath, Buffer.concat(parts));
}

/**
 * Parse .metro header
 */
function parseHeader(headerBuffer: Buffer) {
    const magic = headerBuffer.toString('utf8', 0, 4);
    const autosaveIndexOffset = headerBuffer.readUInt32LE(8);
    const autosaveIndexSize = headerBuffer.readUInt32LE(12);
    const thumbnailOffset = headerBuffer.readUInt32LE(16);
    const thumbnailSize = headerBuffer.readUInt32LE(20);
    const gameDataOffset = headerBuffer.readUInt32LE(24);
    const gameDataSize = headerBuffer.readUInt32LE(28);
    const timestamp = Number(headerBuffer.readBigInt64LE(32));

    // Read strings (null-terminated or max length)
    const name = readString(headerBuffer, 40, 256);
    const cityCode = readString(headerBuffer, 296, 32);
    const gameSessionId = readString(headerBuffer, 328, 64);
    const statsJson = readString(headerBuffer, 392, 512);

    let stats: SaveStats = { stations: 0, routes: 0, trains: 0, money: 0, elapsedSeconds: 0 };
    try {
        stats = { elapsedSeconds: 0, ...JSON.parse(statsJson) };
    } catch (err) {
        console.warn('Failed to parse stats from header');
    }

    return {
        magic,
        autosaveIndexOffset,
        autosaveIndexSize,
        thumbnailOffset,
        thumbnailSize,
        gameDataOffset,
        gameDataSize,
        timestamp,
        name,
        cityCode,
        gameSessionId,
        stats,
    };
}

/**
 * Read null-terminated or fixed-length string from buffer
 */
function readString(buffer: Buffer, offset: number, maxLength: number): string {
    const slice = buffer.subarray(offset, offset + maxLength);
    const nullIndex = slice.indexOf(0);
    const end = nullIndex === -1 ? maxLength : nullIndex;
    return slice.toString('utf8', 0, end).trim();
}

/**
 * Check if a file is .metro format
 */
export async function isMetroFile(filepath: string): Promise<boolean> {
    try {
        const fd = await fs.open(filepath, 'r');
        const buffer = Buffer.alloc(4);
        await fd.read(buffer, 0, 4, 0);
        await fd.close();
        return buffer.toString('utf8') === MAGIC;
    } catch {
        return false;
    }
}
