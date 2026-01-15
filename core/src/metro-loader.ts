/**
 * Browser-compatible .metro Binary Format Loader
 *
 * Reads and writes Subway Builder .metro save files
 * Uses pako for gzip compression (browser-compatible alternative to Node zlib)
 */

import pako from 'pako';
import type { MetroSaveData, SaveStats } from './types.js';

const HEADER_SIZE = 4096;
const MAGIC = 'METR';

/**
 * Calculate CRC32 checksum of data
 */
function calculateChecksum(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i];
    for (let j = 0; j < 8; j++) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/**
 * Read null-terminated or fixed-length string from DataView
 */
function readString(view: DataView, offset: number, maxLength: number): string {
  const bytes: number[] = [];
  for (let i = 0; i < maxLength; i++) {
    const byte = view.getUint8(offset + i);
    if (byte === 0) break;
    bytes.push(byte);
  }
  return new TextDecoder().decode(new Uint8Array(bytes)).trim();
}

/**
 * Write string to Uint8Array with max length
 */
function writeString(target: Uint8Array, offset: number, str: string, maxLength: number): void {
  const encoder = new TextEncoder();
  const encoded = encoder.encode(str);
  const length = Math.min(encoded.length, maxLength - 1);
  for (let i = 0; i < length; i++) {
    target[offset + i] = encoded[i];
  }
  // Null terminate
  target[offset + length] = 0;
}

interface HeaderData {
  magic: string;
  autosaveIndexOffset: number;
  autosaveIndexSize: number;
  thumbnailOffset: number;
  thumbnailSize: number;
  gameDataOffset: number;
  gameDataSize: number;
  timestamp: number;
  name: string;
  cityCode: string;
  gameSessionId: string;
  stats: SaveStats;
}

/**
 * Parse .metro header from ArrayBuffer
 */
