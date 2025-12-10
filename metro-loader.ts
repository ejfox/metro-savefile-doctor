/**
 * .metro Binary Format Loader
 *
 * Reads and writes Subway Builder .metro save files
 * Format spec: 4KB header + autosave index + compressed bundle data
 */

import fs from 'fs/promises';
import { promisify } from 'util';
import * as zlib from 'zlib';

const gunzip = promisify(zlib.gunzip);
const gzip = promisify(zlib.gzip);

const HEADER_SIZE = 4096;
const MAGIC = 'METR';

export type MetroSaveData = {
	// Header metadata
	name: string;
	cityCode: string;
	timestamp: number;
	gameSessionId: string;
	stats: {
		stations: number;
		routes: number;
		trains: number;
		money: number;
	};

	// Game data (from compressed bundle)
	data: any;

	// Full header buffer (for writing back)
	_headerBuffer?: Buffer;
	_autosaveIndex?: any[];
};

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

	// Read autosave index
	let autosaveIndex = [];
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

	// Read and decompress game data
	const compressedData = fileBuffer.subarray(
		header.gameDataOffset,
		header.gameDataOffset + header.gameDataSize
	);

	const decompressed = await gunzip(compressedData);
	const bundle = JSON.parse(decompressed.toString('utf8'));

	// Extract main save data
	const gameData = bundle.mainSave || bundle;

	return {
		name: header.name,
		cityCode: header.cityCode,
		timestamp: header.timestamp,
		gameSessionId: header.gameSessionId,
		stats: header.stats,
		data: gameData.data || gameData,
		_headerBuffer: fileBuffer.subarray(0, HEADER_SIZE),
		_autosaveIndex: autosaveIndex,
	};
}

/**
 * Write a .metro save file
 */
export async function writeMetroSave(
	filepath: string,
	saveData: MetroSaveData
): Promise<void> {
	// Reconstruct bundle
	const bundle = {
		mainSave: {
			id: saveData.gameSessionId,
			name: saveData.name,
			timestamp: saveData.timestamp,
			cityCode: saveData.cityCode,
			stats: saveData.stats,
			data: saveData.data,
		},
		autosaves: saveData._autosaveIndex || [],
	};

	// Compress bundle
	const bundleJson = JSON.stringify(bundle);
	const compressed = await gzip(Buffer.from(bundleJson, 'utf8'));

	// Prepare autosave index
	const autosaveIndexJson = JSON.stringify(saveData._autosaveIndex || []);
	const autosaveIndexBuffer = Buffer.from(autosaveIndexJson, 'utf8');

	// Calculate offsets
	const autosaveIndexOffset = HEADER_SIZE;
	const autosaveIndexSize = autosaveIndexBuffer.length;
	const gameDataOffset = autosaveIndexOffset + autosaveIndexSize;
	const gameDataSize = compressed.length;

	// Create new header or update existing
	const header = saveData._headerBuffer
		? Buffer.from(saveData._headerBuffer)
		: Buffer.alloc(HEADER_SIZE);

	// Write/update header fields
	header.write(MAGIC, 0, 4, 'utf8');
	header.writeUInt32LE(autosaveIndexOffset, 8);
	header.writeUInt32LE(autosaveIndexSize, 12);
	// Skip thumbnail offsets (16-23)
	header.writeUInt32LE(gameDataOffset, 24);
	header.writeUInt32LE(gameDataSize, 28);

	// Write timestamp (int64)
	const timestamp = BigInt(saveData.timestamp);
	header.writeBigInt64LE(timestamp, 32);

	// Write name (256 bytes)
	const nameBuffer = Buffer.alloc(256);
	nameBuffer.write(saveData.name, 0, 255, 'utf8');
	nameBuffer.copy(header, 40);

	// Write city code (32 bytes)
	const cityBuffer = Buffer.alloc(32);
	cityBuffer.write(saveData.cityCode, 0, 31, 'utf8');
	cityBuffer.copy(header, 296);

	// Write game session ID (64 bytes)
	const sessionBuffer = Buffer.alloc(64);
	sessionBuffer.write(saveData.gameSessionId, 0, 63, 'utf8');
	sessionBuffer.copy(header, 328);

	// Write stats JSON (512 bytes)
	const statsBuffer = Buffer.alloc(512);
	const statsJson = JSON.stringify(saveData.stats);
	statsBuffer.write(statsJson, 0, 511, 'utf8');
	statsBuffer.copy(header, 392);

	// Combine all parts
	const finalBuffer = Buffer.concat([
		header,
		autosaveIndexBuffer,
		compressed,
	]);

	await fs.writeFile(filepath, finalBuffer);
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

	let stats = { stations: 0, routes: 0, trains: 0, money: 0 };
	try {
		stats = JSON.parse(statsJson);
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
