/**
 * Change Difficulty Script
 *
 * Switches game mode between easy, normal, and hard
 */

// Configuration
const NEW_MODE = "easy"; // Options: "easy", "normal", "hard"

// Validate mode
const validModes = ["easy", "normal", "hard"];
if (!validModes.includes(NEW_MODE)) {
    error("Invalid game mode:", NEW_MODE, "(must be easy, normal, or hard)");
} else {
    // Apply changes
    const current = save.data.gameMode || "normal";
    log("Current difficulty:", current);

    save.data.gameMode = NEW_MODE;

    log("New difficulty:", NEW_MODE);
    log("Difficulty changed!");
}
