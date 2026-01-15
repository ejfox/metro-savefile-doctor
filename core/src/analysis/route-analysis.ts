/**
 * Route Analysis - analyzes route structure and train assignments
 */

import type { SaveGameData, Route, Train } from '../types.js';

export interface RouteInfo {
  id: string;
  name: string;
  color: string;
  stopCount: number;
  active: boolean;
  visible: boolean;
  hasPath: boolean;
  pathLength: number;
  runningDirection: string;
  isVariant: boolean;
  parentRouteId: string | null;
  trainCount: number;
  validStops: number;
}

export interface TrainsByRoute {
  routeId: string;
  routeName: string;
  count: number;
}

export interface RouteAnalysisResult {
  totalRoutes: number;
  totalTrains: number;
  routes: RouteInfo[];
  trainsByRoute: TrainsByRoute[];
  issues: {
    routesWithNoPath: string[];
    inactiveRoutes: string[];
    hiddenRoutes: string[];
    emptyRoutes: string[];
  };
}

export function analyzeRoutes(data: SaveGameData): RouteAnalysisResult {
  const routes: Route[] = data.routes || [];
  const trains: Train[] = data.trains || [];
  const stations = data.stations || [];

  // Build train count by route
  const trainCountByRoute = new Map<string, number>();
  for (const train of trains) {
    const routeId = train.routeId || 'no-route';
    trainCountByRoute.set(routeId, (trainCountByRoute.get(routeId) || 0) + 1);
  }

  // Analyze each route
  const routeInfos: RouteInfo[] = routes.map(route => {
    const stopIds = route.stopIds || [];
    const validStops = stopIds.filter(sid => stations.some(s => s.id === sid)).length;

    return {
      id: route.id,
      name: route.name || '(unnamed)',
      color: route.color,
      stopCount: stopIds.length,
      active: route.active,
      visible: route.visible,
      hasPath: Boolean(route.stCombos?.some(c => c.path && c.path.length > 0)),
      pathLength: route.stCombos?.reduce((sum, c) => sum + (c.path?.length || 0), 0) || 0,
      runningDirection: (route as any).runningDirection || 'default',
      isVariant: route.isVariant || false,
      parentRouteId: route.parentRouteId || null,
      trainCount: trainCountByRoute.get(route.id) || 0,
      validStops,
    };
  });

  // Build trains by route list
  const trainsByRoute: TrainsByRoute[] = [];
  const seenRoutes = new Set<string>();

  for (const [routeId, count] of trainCountByRoute) {
    seenRoutes.add(routeId);
    const route = routes.find(r => r.id === routeId);
    // Try multiple ways to get a display name
    let routeName = '(unknown)';
    if (routeId === 'no-route') {
      routeName = '(no route)';
    } else if (route) {
      routeName = route.name || route.bullet || route.color || routeId.slice(0, 8);
    } else {
      // Route not found - show partial ID
      routeName = `Route ${routeId.slice(0, 6)}...`;
    }
    trainsByRoute.push({
      routeId,
      routeName,
      count,
    });
  }

  // Sort by count descending
  trainsByRoute.sort((a, b) => b.count - a.count);

  // Identify issues
  const routesWithNoPath = routes
    .filter(r => !r.stCombos?.some(c => c.path && c.path.length > 0))
    .map(r => r.name || r.id?.slice(0, 8) || 'unknown');

  const inactiveRoutes = routes
    .filter(r => r.active === false)
    .map(r => r.name || r.id?.slice(0, 8) || 'unknown');

  const hiddenRoutes = routes
    .filter(r => r.visible === false)
    .map(r => r.name || r.id?.slice(0, 8) || 'unknown');

  const emptyRoutes = routes
    .filter(r => !r.stopIds || r.stopIds.length === 0)
    .map(r => r.name || r.id?.slice(0, 8) || 'unknown');

  return {
    totalRoutes: routes.length,
    totalTrains: trains.length,
    routes: routeInfos,
    trainsByRoute,
    issues: {
      routesWithNoPath,
      inactiveRoutes,
      hiddenRoutes,
      emptyRoutes,
    },
  };
}
