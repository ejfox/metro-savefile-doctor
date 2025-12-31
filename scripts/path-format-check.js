// Check what format path data is in

log('=== PATH FORMAT CHECK ===');
log('');

const routes = save.data.routes || [];
const tracks = save.data.tracks || [];

// Get first route and first combo
const route = routes[0];
if (!route || !route.stCombos || !route.stCombos[0]) {
    log('No route data found');
} else {
    const combo = route.stCombos[0];
    log('Route: ' + route.bullet + ' ' + route.variantName);
    log('First stCombo:');
    log('  startStNodeId: ' + combo.startStNodeId);
    log('  endStNodeId: ' + combo.endStNodeId);
    log('  distance: ' + combo.distance);
    log('');
    log('Path array:');
    log('  Length: ' + combo.path.length);
    log('  First element type: ' + typeof combo.path[0]);

    if (combo.path[0]) {
        const first = combo.path[0];
        if (typeof first === 'string') {
            log('  First element (string): ' + first);
            // Check if it's a UUID
            const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(first);
            log('  Is UUID format: ' + isUUID);
            // Check if it exists in tracks
            const track = tracks.find(t => t.id === first);
            log('  Found in tracks: ' + (track ? 'YES' : 'NO'));
        } else if (Array.isArray(first)) {
            log('  First element is array of length: ' + first.length);
            log('  Looks like coordinates: ' + JSON.stringify(first));
        } else if (typeof first === 'object') {
            log('  First element is object with keys: ' + Object.keys(first).join(', '));
        } else {
            log('  First element value: ' + first);
        }
    }

    // Show first few path elements
    log('');
    log('First 5 path elements:');
    for (let i = 0; i < Math.min(5, combo.path.length); i++) {
        const el = combo.path[i];
        if (typeof el === 'string') {
            log('  [' + i + ']: ' + el.slice(0, 40) + (el.length > 40 ? '...' : ''));
        } else if (Array.isArray(el)) {
            log('  [' + i + ']: [' + el.join(', ') + ']');
        } else {
            log('  [' + i + ']: ' + JSON.stringify(el));
        }
    }
}

// Check track ID format for comparison
log('');
log('=== TRACK ID FORMAT ===');
if (tracks.length > 0) {
    log('First track ID: ' + tracks[0].id);
    log('Track ID length: ' + tracks[0].id.length);
}
