#!/usr/bin/env -S npx tsx
/**
 * metro-export — convert a Subway Builder save into GIS / spreadsheet formats.
 *
 * Usage:
 *   tsx export.ts <save.metro|save.json> <format> [output]
 *   bun export.ts  <save.metro|save.json> <format> [output]
 *
 * Formats: geojson | kml | kmz | csv-stations | csv-routes | csv-tracks
 *
 * If [output] is omitted, the file is written next to the save with the
 * appropriate extension (e.g. my-city.geojson).
 */

import fs from 'fs/promises';
import path from 'path';

import { readMetroSave, isMetroFile, type MetroSaveData } from './metro-loader.ts';
import { exportSave, type ExportFormat } from './core/src/exporters.ts';

const EXT: Record<ExportFormat, string> = {
  geojson: 'geojson',
  kml: 'kml',
  kmz: 'kmz',
  'csv-stations': 'stations.csv',
  'csv-routes': 'routes.csv',
  'csv-tracks': 'tracks.csv',
};

async function loadSave(file: string): Promise<MetroSaveData> {
  if (await isMetroFile(file)) return readMetroSave(file);
  // Plain JSON save
  const raw = JSON.parse(await fs.readFile(file, 'utf8'));
  return {
    name: raw.name || path.basename(file),
    cityCode: raw.cityCode || '',
    timestamp: raw.timestamp || 0,
    gameSessionId: raw.gameSessionId || '',
    stats: raw.stats || { stations: 0, routes: 0, trains: 0, money: 0, elapsedSeconds: 0 },
    data: raw.data || raw,
  };
}

async function main() {
  const [file, format, output] = process.argv.slice(2);
  if (!file || !format) {
    console.error('Usage: export.ts <save.metro|save.json> <geojson|kml|kmz|csv-stations|csv-routes|csv-tracks> [output]');
    process.exit(1);
  }
  if (!(format in EXT)) {
    console.error(`Unknown format "${format}". Valid: ${Object.keys(EXT).join(', ')}`);
    process.exit(1);
  }

  const save = await loadSave(file);
  const result = exportSave(save, format as ExportFormat);

  const outPath = output || file.replace(/\.(metro|json)$/i, '') + '.' + EXT[format as ExportFormat];
  if (typeof result === 'string') {
    await fs.writeFile(outPath, result, 'utf8');
  } else {
    await fs.writeFile(outPath, result);
  }

  const stations = save.data?.stations?.length ?? 0;
  const routes = save.data?.routes?.length ?? 0;
  console.log(`Exported ${stations} stations, ${routes} routes → ${outPath}`);
}

main().catch((err) => {
  console.error('Export failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
