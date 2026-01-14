/**
 * Test script for near-miss track detection
 * Creates a minimal test save file with tracks that are close but not connected
 */

const { runJSScriptString } = require('./dist/js-script-runner.js');

// Create a test save with tracks that are near-miss
const testSave = {
    id: 'test-save',
    name: 'Test Save',
    timestamp: Date.now(),
    version: 1,
    cityCode: 'TEST',
    data: {
        money: 1000000,
        elapsedSeconds: 3600,
        tracks: [
            // Track 1: goes from (0,0) to (0,1)
            {
                id: 'track-1',
                coords: [
                    [0.0, 0.0],
                    [0.0, 0.5],
                    [0.0, 1.0]
                ]
            },
            // Track 2: starts at (0, 1.00005) - very close to track 1 end but not connected
            {
                id: 'track-2',
                coords: [
                    [0.0, 1.00005],  // Near-miss: 0.00005 units away from track 1 end
                    [0.0, 1.5],
                    [0.0, 2.0]
                ]
            },
            // Track 3: completely separate
            {
                id: 'track-3',
                coords: [
                    [5.0, 5.0],
                    [5.0, 6.0]
                ]
            },
            // Track 4: properly connected to track 1 (same endpoint)
            {
                id: 'track-4',
                coords: [
                    [0.0, 0.0],  // Connected to track 1 start
                    [-1.0, 0.0]
                ]
            },
            // Track 5: another near-miss to track 3
            {
                id: 'track-5',
                coords: [
                    [5.00008, 5.0],  // Near-miss to track 3 start
                    [6.0, 5.0]
                ]
            }
        ],
        stations: [],
        routes: []
    }
};

console.log('Running near-miss detection test...\n');

const fs = require('fs');
const scriptCode = fs.readFileSync('./scripts/detect-near-miss-tracks.js', 'utf-8');

const result = runJSScriptString(scriptCode, testSave);

if (result.success) {
    console.log('✓ Script executed successfully\n');
    console.log('Output:');
    console.log('='.repeat(60));
    result.logs.forEach(line => console.log(line));
    console.log('='.repeat(60));
} else {
    console.log('✗ Script failed\n');
    result.errors.forEach(err => console.error(err));
}
