--[[
  Stats Report Script

  Generates a detailed report of your save file without modifying it
]]

log("=== SAVE FILE STATS REPORT ===")
log("")

-- Basic Info
log("Name: " .. save.name)
log("City: " .. save.cityCode)
log("")

-- Economy
log("💰 Economy:")
log("  Money: " .. formatMoney(save.data.money))
log("  Transit Cost: $" .. (save.data.transitCost or 0))
log("")

-- Time
log("⏱️  Time:")
log("  Game Time: " .. formatTime(save.data.elapsedSeconds))
log("  Play Time: " .. formatTime(save.data.playTimeSeconds or 0))
log("")

-- Infrastructure
local station_count = 0
if save.data.stations then
    for _ in pairs(save.data.stations) do
        station_count = station_count + 1
    end
end

local route_count = 0
if save.data.routes then
    for _ in pairs(save.data.routes) do
        route_count = route_count + 1
    end
end

local train_count = 0
if save.data.trains then
    for _ in pairs(save.data.trains) do
        train_count = train_count + 1
    end
end

log("🚇 Infrastructure:")
log("  Stations: " .. station_count)
log("  Routes: " .. route_count)
log("  Trains (running): " .. train_count)
log("  Trains (owned): " .. (save.data.ownedTrainCount or 0))
log("")

-- Difficulty
log("🎮 Game Mode: " .. (save.data.gameMode or "normal"))
log("")

log("===============================")

-- Don't modify anything - this is read-only