function parseHeader(buffer: ArrayBuffer): HeaderData {
  const view = new DataView(buffer);

  const magic = readString(view, 0, 4);
  const autosaveIndexOffset = view.getUint32(8, true);
  const autosaveIndexSize = view.getUint32(12, true);
  const thumbnailOffset = view.getUint32(16, true);
  const thumbnailSize = view.getUint32(20, true);
  const gameDataOffset = view.getUint32(24, true);
  const gameDataSize = view.getUint32(28, true);

  // Read timestamp as BigInt64 (little endian)
  const timestampLow = view.getUint32(32, true);
  const timestampHigh = view.getInt32(36, true);
  const timestamp = timestampLow + timestampHigh * 0x100000000;

  const name = readString(view, 40, 256);
  const cityCode = readString(view, 296, 32);
  const gameSessionId = readString(view, 328, 64);
  const statsJson = readString(view, 392, 512);

  let stats: SaveStats = { stations: 0, routes: 0, trains: 0, money: 0 };
  try {
    stats = JSON.parse(statsJson);
  } catch {
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
 * Parse a .metro save from ArrayBuffer
 */
export function parseMetroBuffer(buffer: ArrayBuffer): MetroSaveData {
  const uint8 = new Uint8Array(buffer);

  // Verify magic
  const magic = new TextDecoder().decode(uint8.slice(0, 4));
  if (magic !== MAGIC) {
    throw new Error(`Invalid .metro file: magic bytes "${magic}" != "${MAGIC}"`);
  }

  const header = parseHeader(buffer.slice(0, HEADER_SIZE));

  // Read autosave index
  let autosaveIndex: any[] = [];
  if (header.autosaveIndexSize > 0) {
    const indexBytes = uint8.slice(
      header.autosaveIndexOffset,
      header.autosaveIndexOffset + header.autosaveIndexSize
    );
    try {
      autosaveIndex = JSON.parse(new TextDecoder().decode(indexBytes));
    } catch {
      console.warn('Failed to parse autosave index');
    }
  }

  // Read and decompress game data
  const compressedData = uint8.slice(
    header.gameDataOffset,
    header.gameDataOffset + header.gameDataSize
  );

  const decompressed = pako.inflate(compressedData);
  const bundle = JSON.parse(new TextDecoder().decode(decompressed));

  // Extract main save data
  const gameData = bundle.mainSave || bundle;

  return {
    name: header.name,
    cityCode: header.cityCode,
    timestamp: header.timestamp,
    gameSessionId: header.gameSessionId,
    stats: header.stats,
    data: gameData.data || gameData,
    _headerBuffer: uint8.slice(0, HEADER_SIZE),
    _autosaveIndex: autosaveIndex,
  };
}

/**
 * Serialize MetroSaveData to ArrayBuffer (.metro format)
 */
export function serializeMetroSave(saveData: MetroSaveData): ArrayBuffer {
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
  const compressed = pako.gzip(new TextEncoder().encode(bundleJson));

  // Prepare autosave index
  const autosaveIndexJson = JSON.stringify(saveData._autosaveIndex || []);
  const autosaveIndexBuffer = new TextEncoder().encode(autosaveIndexJson);

  // Calculate offsets
  const autosaveIndexOffset = HEADER_SIZE;
  const autosaveIndexSize = autosaveIndexBuffer.length;
  const gameDataOffset = autosaveIndexOffset + autosaveIndexSize;
  const gameDataSize = compressed.length;

  // Create header
  const header = saveData._headerBuffer
    ? new Uint8Array(saveData._headerBuffer)
    : new Uint8Array(HEADER_SIZE);

  const headerView = new DataView(header.buffer, header.byteOffset, header.byteLength);

  // Write magic
  const encoder = new TextEncoder();
  const magicBytes = encoder.encode(MAGIC);
  header.set(magicBytes, 0);

  // Write offsets
  headerView.setUint32(8, autosaveIndexOffset, true);
  headerView.setUint32(12, autosaveIndexSize, true);
  headerView.setUint32(24, gameDataOffset, true);
  headerView.setUint32(28, gameDataSize, true);

  // Write timestamp
  const timestamp = saveData.timestamp;
  headerView.setUint32(32, timestamp & 0xffffffff, true);
  headerView.setInt32(36, Math.floor(timestamp / 0x100000000), true);

  // Write strings
  writeString(header, 40, saveData.name, 256);
  writeString(header, 296, saveData.cityCode, 32);
  writeString(header, 328, saveData.gameSessionId, 64);
  writeString(header, 392, JSON.stringify(saveData.stats), 512);

  // Calculate and write checksum
  const checksum = calculateChecksum(compressed);
  headerView.setUint32(912, checksum, true);

  // Combine all parts
  const totalSize = HEADER_SIZE + autosaveIndexSize + gameDataSize;
  const result = new Uint8Array(totalSize);
  result.set(header, 0);
  result.set(autosaveIndexBuffer, autosaveIndexOffset);
  result.set(compressed, gameDataOffset);

  return result.buffer;
}

/**
 * Parse JSON save file
 */
export function parseJsonSave(json: string): MetroSaveData {
  const data = JSON.parse(json);
  return {
    name: data.name || 'Unknown',
    cityCode: data.cityCode || 'unknown',
    timestamp: data.timestamp || Date.now(),
    gameSessionId: data.gameSessionId || crypto.randomUUID(),
    stats: data.stats || { stations: 0, routes: 0, trains: 0, money: 0 },
    data: data.data || data,
  };
}

/**
 * Serialize to JSON string
 */
export function serializeJsonSave(saveData: MetroSaveData): string {
  return JSON.stringify({
    name: saveData.name,
    cityCode: saveData.cityCode,
    timestamp: saveData.timestamp,
    gameSessionId: saveData.gameSessionId,
    stats: saveData.stats,
    data: saveData.data,
  }, null, 2);
}

/**
 * Check if buffer is .metro format
 */
export function isMetroFormat(buffer: ArrayBuffer): boolean {
  if (buffer.byteLength < 4) return false;
  const magic = new TextDecoder().decode(new Uint8Array(buffer, 0, 4));
  return magic === MAGIC;
}
