--[[
  Fast Forward Time Script

  Skips forward in game time - useful for testing long-term systems
]]

-- Configuration
local HOURS_TO_SKIP = 24 * 30  -- 30 days

-- Calculate seconds
local SECONDS_TO_SKIP = HOURS_TO_SKIP * 3600

-- Apply changes
log("Current game time: " .. formatTime(save.data.elapsedSeconds))
save.data.elapsedSeconds = save.data.elapsedSeconds + SECONDS_TO_SKIP
log("New game time: " .. formatTime(save.data.elapsedSeconds))

log("Fast forwarded " .. HOURS_TO_SKIP .. " hours!")
