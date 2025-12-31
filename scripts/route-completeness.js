// Route Completeness Check - verify routes have full geometry data

log('=== ROUTE COMPLETENESS CHECK ===');
log('');

const routes = save.data.routes || [];
const globalStNodes = save.data.stNodes || [];
const tracks = save.data.tracks || [];

for (const route of routes) {
    log('---');
    log('Route: ' + route.bullet + ' ' + (route.variantName || '') + ' (' + route.id?.slice(0, 8) + ')');

    // Check stNodes are objects with valid IDs
    let validStNodes = 0;
    let totalCoords = 0;

    if (route.stNodes) {
        for (const stn of route.stNodes) {
            if (typeof stn === 'object' && stn.id) {
                const found = globalStNodes.find(g => g.id === stn.id);
                if (found) validStNodes++;
                if (stn.center) totalCoords++;
            }
        }
    }

    log('  stNodes: ' + (route.stNodes?.length || 0) + ' (valid: ' + validStNodes + ')');
    log('  stNodes with center coords: ' + totalCoords);

    // Check stCombos have paths
    let combosWithPath = 0;
    let totalPathLength = 0;

    if (route.stCombos) {
        for (const combo of route.stCombos) {
            if (combo.path && combo.path.length > 0) {
                combosWithPath++;
                totalPathLength += combo.path.length;
            }
        }
    }

    log('  stCombos: ' + (route.stCombos?.length || 0) + ' (with path: ' + combosWithPath + ')');
    log('  Total path coordinates: ' + totalPathLength);

    // Check if paths reference valid tracks
    let pathsWithValidTracks = 0;
    if (route.stCombos) {
        for (const combo of route.stCombos) {
            if (combo.path) {
                let allValid = true;
                for (const trackId of combo.path) {
                    if (!tracks.find(t => t.id === trackId)) {
                        allValid = false;
                        break;
                    }
                }
                if (allValid) pathsWithValidTracks++;
            }
        }
    }

    log('  stCombos with valid track paths: ' + pathsWithValidTracks + '/' + (route.stCombos?.length || 0));

    // Overall status
    const isComplete = validStNodes === (route.stNodes?.length || 0) &&
                       combosWithPath === (route.stCombos?.length || 0) &&
                       pathsWithValidTracks === (route.stCombos?.length || 0);

    log('  STATUS: ' + (isComplete ? 'COMPLETE' : 'INCOMPLETE'));
}

log('');
log('=== SUMMARY ===');
const completeRoutes = routes.filter(r => {
    const validStNodes = r.stNodes?.filter(stn =>
        typeof stn === 'object' && stn.id && globalStNodes.find(g => g.id === stn.id)
    ).length || 0;
    const combosWithPath = r.stCombos?.filter(c => c.path?.length > 0).length || 0;
    return validStNodes === (r.stNodes?.length || 0) && combosWithPath === (r.stCombos?.length || 0);
});

log('Complete routes: ' + completeRoutes.length + '/' + routes.length);
