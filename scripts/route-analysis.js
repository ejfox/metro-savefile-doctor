// Route Analysis Script for Savefile Doctor
// Analyzes route structure and train assignments

log('=== ROUTE ANALYSIS ===');
log('Total routes: ' + (save.data.routes?.length || 0));
log('');

const routes = save.data.routes || [];
const trains = save.data.trains || [];

for (const route of routes) {
    log('---');
    log('Route ID: ' + (route.id?.slice(0, 8) || 'none') + '...');
    log('  Name: ' + (route.name || '(unnamed)'));
    log('  Color: ' + route.color);
    log('  Stops: ' + (route.stopIds?.length || 0));
    log('  Active: ' + route.active);
    log('  Visible: ' + route.visible);
    log('  Has path: ' + (route.path ? 'yes' : 'no'));
    log('  Path length: ' + (route.path?.length || 0));
    log('  Running direction: ' + (route.runningDirection || 'default'));
    log('  Is variant: ' + (route.isVariant || false));
    log('  Parent route: ' + (route.parentRouteId?.slice(0, 8) || 'none'));

    // Check for trains on this route
    const trainsOnRoute = trains.filter(t => t.routeId === route.id);
    log('  Trains on route: ' + trainsOnRoute.length);

    // Check if route has valid geometry
    if (route.stopIds && route.stopIds.length > 0) {
        const stations = save.data.stations || [];
        const validStops = route.stopIds.filter(sid => stations.some(s => s.id === sid));
        log('  Valid stops: ' + validStops.length + '/' + route.stopIds.length);
    }
}

log('');
log('=== TRAIN ANALYSIS ===');
log('Total trains: ' + trains.length);

// Group trains by route
const trainsByRoute = {};
for (const train of trains) {
    const routeId = train.routeId || 'no-route';
    if (!trainsByRoute[routeId]) {
        trainsByRoute[routeId] = [];
    }
    trainsByRoute[routeId].push(train);
}

log('');
log('Trains by route:');
for (const routeId of Object.keys(trainsByRoute)) {
    const routeTrains = trainsByRoute[routeId];
    const route = routes.find(r => r.id === routeId);
    const routeName = route?.name || (routeId === 'no-route' ? '(no route)' : '(unknown route)');
    log('  ' + routeName + ': ' + routeTrains.length);
}

log('');
log('=== POTENTIAL ISSUES ===');

// Check for routes with no path
const routesNoPath = routes.filter(r => !r.path || r.path.length === 0);
if (routesNoPath.length > 0) {
    log('Routes with no path: ' + routesNoPath.length);
    for (const r of routesNoPath) {
        log('  - ' + (r.name || r.id?.slice(0, 8)));
    }
}

// Check for inactive routes
const inactiveRoutes = routes.filter(r => r.active === false);
if (inactiveRoutes.length > 0) {
    log('Inactive routes: ' + inactiveRoutes.length);
    for (const r of inactiveRoutes) {
        log('  - ' + (r.name || r.id?.slice(0, 8)));
    }
}

// Check for hidden routes
const hiddenRoutes = routes.filter(r => r.visible === false);
if (hiddenRoutes.length > 0) {
    log('Hidden routes: ' + hiddenRoutes.length);
    for (const r of hiddenRoutes) {
        log('  - ' + (r.name || r.id?.slice(0, 8)));
    }
}

// Check for routes with 0 stops
const emptyRoutes = routes.filter(r => !r.stopIds || r.stopIds.length === 0);
if (emptyRoutes.length > 0) {
    log('Routes with 0 stops: ' + emptyRoutes.length);
    for (const r of emptyRoutes) {
        log('  - ' + (r.name || r.id?.slice(0, 8)));
    }
}
