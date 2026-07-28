/**
 * Save-file exporters — turn a Subway Builder save into portable GIS/spreadsheet formats.
 *
 * Geometry model (from the game's types.ts):
 *   - Station.coords:  [lng, lat]           → Point
 *   - Track.coords:    [lng, lat][]         → LineString
 *   - Route:           stCombos[].path[].trackId (ordered) → LineString assembled
 *                      from the referenced tracks; styled by route.color.
 *
 * Everything here is dependency-free and runs in both the browser (desktop app)
 * and Node (CLI). KMZ is emitted as a ZIP with a single STORED (uncompressed)
 * entry so we don't need a compression library.
 */

import type { MetroSaveData } from './types.js';

type LngLat = [number, number];

/** Coordinate finite-ness guard (drops NaN / null geometry). */
function isLngLat(c: any): c is LngLat {
  return Array.isArray(c) && c.length >= 2 && Number.isFinite(c[0]) && Number.isFinite(c[1]);
}

function getData(save: MetroSaveData): any {
  return save?.data ?? {};
}

/** Assemble an ordered coordinate line for a route from its track path. */
function routeLine(route: any, trackById: Map<string, any>): LngLat[] {
  const line: LngLat[] = [];
  const push = (c: LngLat) => {
    const last = line[line.length - 1];
    // Skip exact-duplicate join points between consecutive tracks
    if (!last || last[0] !== c[0] || last[1] !== c[1]) line.push([c[0], c[1]]);
  };
  for (const combo of route?.stCombos || []) {
    for (const item of combo?.path || []) {
      const track = trackById.get(item?.trackId);
      for (const c of track?.coords || []) if (isLngLat(c)) push(c);
    }
  }
  // Fallback: some routes only carry stNode centers
  if (line.length === 0) {
    for (const stn of route?.stNodes || []) {
      if (stn && typeof stn === 'object' && isLngLat(stn.center)) push(stn.center);
    }
  }
  return line;
}

// ---------------------------------------------------------------------------
// GeoJSON
// ---------------------------------------------------------------------------

export function toGeoJSON(save: MetroSaveData): any {
  const data = getData(save);
  const stations: any[] = data.stations || [];
  const tracks: any[] = data.tracks || [];
  const routes: any[] = data.routes || [];
  const trackById = new Map<string, any>(tracks.map((t) => [t.id, t]));

  const features: any[] = [];

  for (const s of stations) {
    if (!isLngLat(s?.coords)) continue;
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [s.coords[0], s.coords[1]] },
      properties: {
        kind: 'station',
        id: s.id,
        name: s.name ?? '',
        routeIds: (s.routeIds || []).join(','),
        stationType: s.stationType ?? '',
        buildType: s.buildType ?? '',
      },
    });
  }

  for (const r of routes) {
    const line = routeLine(r, trackById);
    if (line.length < 2) continue;
    features.push({
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: line },
      properties: {
        kind: 'route',
        id: r.id,
        name: r.name ?? r.bullet ?? '',
        bullet: r.bullet ?? '',
        color: r.color ?? '#888888',
        active: r.active ?? true,
        // 'stroke' + 'stroke-width' are honored by geojson.io / Mapbox simplestyle
        stroke: r.color ?? '#888888',
        'stroke-width': 3,
      },
    });
  }

  // Raw track network as a separate layer (useful for debugging orphans)
  for (const t of tracks) {
    const coords = (t?.coords || []).filter(isLngLat);
    if (coords.length < 2) continue;
    features.push({
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: coords },
      properties: { kind: 'track', id: t.id, trackType: t.trackType ?? '', length: t.length ?? null },
    });
  }

  return { type: 'FeatureCollection', features };
}

// ---------------------------------------------------------------------------
// KML / KMZ
// ---------------------------------------------------------------------------

