// Route Geometry Check - analyze stNodes and station relationships

log('=== ROUTE GEOMETRY CHECK ===');
log('');

const routes = save.data.routes || [];
const stations = save.data.stations || [];
const stNodes = save.data.stNodes || [];

log('Global stNodes count: ' + stNodes.length);
log('');

for (const route of routes) {
    log('---');
    log('Route: ' + route.bullet + ' (' + route.id?.slice(0, 8) + ')');
    log('  Color: ' + route.color);
    log('  Train type: ' + route.trainType);
    log('  Variant: ' + route.variantName);
    log('  stNodes count: ' + (route.stNodes?.length || 0));
    log('  stCombos count: ' + (route.stCombos?.length || 0));
    log('  stComboTimings count: ' + (route.stComboTimings?.length || 0));

    // Check if stNodes reference valid global stNodes
    if (route.stNodes && route.stNodes.length > 0) {
        let validStNodes = 0;
        let invalidStNodes = 0;

        for (const stnId of route.stNodes) {
            const found = stNodes.find(stn => stn.id === stnId);
            if (found) {
                validStNodes++;
            } else {
                invalidStNodes++;
            }
        }

        log('  Valid stNode refs: ' + validStNodes + '/' + route.stNodes.length);
        if (invalidStNodes > 0) {
            log('  *** INVALID stNode refs: ' + invalidStNodes + ' ***');
        }
    }

    // Check stCombos structure
    if (route.stCombos && route.stCombos.length > 0) {
        const firstCombo = route.stCombos[0];
        log('  First stCombo keys: ' + Object.keys(firstCombo).join(', '));

        // Check if stCombos have trackGroup references
        let combosWithTG = 0;
        let combosWithoutTG = 0;
        for (const combo of route.stCombos) {
            if (combo.tgId || combo.trackGroupId) {
                combosWithTG++;
            } else {
                combosWithoutTG++;
            }
        }
        log('  stCombos with trackGroup: ' + combosWithTG);
        log('  stCombos without trackGroup: ' + combosWithoutTG);
    }

    // Find stations assigned to this route
    const assignedStations = stations.filter(s => s.routeIds?.includes(route.id));
    log('  Stations with this route: ' + assignedStations.length);
}

log('');
log('=== ROUTE FAMILY STRUCTURE ===');
const families = {};
for (const route of routes) {
    const famId = route.familyId || route.id;
    if (!families[famId]) {
        families[famId] = [];
    }
    families[famId].push(route);
}

log('Route families: ' + Object.keys(families).length);
for (const [famId, members] of Object.entries(families)) {
    log('  Family ' + famId.slice(0, 8) + ': ' + members.length + ' variants');
    for (const m of members) {
        log('    - ' + m.bullet + ' ' + m.variantName + ' (stNodes: ' + (m.stNodes?.length || 0) + ')');
    }
}
