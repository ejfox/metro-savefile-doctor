/**
 * Give Trains Script
 *
 * Adds trains to your fleet for testing route capacity
 */

// Configuration
const TRAIN_COUNT = 100;

// Apply changes
const current = save.data.ownedTrainCount || 0;
log('Current trains:', current);

save.data.ownedTrainCount = current + TRAIN_COUNT;

log('New train count:', save.data.ownedTrainCount);
log('Added', TRAIN_COUNT, 'trains to your fleet!');
