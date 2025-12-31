// Check if route path trackIds exist in tracks array

log('=== TRACK ID MATCHING ===');
log('');

const routes = save.data.routes || [];
const tracks = save.data.tracks || [];

// Build track ID lookup
const trackIds = new Set(tracks.map(t => t.id));
log('Total tracks: ' + tracks.length);
log('Unique track IDs: ' + trackIds.size);
log('');

// Sample some track IDs
log('Sample track IDs from tracks array:');
for (let i = 0; i < Math.min(5, tracks.length); i++) {
    log('  ' + tracks[i].id);
}

log('');

// Check each route
for (const route of routes) {
    log('---');
    log('Route: ' + route.bullet + ' ' + (route.variantName || '') + ' (' + route.id?.slice(0, 8) + ')');

    let totalPathTracks = 0;
    let missingTracks = 0;
    const missingIds = [];

    for (const combo of route.stCombos || []) {
        for (const pathItem of combo.path || []) {
            totalPathTracks++;
            if (!trackIds.has(pathItem.trackId)) {
                missingTracks++;
                if (missingIds.length < 5) {
                    missingIds.push(pathItem.trackId);
                }
            }
        }
    }

    log('  Path track references: ' + totalPathTracks);
    log('  Missing tracks: ' + missingTracks);

    if (missingIds.length > 0) {
        log('  Sample missing IDs:');
        for (const id of missingIds) {
            log('    - ' + id);
        }
    }

    if (missingTracks > 0) {
        log('  *** ' + Math.round(missingTracks/totalPathTracks*100) + '% OF TRACK REFS ARE INVALID ***');
    } else {
        log('  ✓ All track references valid');
    }
}

// Look for pattern in missing vs existing
log('');
log('=== ID FORMAT COMPARISON ===');
if (routes[0]?.stCombos?.[0]?.path?.[0]) {
    const routeTrackId = routes[0].stCombos[0].path[0].trackId;
    log('Route path trackId: ' + routeTrackId);

    // Check if base UUID exists
    const baseUuid = routeTrackId.split('@@')[0];
    log('Base UUID (before @@): ' + baseUuid);

    // Find any track that starts with this base
    const matchingTracks = tracks.filter(t => t.id.startsWith(baseUuid));
    log('Tracks starting with this base: ' + matchingTracks.length);
    if (matchingTracks.length > 0) {
        log('Matching track IDs:');
        for (const t of matchingTracks.slice(0, 5)) {
            log('  ' + t.id);
        }
    }
}
