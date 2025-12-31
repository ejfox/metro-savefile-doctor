// Debug what generateRouteThumbnail would see

log('=== THUMBNAIL GENERATION DEBUG ===');
log('');

const routes = save.data.routes || [];
const tracks = save.data.tracks || [];

log('Input: ' + routes.length + ' routes, ' + tracks.length + ' tracks');
log('');

// Build tracks map like the thumbnail generator does
const tracksMap = new Map();
for (const t of tracks) {
    tracksMap.set(t.id, t);
}

// Filter main routes (no tempParentId)
const mainRoutes = routes.filter(r => r.tempParentId === null);
log('Main routes (tempParentId === null): ' + mainRoutes.length);

// Check what each route produces
for (const route of mainRoutes) {
    log('---');
    log('Route: ' + route.bullet + ' ' + (route.variantName || '') + ' (' + route.id?.slice(0, 8) + ')');
    log('  Color: ' + (route.color || 'MISSING - will use #666666'));
    log('  tempParentId: ' + route.tempParentId);
    log('  stCombos: ' + (route.stCombos?.length || 0));

    // Extract trackIds like thumbnail generator
    const trackIds = [];
    for (const combo of route.stCombos || []) {
        for (const p of combo.path || []) {
            trackIds.push(p.trackId);
        }
    }
    log('  Track IDs in path: ' + trackIds.length);

    // Check how many tracks are found
    let foundTracks = 0;
    let missingTracks = 0;
    let totalCoords = 0;

    for (const trackId of trackIds) {
        const track = tracksMap.get(trackId);
        if (track) {
            foundTracks++;
            totalCoords += track.coords?.length || 0;
        } else {
            missingTracks++;
        }
    }

    log('  Tracks found: ' + foundTracks);
    log('  Tracks missing: ' + missingTracks);
    log('  Total coordinates: ' + totalCoords);

    if (missingTracks > 0) {
        log('  *** WARNING: Missing ' + missingTracks + ' tracks! ***');
    }
    if (totalCoords < 2) {
        log('  *** WARNING: Not enough coordinates to render! ***');
    }
}

// Check if routes are all the same color (visual overlap issue)
log('');
log('=== COLOR ANALYSIS ===');
const colors = {};
for (const route of mainRoutes) {
    const c = route.color || '#666666';
    colors[c] = (colors[c] || 0) + 1;
}
log('Colors used:');
for (const [color, count] of Object.entries(colors)) {
    log('  ' + color + ': ' + count + ' routes');
}

if (Object.keys(colors).length === 1) {
    log('*** ALL ROUTES HAVE THE SAME COLOR - will visually overlap! ***');
}

// Check route family structure (variants share geometry)
log('');
log('=== FAMILY/VARIANT ANALYSIS ===');
const families = {};
for (const route of mainRoutes) {
    const famId = route.familyId || route.id;
    if (!families[famId]) {
        families[famId] = [];
    }
    families[famId].push(route);
}

log('Route families: ' + Object.keys(families).length);
for (const [famId, members] of Object.entries(families)) {
    log('  Family ' + famId.slice(0, 8) + ': ' + members.length + ' variant(s)');
    for (const m of members) {
        log('    - ' + m.bullet + ' ' + (m.variantName || '(base)'));
    }
}

if (Object.keys(families).length < mainRoutes.length) {
    log('');
    log('*** VARIANTS SHARE SIMILAR GEOMETRY - will visually overlap! ***');
}
