/**
 * Track Coverage Analysis - checks network coverage by routes
 */

import type { SaveGameData } from '../types.js';

export interface Bounds {
  minLng: number;
  maxLng: number;
  minLat: number;
  maxLat: number;
}

export interface TrackCoverageResult {
  totalTracks: number;
  totalStations: number;
  totalRoutes: number;
  tracksInRoutes: number;
  tracksNotInRoutes: number;
  trackCoveragePercent: number;
  stationsWithRoutes: number;
  stationsWithoutRoutes: number;
  stationCoveragePercent: number;
  stNodesInRoutes: number;
  globalStNodes: number;
  geographic: {
    allTrackBounds: Bounds;
    routeBounds: Bounds;
    lngCoveragePercent: number;
    latCoveragePercent: number;
  };
}

export function analyzeTrackCoverage(data: SaveGameData): TrackCoverageResult {
  const routes = data.routes || [];
  const tracks = data.tracks || [];
  const stations = data.stations || [];

  // Collect all track IDs used by routes
  const tracksInRoutes = new Set<string>();
  for (const route of routes) {
    for (const combo of route.stCombos || []) {
      for (const pathItem of combo.path || []) {
        tracksInRoutes.add(pathItem.trackId);
      }
    }
  }

  // Check stations
  const stationsInRoutes = new Set<string>();
  for (const station of stations) {
    if (station.routeIds && station.routeIds.length > 0) {
      stationsInRoutes.add(station.id);
    }
  }

  // Count stNodes in routes
  const stNodesInRoutes = new Set<string>();
  for (const route of routes) {
    for (const stn of route.stNodes || []) {
      if (typeof stn === 'object' && stn.id) {
        stNodesInRoutes.add(stn.id);
      }
    }
  }

  // Geographic bounds
  const allTrackBounds: Bounds = {
    minLng: Infinity,
    maxLng: -Infinity,
    minLat: Infinity,
    maxLat: -Infinity,
  };
  const routeBounds: Bounds = {
    minLng: Infinity,
    maxLng: -Infinity,
    minLat: Infinity,
    maxLat: -Infinity,
  };

  // Track ID to track map for fast lookup
  const trackMap = new Map(tracks.map(t => [t.id, t]));

  // Get bounds of all tracks
  for (const track of tracks) {
    for (const coord of track.coords || []) {
      allTrackBounds.minLng = Math.min(allTrackBounds.minLng, coord[0]);
      allTrackBounds.maxLng = Math.max(allTrackBounds.maxLng, coord[0]);
      allTrackBounds.minLat = Math.min(allTrackBounds.minLat, coord[1]);
      allTrackBounds.maxLat = Math.max(allTrackBounds.maxLat, coord[1]);
    }
  }

  // Get bounds of tracks IN routes
  for (const route of routes) {
    for (const combo of route.stCombos || []) {
      for (const pathItem of combo.path || []) {
        const track = trackMap.get(pathItem.trackId);
        if (track) {
          for (const coord of track.coords || []) {
            routeBounds.minLng = Math.min(routeBounds.minLng, coord[0]);
            routeBounds.maxLng = Math.max(routeBounds.maxLng, coord[0]);
            routeBounds.minLat = Math.min(routeBounds.minLat, coord[1]);
            routeBounds.maxLat = Math.max(routeBounds.maxLat, coord[1]);
          }
        }
      }
    }
  }

  // Calculate coverage percentages
  const allLngSpan = allTrackBounds.maxLng - allTrackBounds.minLng;
  const allLatSpan = allTrackBounds.maxLat - allTrackBounds.minLat;
  const routeLngSpan = routeBounds.maxLng - routeBounds.minLng;
  const routeLatSpan = routeBounds.maxLat - routeBounds.minLat;

  const lngCoveragePercent = allLngSpan > 0 ? Math.round((routeLngSpan / allLngSpan) * 100) : 0;
  const latCoveragePercent = allLatSpan > 0 ? Math.round((routeLatSpan / allLatSpan) * 100) : 0;

  return {
    totalTracks: tracks.length,
    totalStations: stations.length,
    totalRoutes: routes.length,
    tracksInRoutes: tracksInRoutes.size,
    tracksNotInRoutes: tracks.length - tracksInRoutes.size,
    trackCoveragePercent: tracks.length > 0 ? Math.round((tracksInRoutes.size / tracks.length) * 100) : 0,
    stationsWithRoutes: stationsInRoutes.size,
    stationsWithoutRoutes: stations.length - stationsInRoutes.size,
    stationCoveragePercent: stations.length > 0 ? Math.round((stationsInRoutes.size / stations.length) * 100) : 0,
    stNodesInRoutes: stNodesInRoutes.size,
    globalStNodes: data.stNodes?.length || 0,
    geographic: {
      allTrackBounds,
      routeBounds,
      lngCoveragePercent,
      latCoveragePercent,
    },
  };
}
