/**
 * Fix Near-Miss Tracks (Auto-repair)
 * 
 * Automatically fixes tracks that are very close to each other but not connected.
 * This often happens when a user misclicks while drawing tracks.
 * 
 * Strategy: Endpoint Snapping
 * - Modifies one track's endpoint to exactly match the other's endpoint
 * - Always modifies the track with FEWER coordinates (less impact on geometry)
 * - For equal coordinate counts, modifies track1 by convention
 * 
 * Configuration:
 * - DISTANCE_THRESHOLD: Maximum distance (in coordinate units) to consider as "near-miss"
 * - MIN_COORDS: Minimum number of coordinates a track must have to be analyzed
 * - AUTO_FIX: Enable/disable automatic fixing (set false for dry-run mode)
 */

// Configuration
const DISTANCE_THRESHOLD = 0.00001; // ~1.11 meters at equator (adjust as needed)
const MIN_COORDS = 2; // Tracks must have at least 2 coordinates
const AUTO_FIX = true; // Set to false for detection-only mode

log('=== NEAR-MISS TRACK AUTO-REPAIR ===');
log('Configuration:');
log('  Distance threshold: ' + DISTANCE_THRESHOLD + ' coordinate units (~' + (DISTANCE_THRESHOLD * 111000).toFixed(2) + 'm at equator)');
log('  Min coordinates per track: ' + MIN_COORDS);
log('  Auto-fix enabled: ' + AUTO_FIX);
log('');

const tracks = save.data.tracks || [];

