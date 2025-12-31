// Check how much of the track network is covered by routes

log('=== TRACK COVERAGE ANALYSIS ===');
log('');

const routes = save.data.routes || [];
const tracks = save.data.tracks || [];
const stations = save.data.stations || [];

log('Total tracks: ' + tracks.length);
log('Total stations: ' + stations.length);
log('Total routes: ' + routes.length);
log('');

// Collect all track IDs used by routes
const tracksInRoutes = new Set();
for (const route of routes) {
    for (const combo of route.stCombos || []) {
        for (const pathItem of combo.path || []) {
            tracksInRoutes.add(pathItem.trackId);
        }
    }
}

log('Tracks used by routes: ' + tracksInRoutes.size);
log('Tracks NOT in any route: ' + (tracks.length - tracksInRoutes.size));
log('Coverage: ' + Math.round(tracksInRoutes.size / tracks.length * 100) + '%');
log('');

// Check stations
const stationsInRoutes = new Set();
for (const station of stations) {
    if (station.routeIds && station.routeIds.length > 0) {
        stationsInRoutes.add(station.id);
    }
}

log('Stations with routes: ' + stationsInRoutes.size);
log('Stations without routes: ' + (stations.length - stationsInRoutes.size));
log('Station coverage: ' + Math.round(stationsInRoutes.size / stations.length * 100) + '%');
log('');

// Check station track nodes (stNodes) in routes
const stNodesInRoutes = new Set();
for (const route of routes) {
    for (const stn of route.stNodes || []) {
        if (typeof stn === 'object' && stn.id) {
            stNodesInRoutes.add(stn.id);
        }
    }
}

log('stNodes in routes: ' + stNodesInRoutes.size);
log('Global stNodes: ' + (save.data.stNodes?.length || 0));
log('');

// Geographic extent - check if routes cover the whole city or just a small area
log('=== GEOGRAPHIC ANALYSIS ===');

let routeBounds = { minLng: Infinity, maxLng: -Infinity, minLat: Infinity, maxLat: -Infinity };
let allTrackBounds = { minLng: Infinity, maxLng: -Infinity, minLat: Infinity, maxLat: -Infinity };

// Get bounds of all tracks
for (const track of tracks) {
    for (const coord of track.coords || []) {
        allTrackBounds.minLng = Math.min(allTrackBounds.minLng, coord[0]);
        allTrackBounds.maxLng = Math.max(allTrackBounds.maxLng, coord[0]);
        allTrackBounds.minLat = Math.min(allTrackBounds.minLat, coord[1]);
        allTrackBounds.maxLat = Math.max(allTrackBounds.maxLat, coord[1]);
    }
}

// Get bounds of tracks IN routes
for (const route of routes) {
    for (const combo of route.stCombos || []) {
        for (const pathItem of combo.path || []) {
            const track = tracks.find(t => t.id === pathItem.trackId);
            if (track) {
                for (const coord of track.coords || []) {
                    routeBounds.minLng = Math.min(routeBounds.minLng, coord[0]);
                    routeBounds.maxLng = Math.max(routeBounds.maxLng, coord[0]);
                    routeBounds.minLat = Math.min(routeBounds.minLat, coord[1]);
                    routeBounds.maxLat = Math.max(routeBounds.maxLat, coord[1]);
                }
            }
        }
    }
}

log('All tracks extent:');
log('  Lng: ' + allTrackBounds.minLng.toFixed(4) + ' to ' + allTrackBounds.maxLng.toFixed(4));
log('  Lat: ' + allTrackBounds.minLat.toFixed(4) + ' to ' + allTrackBounds.maxLat.toFixed(4));

log('');
log('Routes extent:');
log('  Lng: ' + routeBounds.minLng.toFixed(4) + ' to ' + routeBounds.maxLng.toFixed(4));
log('  Lat: ' + routeBounds.minLat.toFixed(4) + ' to ' + routeBounds.maxLat.toFixed(4));

const allLngSpan = allTrackBounds.maxLng - allTrackBounds.minLng;
const allLatSpan = allTrackBounds.maxLat - allTrackBounds.minLat;
const routeLngSpan = routeBounds.maxLng - routeBounds.minLng;
const routeLatSpan = routeBounds.maxLat - routeBounds.minLat;

log('');
log('Geographic coverage:');
log('  Lng span: routes cover ' + Math.round(routeLngSpan / allLngSpan * 100) + '% of track extent');
log('  Lat span: routes cover ' + Math.round(routeLatSpan / allLatSpan * 100) + '% of track extent');
