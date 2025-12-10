--[[
  Give Trains Script

  Adds trains to your fleet for testing route capacity
]]

-- Configuration
local TRAIN_COUNT = 100

-- Apply changes
local current = save.data.ownedTrainCount or 0
log("Current trains: " .. current)

save.data.ownedTrainCount = current + TRAIN_COUNT

log("New train count: " .. save.data.ownedTrainCount)
log("Added " .. TRAIN_COUNT .. " trains to your fleet!")
