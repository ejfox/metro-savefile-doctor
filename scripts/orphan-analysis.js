// Analyze orphaned tracks and stations for clues

log('=== ORPHANED INFRASTRUCTURE ANALYSIS ===');
log('');

const routes = save.data.routes || [];
const tracks = save.data.tracks || [];
const stations = save.data.stations || [];
const trackGroups = save.data.trackGroups || [];

// Build set of tracks in routes
const tracksInRoutes = new Set();
for (const route of routes) {
    for (const combo of route.stCombos || []) {
        for (const pathItem of combo.path || []) {
            tracksInRoutes.add(pathItem.trackId);
        }
    }
}

// Get orphaned tracks
const orphanedTracks = tracks.filter(t => !tracksInRoutes.has(t.id));

log('Orphaned tracks: ' + orphanedTracks.length);
log('');

// Analyze orphaned tracks by build type
const byBuildType = {};
for (const track of orphanedTracks) {
    const bt = track.buildType || 'unknown';
    byBuildType[bt] = (byBuildType[bt] || 0) + 1;
}
log('Orphaned tracks by buildType:');
for (const [bt, count] of Object.entries(byBuildType)) {
    log('  ' + bt + ': ' + count);
}

// Analyze orphaned tracks by display type
const byDisplayType = {};
for (const track of orphanedTracks) {
    const dt = track.displayType || 'unknown';
    byDisplayType[dt] = (byDisplayType[dt] || 0) + 1;
}
log('');
log('Orphaned tracks by displayType:');
for (const [dt, count] of Object.entries(byDisplayType)) {
    log('  ' + dt + ': ' + count);
}

// Check if orphaned stations have stNodes that could have been routed
log('');
log('=== ORPHANED STATIONS ANALYSIS ===');

const stationsWithRoutes = new Set();
for (const station of stations) {
    if (station.routeIds && station.routeIds.length > 0) {
        stationsWithRoutes.add(station.id);
    }
}

const orphanedStations = stations.filter(s => !stationsWithRoutes.has(s.id));
log('Orphaned stations: ' + orphanedStations.length);

// Check if orphaned stations have stNodeIds (meaning they COULD be routed)
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

log('Orphaned stations with stNodeIds: ' + orphanedWithStNodes);
log('Orphaned stations with trackIds: ' + orphanedWithTracks);

// Sample some orphaned station names
log('');
log('Sample orphaned station names (first 10):');
for (let i = 0; i < Math.min(10, orphanedStations.length); i++) {
    const s = orphanedStations[i];
    log('  - ' + (s.name || '(unnamed)') + ' (' + (s.stNodeIds?.length || 0) + ' stNodes)');
}

// Check track groups for orphaned tracks
log('');
log('=== TRACK GROUP ANALYSIS ===');
log('Total track groups: ' + trackGroups.length);

// Count track groups that contain orphaned tracks
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

log('Track groups containing orphaned tracks: ' + groupsWithOrphans);
log('Track groups fully orphaned (no tracks in routes): ' + fullyOrphanedGroups);
