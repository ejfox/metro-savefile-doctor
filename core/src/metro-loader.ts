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

  let stats: SaveStats = { stations: 0, routes: 0, trains: 0, money: 0, elapsedSeconds: 0 };
  try {
    stats = { elapsedSeconds: 0, ...JSON.parse(statsJson) };
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
 * Recompute header stats from game data.
 * Mirrors the game's MetroFormat.extractStats so the home menu (which reads
 * stats straight from the header without decompressing) shows edited values.
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

  // Read autosave index (lightweight metadata region — preserved verbatim on write)
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

  // Preserve the thumbnail bytes so they survive a round-trip
  let thumbnail = new Uint8Array(0);
  if (header.thumbnailSize > 0) {
    thumbnail = uint8.slice(header.thumbnailOffset, header.thumbnailOffset + header.thumbnailSize);
  }

  // Read and decompress game data
  const compressedData = uint8.slice(
    header.gameDataOffset,
    header.gameDataOffset + header.gameDataSize
  );

  const decompressed = pako.inflate(compressedData);
  const bundle = JSON.parse(new TextDecoder().decode(decompressed));

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
    _headerBuffer: uint8.slice(0, HEADER_SIZE),
    _autosaveIndex: autosaveIndex,
    _thumbnail: thumbnail,
  };
}

/**
 * Serialize MetroSaveData to ArrayBuffer (.metro format)
 *
 * LOSSLESS: preserves the full bundle (autosaves, timelapse, viewport, version)
 * and the thumbnail, mutating only edited fields.
 */
export function serializeMetroSave(saveData: MetroSaveData): ArrayBuffer {
  // Recompute stats so the header matches the (possibly edited) game data
  const stats = computeStats(saveData.data);

  // Reuse the full preserved bundle, mutating only what we edited
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
    // v1 flat save
    bundle = saveData._bundle;
    if (bundle.data) {
      bundle.data = saveData.data;
    } else {
      bundle = saveData.data;
    }
  } else {
    // Last-resort fallback (constructed without reading)
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
  const compressed = pako.gzip(new TextEncoder().encode(bundleJson));

  // Autosave index region (preserved verbatim)
  const autosaveIndex = saveData._autosaveIndex || [];
  const autosaveIndexBuffer = new TextEncoder().encode(JSON.stringify(autosaveIndex));

  // Thumbnail (preserved verbatim)
  const thumbnail =
    saveData._thumbnail && saveData._thumbnail.length > 0 ? saveData._thumbnail : new Uint8Array(0);

  // Calculate offsets: [header][index][thumbnail][gameData]
  const autosaveIndexOffset = HEADER_SIZE;
  const autosaveIndexSize = autosaveIndexBuffer.length;
  const thumbnailOffset = autosaveIndexOffset + autosaveIndexSize;
  const thumbnailSize = thumbnail.length;
  const gameDataOffset = thumbnailOffset + thumbnailSize;
  const gameDataSize = compressed.length;

  // Reuse existing header (keeps tutorial flag, max-autosaves, reserved bytes) or make a fresh one
  const header = saveData._headerBuffer
    ? new Uint8Array(saveData._headerBuffer)
    : new Uint8Array(HEADER_SIZE);
  const isFreshHeader = !saveData._headerBuffer;

  const headerView = new DataView(header.buffer, header.byteOffset, header.byteLength);

  // Magic
  header.set(new TextEncoder().encode(MAGIC), 0);

  // Offsets
  headerView.setUint32(8, autosaveIndexOffset, true);
  headerView.setUint32(12, autosaveIndexSize, true);
  headerView.setUint32(16, thumbnailOffset, true);
  headerView.setUint32(20, thumbnailSize, true);
  headerView.setUint32(24, gameDataOffset, true);
  headerView.setUint32(28, gameDataSize, true);

  // Timestamp
  const timestamp = saveData.timestamp;
  headerView.setUint32(32, timestamp & 0xffffffff, true);
  headerView.setInt32(36, Math.floor(timestamp / 0x100000000), true);

  // Strings
  writeString(header, 40, saveData.name, 256);
  writeString(header, 296, saveData.cityCode, 32);
  writeString(header, 328, saveData.gameSessionId, 64);
  writeString(header, 392, JSON.stringify(stats), 512);

  // Autosave count + max autosaves (only default max on a brand-new header)
  headerView.setUint32(904, autosaveIndex.length, true);
  if (isFreshHeader) {
    headerView.setUint32(908, 10, true);
  }

  // Checksum of compressed data
  headerView.setUint32(912, calculateChecksum(compressed), true);

  // Combine all parts
  const totalSize = HEADER_SIZE + autosaveIndexSize + thumbnailSize + gameDataSize;
  const result = new Uint8Array(totalSize);
  result.set(header, 0);
  result.set(autosaveIndexBuffer, autosaveIndexOffset);
  if (thumbnailSize > 0) {
    result.set(thumbnail, thumbnailOffset);
  }
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
    stats: data.stats || { stations: 0, routes: 0, trains: 0, money: 0, elapsedSeconds: 0 },
    data: data.data || data,
    _bundle: data,
    _isBundle: !!data.mainSave,
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
