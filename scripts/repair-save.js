/**
 * repair-save.js - Fix common save file issues
 *
 * Fixes:
 * - Nudge stuck trains (stationary >60s)
 *
 * NOTE: Routes use 'stNodes' (station nodes) - trunk routes have 0 stNodes intentionally.
 * We do NOT auto-remove routes - too risky. Only fix stuck trains.
 * Train structure: motion.speed (not speed), stuckDetection.lastMovementTime (not state)
 */

const fixes = [];
const currentTime = save.data.elapsedSeconds || 0;

// Fix: Nudge stuck trains (speed=0 for >60s)
if (save.data.trains && Array.isArray(save.data.trains)) {
    let stuckFixed = 0;
    save.data.trains.forEach(train => {
        if (!train.motion || !train.stuckDetection) return;

        const isStationary = train.motion.speed === 0;
        const timeSinceMove = currentTime - train.stuckDetection.lastMovementTime;
        const isStuck = isStationary && timeSinceMove > 60;

        if (isStuck) {
            // Give the train a small nudge to unstick it
            train.motion.speed = 0.1;
            train.stuckDetection.lastMovementTime = currentTime;
            stuckFixed++;
        }
    });
    if (stuckFixed > 0) {
        fixes.push('Nudged ' + stuckFixed + ' stuck trains');
        log('Nudged ' + stuckFixed + ' stuck trains (were stationary >60s)');
    }
}

// Summary
if (fixes.length === 0) {
    log('No issues found - save file is healthy!');
} else {
    log('Applied ' + fixes.length + ' fixes:');
    fixes.forEach(f => log('  - ' + f));
}
