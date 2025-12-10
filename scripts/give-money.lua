--[[
  Give Money Script

  Adds money to your save file for testing or cheating
]]

-- Configuration
local AMOUNT = 1000000000  -- 1 billion

-- Apply changes
log("Current money: " .. formatMoney(save.data.money))
save.data.money = save.data.money + AMOUNT
log("New money: " .. formatMoney(save.data.money))

log("Added " .. formatMoney(AMOUNT) .. " to your account!")
