/**
 * Exporter tests — verify GeoJSON / KML / KMZ / CSV output from a save with
 * real geometry (stations with coords, tracks with coord lines, a route that
 * references those tracks).
 *
 * Run: bun test
 */

import { test, expect } from 'bun:test';
import {
  toGeoJSON,
  toKML,
  toKMZ,
  stationsToCSV,
  routesToCSV,
  tracksToCSV,
} from '../core/src/exporters.ts';

const save: any = {
  name: 'Test City',
  data: {
    stations: [
      { id: 's1', name: 'Union Sq', coords: [-73.99, 40.735], routeIds: ['r1'], stationType: 'standard', buildType: 'underground' },
      { id: 's2', name: 'Grand Central', coords: [-73.977, 40.752], routeIds: ['r1'] },
      { id: 's3', name: 'No Coords' }, // should be skipped for geometry
    ],
    tracks: [
      { id: 't1', trackType: 'heavy-metro', length: 1500, coords: [[-73.99, 40.735], [-73.984, 40.744]] },
      { id: 't2', trackType: 'heavy-metro', length: 1200, coords: [[-73.984, 40.744], [-73.977, 40.752]] },
    ],
    routes: [
      { id: 'r1', name: '6 Train', bullet: '6', color: '#00933C', active: true, stCombos: [{ path: [{ trackId: 't1' }, { trackId: 't2' }] }] },
    ],
  },
};

test('GeoJSON: valid FeatureCollection with stations, route, tracks', () => {
  const gj = toGeoJSON(save);
  expect(gj.type).toBe('FeatureCollection');

  const stations = gj.features.filter((f: any) => f.properties.kind === 'station');
  const routes = gj.features.filter((f: any) => f.properties.kind === 'route');
  const tracks = gj.features.filter((f: any) => f.properties.kind === 'track');

  expect(stations.length).toBe(2); // s3 has no coords → skipped
  expect(routes.length).toBe(1);
  expect(tracks.length).toBe(2);

  // Route line assembled from t1 + t2 with the shared join point deduped
  expect(routes[0].geometry.type).toBe('LineString');
  expect(routes[0].geometry.coordinates).toEqual([
    [-73.99, 40.735],
    [-73.984, 40.744],
    [-73.977, 40.752],
  ]);
  expect(routes[0].properties.stroke).toBe('#00933C');

  // Serializes to valid JSON
  expect(() => JSON.parse(JSON.stringify(gj))).not.toThrow();
});

test('KML: well-formed with styled route and station placemarks', () => {
  const kml = toKML(save);
  expect(kml).toContain('<kml xmlns="http://www.opengis.net/kml/2.2">');
  expect(kml).toContain('<name>Test City</name>');
  expect(kml).toContain('<name>6 Train</name>');
  expect(kml).toContain('<name>Union Sq</name>');
  // #00933C → aabbggrr = ff3c9300
  expect(kml).toContain('<color>ff3c9300</color>');
  // Balanced-ish: one Document open/close
  expect(kml.match(/<Placemark>/g)?.length).toBe(3); // 1 route + 2 stations
});

test('KMZ: valid ZIP (PK header, EOCD) wrapping doc.kml', () => {
  const kmz = toKMZ(save);
  expect(kmz[0]).toBe(0x50); // 'P'
  expect(kmz[1]).toBe(0x4b); // 'K'
  // End-of-central-directory signature present near the tail
  const tail = kmz.subarray(kmz.length - 22);
  const dv = new DataView(tail.buffer, tail.byteOffset, tail.byteLength);
  expect(dv.getUint32(0, true)).toBe(0x06054b50);
  // Contains the entry name
  expect(new TextDecoder().decode(kmz)).toContain('doc.kml');
});

test('CSV exports have headers and rows', () => {
  const s = stationsToCSV(save).trim().split('\n');
  expect(s[0]).toBe('id,name,lng,lat,routeIds,stationType,buildType');
  expect(s.length).toBe(4); // header + 3 stations
  expect(s[1]).toContain('Union Sq');

  const r = routesToCSV(save).trim().split('\n');
  expect(r[0]).toBe('id,name,bullet,color,active,stations,trackSegments');
  expect(r[1]).toContain('6 Train');
  expect(r[1].endsWith(',2,2')).toBe(true); // 2 stations, 2 track segments

  const t = tracksToCSV(save).trim().split('\n');
  expect(t[0]).toBe('id,trackType,length,points');
  expect(t.length).toBe(3);
});