if (tracks.length === 0) {
    log('No tracks found in save file.');
} else {
    log('Total tracks: ' + tracks.length);
    log('');

    // Helper function to calculate distance between two points
    // Uses simple Euclidean distance in coordinate space (degrees)
    // This is approximate but sufficient for small geographic areas
    // For coordinate differences in degrees, multiply by ~111,000 to get meters at equator
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

    // Build a map of track IDs to track objects for quick lookup
    const trackMap = {};
    for (const track of tracks) {
        trackMap[track.id] = track;
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
                { type: 'start-start', dist: distance(track1.endpoints.start, track2.endpoints.start), 
                  point1: track1.endpoints.start, point2: track2.endpoints.start },
                { type: 'start-end', dist: distance(track1.endpoints.start, track2.endpoints.end),
                  point1: track1.endpoints.start, point2: track2.endpoints.end },
                { type: 'end-start', dist: distance(track1.endpoints.end, track2.endpoints.start),
                  point1: track1.endpoints.end, point2: track2.endpoints.start },
                { type: 'end-end', dist: distance(track1.endpoints.end, track2.endpoints.end),
                  point1: track1.endpoints.end, point2: track2.endpoints.end }
            ];
            
            // Find the closest connection
            let minDist = Infinity;
            let minType = null;
            let closestPoints = null;
            for (const d of distances) {
                if (d.dist < minDist) {
                    minDist = d.dist;
                    minType = d.type;
                    closestPoints = { point1: d.point1, point2: d.point2 };
                }
            }
            
            // If the closest connection is below threshold but not exactly 0 (not connected)
            if (minDist > 0 && minDist < DISTANCE_THRESHOLD) {
                nearMisses.push({
                    track1: track1,
                    track2: track2,
                    track1Id: track1.id,
                    track2Id: track2.id,
                    distance: minDist,
                    connectionType: minType,
                    track1Coords: track1.coords.length,
                    track2Coords: track2.coords.length,
                    closestPoints: closestPoints
                });
            }
        }
    }

    log('=== DETECTION RESULTS ===');
    log('');
    
    if (nearMisses.length === 0) {
        log('✓ No near-miss track connections found!');
        log('All tracks are either properly connected or well-separated.');
    } else {
        log('⚠ Found ' + nearMisses.length + ' near-miss connections');
        log('');
        
        // Sort by distance (closest first)
        nearMisses.sort((a, b) => a.distance - b.distance);
        
        if (AUTO_FIX) {
            log('=== AUTO-REPAIR IN PROGRESS ===');
            log('');
            
            let fixedCount = 0;
            
            for (let i = 0; i < nearMisses.length; i++) {
                const miss = nearMisses[i];
                const track1 = trackMap[miss.track1Id];
                const track2 = trackMap[miss.track2Id];
                
                if (!track1 || !track2) {
                    warn('Could not find tracks to fix: ' + miss.track1Id + ' or ' + miss.track2Id);
                    continue;
                }
                
                log('Fixing near-miss #' + (i + 1) + ':');
                log('  Track 1: ' + miss.track1Id.slice(0, 13) + '... (' + miss.track1Coords + ' coords)');
                log('  Track 2: ' + miss.track2Id.slice(0, 13) + '... (' + miss.track2Coords + ' coords)');
                log('  Gap: ' + miss.distance.toFixed(8) + ' units (~' + (miss.distance * 111000).toFixed(2) + 'm)');
                log('  Connection type: ' + miss.connectionType);
                
                // Determine which track to modify (prefer the one with fewer coordinates)
                let trackToModify, trackToMatchTo, modifyAtStart;
                
                if (miss.track1Coords < miss.track2Coords) {
                    trackToModify = track1;
                    trackToMatchTo = track2;
                    log('  Strategy: Modify track 1 (fewer coordinates)');
                } else if (miss.track2Coords < miss.track1Coords) {
                    trackToModify = track2;
                    trackToMatchTo = track1;
                    log('  Strategy: Modify track 2 (fewer coordinates)');
                } else {
                    // Equal coordinates, modify track1 by convention
                    trackToModify = track1;
                    trackToMatchTo = track2;
                    log('  Strategy: Modify track 1 (equal coordinates)');
                }
                
                // Determine which endpoint to modify based on connection type
                const connectionType = miss.connectionType;
                let targetCoord;
                
                if (connectionType === 'start-start') {
                    // Match starts together - choose track2's start as target
                    if (trackToModify === track1) {
                        trackToModify.coords[0] = [trackToMatchTo.coords[0][0], trackToMatchTo.coords[0][1]];
                        targetCoord = trackToMatchTo.coords[0];
                    } else {
                        trackToModify.coords[0] = [trackToMatchTo.coords[0][0], trackToMatchTo.coords[0][1]];
                        targetCoord = trackToMatchTo.coords[0];
                    }
                    log('  Action: Snapped start endpoint');
                } else if (connectionType === 'start-end') {
                    // Match track1 start to track2 end
                    if (trackToModify === track1) {
                        trackToModify.coords[0] = [trackToMatchTo.coords[trackToMatchTo.coords.length - 1][0], 
                                                    trackToMatchTo.coords[trackToMatchTo.coords.length - 1][1]];
                        targetCoord = trackToMatchTo.coords[trackToMatchTo.coords.length - 1];
                    } else {
                        trackToModify.coords[trackToModify.coords.length - 1] = [trackToMatchTo.coords[0][0], 
                                                                                  trackToMatchTo.coords[0][1]];
                        targetCoord = trackToMatchTo.coords[0];
                    }
                    log('  Action: Snapped endpoints together');
                } else if (connectionType === 'end-start') {
                    // Match track1 end to track2 start
                    if (trackToModify === track1) {
                        trackToModify.coords[trackToModify.coords.length - 1] = [trackToMatchTo.coords[0][0], 
                                                                                  trackToMatchTo.coords[0][1]];
                        targetCoord = trackToMatchTo.coords[0];
                    } else {
                        trackToModify.coords[0] = [trackToMatchTo.coords[trackToMatchTo.coords.length - 1][0], 
                                                    trackToMatchTo.coords[trackToMatchTo.coords.length - 1][1]];
                        targetCoord = trackToMatchTo.coords[trackToMatchTo.coords.length - 1];
                    }
                    log('  Action: Snapped endpoints together');
                } else if (connectionType === 'end-end') {
                    // Match ends together
                    if (trackToModify === track1) {
                        trackToModify.coords[trackToModify.coords.length - 1] = [trackToMatchTo.coords[trackToMatchTo.coords.length - 1][0], 
                                                                                  trackToMatchTo.coords[trackToMatchTo.coords.length - 1][1]];
                        targetCoord = trackToMatchTo.coords[trackToMatchTo.coords.length - 1];
                    } else {
                        trackToModify.coords[trackToModify.coords.length - 1] = [trackToMatchTo.coords[trackToMatchTo.coords.length - 1][0], 
                                                                                  trackToMatchTo.coords[trackToMatchTo.coords.length - 1][1]];
                        targetCoord = trackToMatchTo.coords[trackToMatchTo.coords.length - 1];
                    }
                    log('  Action: Snapped end endpoints');
                }
                
                log('  ✓ Fixed - tracks are now connected');
                log('');
                fixedCount++;
            }
            
            log('=== REPAIR SUMMARY ===');
            log('Total near-misses found: ' + nearMisses.length);
            log('Successfully fixed: ' + fixedCount);
            log('');
            log('✓ Auto-repair complete!');
            log('Save file has been modified. Review changes before saving.');
        } else {
            // Dry-run mode: just report what would be fixed
            log('=== DETECTION REPORT (Dry-run mode) ===');
            log('');
            
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
            
            log('Set AUTO_FIX = true to enable automatic repair.');
        }
        
        // Statistics
        const avgDistance = nearMisses.reduce((sum, m) => sum + m.distance, 0) / nearMisses.length;
        const minDistance = Math.min(...nearMisses.map(m => m.distance));
        const maxDistance = Math.max(...nearMisses.map(m => m.distance));
        
        log('');
        log('=== STATISTICS ===');
        log('Total near-misses: ' + nearMisses.length);
        log('Closest gap: ' + minDistance.toFixed(8) + ' units (~' + (minDistance * 111000).toFixed(2) + 'm)');
        log('Largest gap: ' + maxDistance.toFixed(8) + ' units (~' + (maxDistance * 111000).toFixed(2) + 'm)');
        log('Average gap: ' + avgDistance.toFixed(8) + ' units (~' + (avgDistance * 111000).toFixed(2) + 'm)');
    }
}

log('');
log('=== CONFIGURATION ===');
log('To adjust behavior, edit these constants at the top of the script:');
log('  DISTANCE_THRESHOLD - Maximum distance to consider as near-miss (default: 0.00001)');
log('  AUTO_FIX - Enable/disable automatic repair (default: true)');
log('  MIN_COORDS - Minimum coordinates per track (default: 2)');
