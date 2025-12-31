// Compare stNode IDs between routes and global stNodes

log('=== STNODE ID COMPARISON ===');
log('');

const routes = save.data.routes || [];
const globalStNodes = save.data.stNodes || [];

// Sample IDs from first route
const firstRoute = routes[0];
if (firstRoute && firstRoute.stNodes?.length > 0) {
    log('Route stNode IDs (first 5):');
    for (let i = 0; i < Math.min(5, firstRoute.stNodes.length); i++) {
        log('  ' + firstRoute.stNodes[i]);
    }
}

log('');
log('Global stNode IDs (first 5):');
for (let i = 0; i < Math.min(5, globalStNodes.length); i++) {
    log('  ' + globalStNodes[i].id);
}

// Check ID format
log('');
log('=== ID FORMAT ANALYSIS ===');

if (firstRoute?.stNodes?.[0]) {
    const routeStNodeId = firstRoute.stNodes[0];
    log('Route stNode ID example: ' + routeStNodeId);
    log('  Type: ' + typeof routeStNodeId);
    log('  Length: ' + routeStNodeId.length);
}

if (globalStNodes[0]?.id) {
    const globalId = globalStNodes[0].id;
    log('Global stNode ID example: ' + globalId);
    log('  Type: ' + typeof globalId);
    log('  Length: ' + globalId.length);
}

// Check if route stNodes are stored as objects instead of IDs
log('');
log('=== CHECKING IF STNODES ARE OBJECTS ===');
if (firstRoute?.stNodes?.[0]) {
    const first = firstRoute.stNodes[0];
    if (typeof first === 'object' && first !== null) {
        log('Route stNodes ARE objects!');
        log('  Keys: ' + Object.keys(first).join(', '));
        if (first.id) {
            log('  Object has .id field: ' + first.id);
            // Check if this ID exists in global
            const found = globalStNodes.find(g => g.id === first.id);
            log('  Found in global stNodes: ' + (found ? 'YES' : 'NO'));
        }
    } else {
        log('Route stNodes are primitive values (strings/numbers)');
    }
}

// Check stCombo references
log('');
log('=== STCOMBO PATH ANALYSIS ===');
if (firstRoute?.stCombos?.[0]) {
    const firstCombo = firstRoute.stCombos[0];
    log('First stCombo:');
    log('  startStNodeId: ' + firstCombo.startStNodeId);
    log('  endStNodeId: ' + firstCombo.endStNodeId);
    log('  path length: ' + (firstCombo.path?.length || 0));
    log('  distance: ' + firstCombo.distance);

    // Check if startStNodeId matches route stNodes
    if (firstCombo.startStNodeId) {
        const inRouteStNodes = firstRoute.stNodes.includes(firstCombo.startStNodeId);
        log('  startStNodeId in route.stNodes: ' + (inRouteStNodes ? 'YES' : 'NO'));
    }
}

// Look for where these IDs might come from
log('');
log('=== SEARCHING FOR MATCHING IDS ===');
if (firstRoute?.stNodes?.[0]) {
    const targetId = firstRoute.stNodes[0];
    log('Looking for ID: ' + targetId);

    // Check in stations
    const stations = save.data.stations || [];
    for (const station of stations) {
        if (station.id === targetId) {
            log('  Found in stations!');
            break;
        }
        if (station.stNodeIds?.includes(targetId)) {
            log('  Found in station.stNodeIds of station: ' + station.name);
            break;
        }
    }
}
