/**
 * Route Completeness Check - verifies routes have full geometry data
 */

import type { SaveGameData, Route } from '../types.js';

export interface RouteCompletenessInfo {
  id: string;
  name: string;
  bullet: string;
  variantName: string;
  stNodeCount: number;
  validStNodeCount: number;
  stNodesWithCoords: number;
  stComboCount: number;
  stCombosWithPath: number;
  totalPathLength: number;
  stCombosWithValidTracks: number;
  isComplete: boolean;
}

export interface RouteCompletenessResult {
  routes: RouteCompletenessInfo[];
  completeCount: number;
  incompleteCount: number;
  totalRoutes: number;
}

export function checkRouteCompleteness(data: SaveGameData): RouteCompletenessResult {
  const routes = data.routes || [];
  const globalStNodes = data.stNodes || [];
  const tracks = data.tracks || [];

  // Create lookup sets for fast validation
  const globalStNodeIds = new Set(globalStNodes.map(n => n.id));
  const trackIds = new Set(tracks.map(t => t.id));

  const routeInfos: RouteCompletenessInfo[] = routes.map(route => {
    const stNodes = route.stNodes || [];
    const stCombos = route.stCombos || [];

    // Count valid stNodes
    let validStNodeCount = 0;
    let stNodesWithCoords = 0;
    for (const stn of stNodes) {
      if (typeof stn === 'object' && stn.id) {
        if (globalStNodeIds.has(stn.id)) {
          validStNodeCount++;
        }
        if (stn.center) {
          stNodesWithCoords++;
        }
      }
    }

    // Count stCombos with paths
    let stCombosWithPath = 0;
    let totalPathLength = 0;
    let stCombosWithValidTracks = 0;

    for (const combo of stCombos) {
      if (combo.path && combo.path.length > 0) {
        stCombosWithPath++;
        totalPathLength += combo.path.length;

        // Check if all tracks in path are valid
        const allValid = combo.path.every(item => {
          const tid = typeof item === 'object' ? item.trackId : item;
          return trackIds.has(tid);
        });
        if (allValid) {
          stCombosWithValidTracks++;
        }
      }
    }

    const isComplete =
      validStNodeCount === stNodes.length &&
      stCombosWithPath === stCombos.length &&
      stCombosWithValidTracks === stCombos.length;

    return {
      id: route.id,
      name: route.name || '(unnamed)',
      bullet: (route as any).bullet || '',
      variantName: (route as any).variantName || '',
      stNodeCount: stNodes.length,
      validStNodeCount,
      stNodesWithCoords,
      stComboCount: stCombos.length,
      stCombosWithPath,
      totalPathLength,
      stCombosWithValidTracks,
      isComplete,
    };
  });

  const completeCount = routeInfos.filter(r => r.isComplete).length;

  return {
    routes: routeInfos,
    completeCount,
    incompleteCount: routeInfos.length - completeCount,
    totalRoutes: routeInfos.length,
  };
}
