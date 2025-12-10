/**
 * Stats Report Script
 *
 * Generates a detailed report of your save file without modifying it
 */

log("=== SAVE FILE STATS REPORT ===");
log("");

// Basic Info
log("Name:", save.name);
log("City:", save.cityCode);
log("");

// Economy
log("Economy:");
log("  Money:", formatMoney(save.data.money));
log("  Transit Cost: $" + (save.data.transitCost || 0));
log("");

// Time
log("Time:");
log("  Game Time:", formatTime(save.data.elapsedSeconds));
log("  Play Time:", formatTime(save.data.playTimeSeconds || 0));
log("");

// Infrastructure
const stationCount = save.data.stations ? Object.keys(save.data.stations).length : 0;
const routeCount = save.data.routes ? Object.keys(save.data.routes).length : 0;
const trainCount = save.data.trains ? Object.keys(save.data.trains).length : 0;

log("Infrastructure:");
log("  Stations:", stationCount);
log("  Routes:", routeCount);
log("  Trains (running):", trainCount);
log("  Trains (owned):", save.data.ownedTrainCount || 0);
log("");

// Difficulty
log("Game Mode:", save.data.gameMode || "normal");
log("");

log("===============================");

// Don't modify anything - this is read-only