function xmlEscape(s: any): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** #rrggbb → KML aabbggrr (fully opaque). */
function kmlColor(hex: any): string {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(String(hex || ''));
  if (!m) return 'ff888888';
  const rr = m[1].slice(0, 2);
  const gg = m[1].slice(2, 4);
  const bb = m[1].slice(4, 6);
  return `ff${bb}${gg}${rr}`.toLowerCase();
}

export function toKML(save: MetroSaveData): string {
  const data = getData(save);
  const stations: any[] = data.stations || [];
  const tracks: any[] = data.tracks || [];
  const routes: any[] = data.routes || [];
  const trackById = new Map<string, any>(tracks.map((t) => [t.id, t]));
  const docName = xmlEscape(save?.name || 'Subway Builder Save');

  const styles: string[] = [];
  const routeMarks: string[] = [];
  for (const r of routes) {
    const line = routeLine(r, trackById);
    if (line.length < 2) continue;
    const styleId = `route-${xmlEscape(r.id)}`;
    styles.push(
      `<Style id="${styleId}"><LineStyle><color>${kmlColor(r.color)}</color><width>4</width></LineStyle></Style>`
    );
    const coordStr = line.map(([lng, lat]) => `${lng},${lat},0`).join(' ');
    routeMarks.push(
      `<Placemark><name>${xmlEscape(r.name ?? r.bullet ?? r.id)}</name>` +
        `<styleUrl>#${styleId}</styleUrl>` +
        `<LineString><tessellate>1</tessellate><coordinates>${coordStr}</coordinates></LineString></Placemark>`
    );
  }

  const stationMarks: string[] = [];
  for (const s of stations) {
    if (!isLngLat(s?.coords)) continue;
    stationMarks.push(
      `<Placemark><name>${xmlEscape(s.name ?? s.id)}</name>` +
        `<description>${xmlEscape((s.routeIds || []).join(', '))}</description>` +
        `<Point><coordinates>${s.coords[0]},${s.coords[1]},0</coordinates></Point></Placemark>`
    );
  }

  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>${docName}</name>\n` +
    styles.join('\n') +
    `\n<Folder><name>Routes</name>\n` +
    routeMarks.join('\n') +
    `\n</Folder>\n<Folder><name>Stations</name>\n` +
    stationMarks.join('\n') +
    `\n</Folder></Document></kml>\n`
  );
}

// Minimal ZIP writer (single STORED entry) — enough for a valid .kmz.
function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc ^= bytes[i];
    for (let j = 0; j < 8; j++) crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function zipStore(entryName: string, contents: Uint8Array): Uint8Array {
  const name = new TextEncoder().encode(entryName);
  const crc = crc32(contents);
  const size = contents.length;

  // Local file header (30 bytes + name)
  const local = new Uint8Array(30 + name.length);
  const lv = new DataView(local.buffer);
  lv.setUint32(0, 0x04034b50, true); // signature
  lv.setUint16(4, 20, true); // version needed
  lv.setUint16(6, 0, true); // flags
  lv.setUint16(8, 0, true); // method: 0 = store
  lv.setUint16(10, 0, true); // mod time
  lv.setUint16(12, 0x21, true); // mod date (1980-01-01)
  lv.setUint32(14, crc, true);
  lv.setUint32(18, size, true); // compressed size
  lv.setUint32(22, size, true); // uncompressed size
  lv.setUint16(26, name.length, true);
  lv.setUint16(28, 0, true); // extra length
  local.set(name, 30);

  // Central directory header (46 bytes + name)
  const central = new Uint8Array(46 + name.length);
  const cv = new DataView(central.buffer);
  cv.setUint32(0, 0x02014b50, true);
  cv.setUint16(4, 20, true); // version made by
  cv.setUint16(6, 20, true); // version needed
  cv.setUint16(8, 0, true);
  cv.setUint16(10, 0, true);
  cv.setUint16(12, 0, true);
  cv.setUint16(14, 0x21, true);
  cv.setUint32(16, crc, true);
  cv.setUint32(20, size, true);
  cv.setUint32(24, size, true);
  cv.setUint16(28, name.length, true);
  cv.setUint16(30, 0, true); // extra
  cv.setUint16(32, 0, true); // comment
  cv.setUint16(34, 0, true); // disk
  cv.setUint16(36, 0, true); // internal attrs
  cv.setUint32(38, 0, true); // external attrs
  cv.setUint32(42, 0, true); // local header offset
  central.set(name, 46);

  const localBlock = local.length + size;
  // End of central directory (22 bytes)
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, 1, true); // entries on disk
  ev.setUint16(10, 1, true); // total entries
  ev.setUint32(12, central.length, true); // central dir size
  ev.setUint32(16, localBlock, true); // central dir offset
  ev.setUint16(20, 0, true); // comment length

  const out = new Uint8Array(localBlock + central.length + end.length);
  let o = 0;
  out.set(local, o); o += local.length;
  out.set(contents, o); o += contents.length;
  out.set(central, o); o += central.length;
  out.set(end, o);
  return out;
}

export function toKMZ(save: MetroSaveData): Uint8Array {
  const kml = new TextEncoder().encode(toKML(save));
  return zipStore('doc.kml', kml);
}

// ---------------------------------------------------------------------------
// CSV
// ---------------------------------------------------------------------------

function csvCell(v: any): string {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCSV(headers: string[], rows: any[][]): string {
  return [headers, ...rows].map((r) => r.map(csvCell).join(',')).join('\n') + '\n';
}

export function stationsToCSV(save: MetroSaveData): string {
  const stations: any[] = getData(save).stations || [];
  return toCSV(
    ['id', 'name', 'lng', 'lat', 'routeIds', 'stationType', 'buildType'],
    stations.map((s) => [
      s.id,
      s.name ?? '',
      isLngLat(s?.coords) ? s.coords[0] : '',
      isLngLat(s?.coords) ? s.coords[1] : '',
      (s.routeIds || []).join(' '),
      s.stationType ?? '',
      s.buildType ?? '',
    ])
  );
}

export function routesToCSV(save: MetroSaveData): string {
  const data = getData(save);
  const routes: any[] = data.routes || [];
  const stations: any[] = data.stations || [];
  return toCSV(
    ['id', 'name', 'bullet', 'color', 'active', 'stations', 'trackSegments'],
    routes.map((r) => {
      const numStations = stations.filter((s) => (s.routeIds || []).includes(r.id)).length;
      const numSegments = (r.stCombos || []).reduce(
        (n: number, c: any) => n + (c?.path?.length || 0),
        0
      );
      return [r.id, r.name ?? '', r.bullet ?? '', r.color ?? '', r.active ?? '', numStations, numSegments];
    })
  );
}

export function tracksToCSV(save: MetroSaveData): string {
  const tracks: any[] = getData(save).tracks || [];
  return toCSV(
    ['id', 'trackType', 'length', 'points'],
    tracks.map((t) => [t.id, t.trackType ?? '', t.length ?? '', (t.coords || []).length])
  );
}

export type ExportFormat = 'geojson' | 'kml' | 'kmz' | 'csv-stations' | 'csv-routes' | 'csv-tracks';

/**
 * One-shot export dispatcher. Returns a string for text formats and a
 * Uint8Array for binary (kmz). Handy for CLI/desktop menus.
 */
export function exportSave(save: MetroSaveData, format: ExportFormat): string | Uint8Array {
  switch (format) {
    case 'geojson':
      return JSON.stringify(toGeoJSON(save), null, 2);
    case 'kml':
      return toKML(save);
    case 'kmz':
      return toKMZ(save);
    case 'csv-stations':
      return stationsToCSV(save);
    case 'csv-routes':
      return routesToCSV(save);
    case 'csv-tracks':
      return tracksToCSV(save);
    default:
      throw new Error(`Unknown export format: ${format}`);
  }
}
