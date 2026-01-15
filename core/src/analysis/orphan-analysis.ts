/**
 * Orphan Analysis - identifies orphaned tracks and stations
 */

import type { SaveGameData } from '../types.js';

export interface OrphanedTrackStats {
  byBuildType: Record<string, number>;
  byDisplayType: Record<string, number>;
}

export interface OrphanAnalysisResult {
  orphanedTrackCount: number;
  orphanedTrackStats: OrphanedTrackStats;
  orphanedStationCount: number;
  orphanedStationsWithStNodes: number;
  orphanedStationsWithTracks: number;
  sampleOrphanedStations: Array<{ name: string; stNodeCount: number }>;
  trackGroupStats: {
    totalGroups: number;
    groupsWithOrphans: number;
    fullyOrphanedGroups: number;
  };
}

export function analyzeOrphans(data: SaveGameData): OrphanAnalysisResult {
  const routes = data.routes || [];
  const tracks = data.tracks || [];
  const stations = data.stations || [];
  const trackGroups = data.trackGroups || [];

  // Build set of tracks in routes
  const tracksInRoutes = new Set<string>();
  for (const route of routes) {
    for (const combo of route.stCombos || []) {
      for (const pathItem of combo.path || []) {
        tracksInRoutes.add(pathItem.trackId);
      }
    }
  }

  // Get orphaned tracks
  const orphanedTracks = tracks.filter(t => !tracksInRoutes.has(t.id));

  // Analyze by build type
  const byBuildType: Record<string, number> = {};
  for (const track of orphanedTracks) {
    const bt = track.buildType || 'unknown';
    byBuildType[bt] = (byBuildType[bt] || 0) + 1;
  }

  // Analyze by display type
  const byDisplayType: Record<string, number> = {};
  for (const track of orphanedTracks) {
    const dt = track.displayType || 'unknown';
    byDisplayType[dt] = (byDisplayType[dt] || 0) + 1;
  }

  // Orphaned stations
  const stationsWithRoutes = new Set<string>();
  for (const station of stations) {
    if (station.routeIds && station.routeIds.length > 0) {
      stationsWithRoutes.add(station.id);
    }
  }

  const orphanedStations = stations.filter(s => !stationsWithRoutes.has(s.id));

  let orphanedWithStNodes = 0;
  let orphanedWithTracks = 0;
  for (const station of orphanedStations) {
    if (station.stNodeIds && station.stNodeIds.length > 0) {
      orphanedWithStNodes++;
    }
    if (station.trackIds && station.trackIds.length > 0) {
      orphanedWithTracks++;
    }
  }

  // Sample orphaned stations
  const sampleOrphanedStations = orphanedStations.slice(0, 10).map(s => ({
    name: s.name || '(unnamed)',
    stNodeCount: s.stNodeIds?.length || 0,
  }));

  // Track group analysis
  let groupsWithOrphans = 0;
  let fullyOrphanedGroups = 0;
  for (const tg of trackGroups) {
    const trackIds = tg.trackIds || [];
    const orphanCount = trackIds.filter(tid => !tracksInRoutes.has(tid)).length;
    if (orphanCount > 0) {
      groupsWithOrphans++;
      if (orphanCount === trackIds.length) {
        fullyOrphanedGroups++;
      }
    }
  }

  return {
    orphanedTrackCount: orphanedTracks.length,
    orphanedTrackStats: {
      byBuildType,
      byDisplayType,
    },
    orphanedStationCount: orphanedStations.length,
    orphanedStationsWithStNodes: orphanedWithStNodes,
    orphanedStationsWithTracks: orphanedWithTracks,
    sampleOrphanedStations,
    trackGroupStats: {
      totalGroups: trackGroups.length,
      groupsWithOrphans,
      fullyOrphanedGroups,
    },
  };
}
