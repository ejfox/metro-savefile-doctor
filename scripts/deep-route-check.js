// Deep Route Check - look for route data stored in different locations

log('=== DEEP ROUTE CHECK ===');
log('');

const routes = save.data.routes || [];

// Check all fields on the first route
if (routes.length > 0) {
    log('Fields on first route:');
    const firstRoute = routes[0];
    for (const key of Object.keys(firstRoute)) {
        const val = firstRoute[key];
        const valStr = Array.isArray(val)
            ? '[Array(' + val.length + ')]'
            : typeof val === 'object' && val !== null
                ? '{Object}'
                : String(val);
        log('  ' + key + ': ' + valStr);
    }
}

log('');
log('=== CHECKING FOR ALTERNATIVE ROUTE STORAGE ===');

// Check if routes have stationIds instead of stopIds
for (const route of routes) {
    if (route.stationIds && route.stationIds.length > 0) {
        log('Found stationIds on route ' + route.id?.slice(0, 8) + ': ' + route.stationIds.length);
    }
    if (route.stations && route.stations.length > 0) {
        log('Found stations on route ' + route.id?.slice(0, 8) + ': ' + route.stations.length);
    }
    if (route.stops && route.stops.length > 0) {
        log('Found stops on route ' + route.id?.slice(0, 8) + ': ' + route.stops.length);
    }
}

// Check save.data for other route-related fields
log('');
log('Top-level data fields:');
for (const key of Object.keys(save.data)) {
    const val = save.data[key];
    if (Array.isArray(val)) {
        log('  ' + key + ': Array(' + val.length + ')');
    } else if (typeof val === 'object' && val !== null) {
        log('  ' + key + ': {Object}');
    }
}

// Check if there's a separate routePaths or similar
if (save.data.routePaths) {
    log('');
    log('Found routePaths: ' + save.data.routePaths.length);
}

if (save.data.routeStops) {
    log('');
    log('Found routeStops: ' + save.data.routeStops.length);
}

// Check stations for route assignments
log('');
log('=== STATIONS WITH ROUTE ASSIGNMENTS ===');
const stations = save.data.stations || [];
let stationsWithRoutes = 0;
const routeAssignments = {};

for (const station of stations) {
    if (station.routeIds && station.routeIds.length > 0) {
        stationsWithRoutes++;
        for (const rid of station.routeIds) {
            routeAssignments[rid] = (routeAssignments[rid] || 0) + 1;
        }
    }
    if (station.routes && station.routes.length > 0) {
        stationsWithRoutes++;
    }
}

log('Stations with route assignments: ' + stationsWithRoutes + '/' + stations.length);
log('');
log('Stations per route ID:');
for (const [rid, count] of Object.entries(routeAssignments)) {
    const route = routes.find(r => r.id === rid);
    log('  ' + (route ? rid.slice(0, 8) : 'UNKNOWN:' + rid.slice(0, 8)) + ': ' + count + ' stations');
}
