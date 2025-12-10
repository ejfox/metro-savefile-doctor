# Savefile Doctor Scripts

Example scripts for automating common save file modifications.

**Two options available:**
- **JavaScript (.js)** - No dependencies, works out of the box
- **Lua (.lua)** - Requires `fengari` package (`npm install fengari`)

## Available Scripts

All scripts are available in both JS and Lua versions.

### `give-money`
Adds 1 billion to your money (for testing/cheating).

```bash
metro-metro-savefile-doctor my-save.json --script scripts/give-money.js
# or
metro-savefile-doctor my-save.json --script scripts/give-money.lua
```

**Customization:** Edit `AMOUNT` variable to change how much money to add.

### `fast-forward-time`
Skips forward 30 days in game time (useful for testing long-term systems).

```bash
metro-savefile-doctor my-save.json --script scripts/fast-forward-time.js
```

**Customization:** Edit `HOURS_TO_SKIP` variable to change time amount.

### `give-trains`
Adds 100 trains to your owned fleet.

```bash
metro-savefile-doctor my-save.json --script scripts/give-trains.js
```

**Customization:** Edit `TRAIN_COUNT` variable to change train amount.

### `change-difficulty`
Changes game difficulty mode.

```bash
metro-savefile-doctor my-save.json --script scripts/change-difficulty.js
```

**Customization:** Edit `NEW_MODE` variable to "easy", "normal", or "hard".

### `stats-report`
Generates a detailed stats report without modifying the save.

```bash
metro-savefile-doctor my-save.json --script scripts/stats-report.js
```

**Read-only:** This script doesn't modify your save file.

---

## Writing JavaScript Scripts

JS scripts are the recommended option - no dependencies required!

### Available Globals

#### `save` (object)
The save file data structure:
```javascript
save.name          // Save file name
save.cityCode      // City code (e.g., "NYC")
save.data.money    // Player's money
save.data.elapsedSeconds  // Game time elapsed
save.data.ownedTrainCount  // Owned trains
save.data.gameMode // "easy" | "normal" | "hard"
save.data.stations // Object of stations
save.data.routes   // Object of routes
save.data.trains   // Object of trains
// ... and more
```

Modify `save.data` fields to change your save:
```javascript
save.data.money = 999999999;
save.data.gameMode = "easy";
```

#### `log(...args)`
Print messages to console:
```javascript
log("Current money:", save.data.money);
log("Multiple", "args", "work");
```

#### `warn(...args)`
Print warnings:
```javascript
warn("This might cause issues!");
```

#### `error(...args)`
Print errors:
```javascript
error("Something went wrong!");
```

#### `formatTime(seconds)`
Format seconds to human-readable time:
```javascript
const time = formatTime(3600);  // "1h"
log("Game time:", time);
```

#### `formatMoney(amount)`
Format money with currency symbol:
```javascript
const money = formatMoney(1000000);  // "$1,000,000"
log("Balance:", money);
```

#### `formatNumber(num)`
Format large numbers with K/M/B suffixes:
```javascript
formatNumber(1500);      // "1.5K"
formatNumber(2500000);   // "2.5M"
```

#### `clone(obj)`
Deep clone an object:
```javascript
const backup = clone(save.data.stations);
```

#### `get(obj, path, defaultValue)`
Safely get nested property:
```javascript
const mode = get(save, "data.gameMode", "normal");
```

#### `set(obj, path, value)`
Set nested property:
```javascript
set(save, "data.money", 1000000);
```

### Example: Custom JS Script

Create `my-script.js`:
```javascript
/**
 * My Custom Script
 * Description of what it does
 */

// Configuration
const MONEY_TO_ADD = 5000000;
const TRAINS_TO_ADD = 50;

// Check if player needs help
if (save.data.money < 1000000) {
    log("Low on money! Adding funds...");
    save.data.money = save.data.money + MONEY_TO_ADD;
}

// Add trains
const currentTrains = save.data.ownedTrainCount || 0;
save.data.ownedTrainCount = currentTrains + TRAINS_TO_ADD;

log("Script complete!");
log("Money:", formatMoney(save.data.money));
log("Trains:", save.data.ownedTrainCount);
```

Run it:
```bash
metro-savefile-doctor my-save.json --script my-script.js
```

---

## Writing Lua Scripts

Lua scripts require the `fengari` package:
```bash
npm install fengari
```

### Lua Basics

#### Comments
```lua
-- Single line comment

--[[
  Multi-line comment
]]
```

#### Variables
```lua
local my_var = 100
local name = "Test"
local enabled = true
```

#### String Concatenation
```lua
log("Money: " .. save.data.money)  -- Use .. for strings
```

#### Loops (counting array elements)
```lua
local count = 0
if save.data.stations then
    for _ in pairs(save.data.stations) do
        count = count + 1
    end
end
log("Station count: " .. count)
```

### Example: Custom Lua Script

Create `my-script.lua`:
```lua
--[[
  My Custom Script
  Description of what it does
]]

-- Configuration
local MONEY_TO_ADD = 5000000

-- Check if player needs help
if save.data.money < 1000000 then
    log("Low on money! Adding funds...")
    save.data.money = save.data.money + MONEY_TO_ADD
end

log("Script complete!")
log("Money: " .. formatMoney(save.data.money))
```

---

## Sandboxing & Safety

Scripts are sandboxed and can only:
- Read and modify save data
- Print to console
- Use basic language operations

Scripts CANNOT:
- Access file system
- Make network requests
- Execute shell commands
- Access other processes

**Always backup your saves before running untrusted scripts!**

## Sharing Scripts

When sharing scripts with the community:
1. Add clear comments explaining what it does
2. Use configuration variables at the top
3. Add validation for inputs
4. Test on a backup save first
5. Include usage examples

## Need Help?

Check the example scripts in this directory to see how to read and modify save data.
