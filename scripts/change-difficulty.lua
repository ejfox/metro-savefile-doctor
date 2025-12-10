--[[
  Change Difficulty Script

  Switches game mode between easy, normal, and hard
]]

-- Configuration
local NEW_MODE = "easy"  -- Options: "easy", "normal", "hard"

-- Validate mode
local valid_modes = {easy = true, normal = true, hard = true}
if not valid_modes[NEW_MODE] then
    error("Invalid game mode: " .. NEW_MODE .. " (must be easy, normal, or hard)")
    return
end

-- Apply changes
local current = save.data.gameMode or "normal"
log("Current difficulty: " .. current)

save.data.gameMode = NEW_MODE

log("New difficulty: " .. NEW_MODE)
log("Difficulty changed!")
