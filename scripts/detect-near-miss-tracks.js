/**
 * Detect Near-Miss Tracks
 * 
 * Finds tracks that are very close to each other but not connected.
 * This often happens when a user misclicks while drawing tracks.
 * 
 * Configuration:
 * - DISTANCE_THRESHOLD: Maximum distance (in coordinate units) to consider as "near-miss"
 * - MIN_COORDS: Minimum number of coordinates a track must have to be analyzed
 */

// Configuration
const DISTANCE_THRESHOLD = 0.0001; // ~11 meters at equator (adjust as needed)
const MIN_COORDS = 2; // Tracks must have at least 2 coordinates

log('=== NEAR-MISS TRACK DETECTION ===');
log('Configuration:');
log('  Distance threshold: ' + DISTANCE_THRESHOLD + ' coordinate units');
log('  Min coordinates per track: ' + MIN_COORDS);
log('');

const tracks = save.data.tracks || [];

if (tracks.length === 0) {
    log('No tracks found in save file.');
} else {
    log('Total tracks: ' + tracks.length);
    log('');

    // Helper function to calculate distance between two points
    // Uses simple Euclidean distance for small geographic areas
    function distance(point1, point2) {
        const dx = point1[0] - point2[0];
        const dy = point1[1] - point2[1];
        return Math.sqrt(dx * dx + dy * dy);
    }

    // Helper function to get endpoints of a track
    function getEndpoints(track) {
        if (!track.coords || track.coords.length < MIN_COORDS) {
            return null;
        }
        return {
            start: track.coords[0],
            end: track.coords[track.coords.length - 1]
        };
    }

    // Build list of tracks with valid coordinates
    const validTracks = [];
    for (const track of tracks) {
        const endpoints = getEndpoints(track);
        if (endpoints) {
            validTracks.push({
                id: track.id,
                coords: track.coords,
                endpoints: endpoints
            });
        }
    }

    log('Tracks with valid coordinates: ' + validTracks.length);
    log('');

    // Find near-miss connections
    const nearMisses = [];
    
    for (let i = 0; i < validTracks.length; i++) {
        const track1 = validTracks[i];
        
        for (let j = i + 1; j < validTracks.length; j++) {
            const track2 = validTracks[j];
            
            // Check all four possible endpoint combinations
            const distances = [
                { type: 'start-start', dist: distance(track1.endpoints.start, track2.endpoints.start) },
                { type: 'start-end', dist: distance(track1.endpoints.start, track2.endpoints.end) },
                { type: 'end-start', dist: distance(track1.endpoints.end, track2.endpoints.start) },
                { type: 'end-end', dist: distance(track1.endpoints.end, track2.endpoints.end) }
            ];
            
            // Find the closest connection
            let minDist = Infinity;
            let minType = null;
            for (const d of distances) {
                if (d.dist < minDist) {
                    minDist = d.dist;
                    minType = d.type;
                }
            }
            
            // If the closest connection is below threshold but not exactly 0 (not connected)
            if (minDist > 0 && minDist < DISTANCE_THRESHOLD) {
                nearMisses.push({
                    track1Id: track1.id,
                    track2Id: track2.id,
                    distance: minDist,
                    connectionType: minType,
                    track1Coords: track1.coords.length,
                    track2Coords: track2.coords.length
                });
            }
        }
    }

    log('=== RESULTS ===');
    log('');
    
    if (nearMisses.length === 0) {
        log('✓ No near-miss track connections found!');
        log('All tracks are either properly connected or well-separated.');
    } else {
        log('⚠ Found ' + nearMisses.length + ' near-miss connections:');
        log('');
        
        // Sort by distance (closest first)
        nearMisses.sort((a, b) => a.distance - b.distance);
        
        // Show details
        for (let i = 0; i < Math.min(20, nearMisses.length); i++) {
            const miss = nearMisses[i];
            log('Near-miss #' + (i + 1) + ':');
            log('  Track 1: ' + miss.track1Id.slice(0, 13) + '... (' + miss.track1Coords + ' coords)');
            log('  Track 2: ' + miss.track2Id.slice(0, 13) + '... (' + miss.track2Coords + ' coords)');
            log('  Distance: ' + miss.distance.toFixed(8) + ' units');
            log('  Connection: ' + miss.connectionType);
            log('  Approx. meters: ' + (miss.distance * 111000).toFixed(2) + 'm (at equator)');
            log('');
        }
        
        if (nearMisses.length > 20) {
            log('... and ' + (nearMisses.length - 20) + ' more near-misses');
            log('');
        }
        
        // Statistics
        const avgDistance = nearMisses.reduce((sum, m) => sum + m.distance, 0) / nearMisses.length;
        const minDistance = nearMisses[0].distance;
        const maxDistance = nearMisses[nearMisses.length - 1].distance;
        
        log('=== STATISTICS ===');
        log('Total near-misses: ' + nearMisses.length);
        log('Closest gap: ' + minDistance.toFixed(8) + ' units (~' + (minDistance * 111000).toFixed(2) + 'm)');
        log('Largest gap: ' + maxDistance.toFixed(8) + ' units (~' + (maxDistance * 111000).toFixed(2) + 'm)');
        log('Average gap: ' + avgDistance.toFixed(8) + ' units (~' + (avgDistance * 111000).toFixed(2) + 'm)');
        log('');
        log('These tracks are very close but not connected.');
        log('They may be the result of misclicks during track placement.');
    }
}

log('');
log('=== RECOMMENDATIONS ===');
log('If near-misses were found:');
log('  1. Review the tracks in the game to verify they should be connected');
log('  2. Use the game editor to snap the endpoints together if needed');
log('  3. Or adjust DISTANCE_THRESHOLD in this script if false positives');
log('');
log('To adjust sensitivity, edit DISTANCE_THRESHOLD at the top of this script:');
log('  - Smaller value = only report very close tracks');
log('  - Larger value = report tracks farther apart');
