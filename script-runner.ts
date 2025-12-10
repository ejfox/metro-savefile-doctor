/**
 * Lua Script Runner for Savefile Doctor
 *
 * Allows modders to write Lua scripts to automate save file modifications
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Lazy load fengari to avoid import issues
let fengari: any = null;
try {
    fengari = require('fengari');
} catch (e) {
    // fengari not installed - that's okay, we'll show a nice error
}

export interface SaveData {
    id: string;
    name: string;
    timestamp: number;
    version: number;
    cityCode?: string;
    data: {
        money: number;
        elapsedSeconds: number;
        ownedTrainCount?: number;
        transitCost?: number;
        stations?: any[];
        routes?: any[];
        trains?: any[];
        gameMode?: 'easy' | 'normal' | 'hard';
        [key: string]: any;
    };
    [key: string]: any;
}

export interface ScriptContext {
    save: SaveData;
    log: (...args: any[]) => void;
    warn: (...args: any[]) => void;
    error: (...args: any[]) => void;
}

/**
 * Execute a Lua script with access to save data
 */
export async function runLuaScript(
    scriptPath: string,
    saveData: SaveData
): Promise<SaveData> {
    if (!fengari) {
        throw new Error(
            'Lua scripting requires fengari. Install with: npm install fengari\n' +
            'Or use the TUI editor instead.'
        );
    }

    const fs = require('fs/promises');
    const lua = fengari.lua;
    const lauxlib = fengari.lauxlib;
    const lualib = fengari.lualib;
    const to_jsstring = fengari.to_jsstring;

    // Create Lua state
    const L = lauxlib.luaL_newstate();
    lualib.luaL_openlibs(L);

    // Make a mutable copy of save data
    const workingSave = JSON.parse(JSON.stringify(saveData));

    // Helper to convert Lua tables to JS objects
    function luaTableToJS(L: any, index: number): any {
        if (!lua.lua_istable(L, index)) {
            return null;
        }

        const isArray = lua.lua_rawgeti(L, index, 1) !== lua.LUA_TNIL;
        lua.lua_pop(L, 1);

        if (isArray) {
            const arr: any[] = [];
            let i = 1;
            lua.lua_rawgeti(L, index, i);
            while (!lua.lua_isnil(L, -1)) {
                arr.push(luaValueToJS(L, -1));
                lua.lua_pop(L, 1);
                i++;
                lua.lua_rawgeti(L, index, i);
            }
            lua.lua_pop(L, 1);
            return arr;
        } else {
            const obj: any = {};
            lua.lua_pushnil(L);
            while (lua.lua_next(L, index < 0 ? index - 1 : index) !== 0) {
                const key = luaValueToJS(L, -2);
                const value = luaValueToJS(L, -1);
                obj[key] = value;
                lua.lua_pop(L, 1);
            }
            return obj;
        }
    }

    // Helper to convert any Lua value to JS
    function luaValueToJS(L: any, index: number): any {
        const type = lua.lua_type(L, index);
        switch (type) {
            case lua.LUA_TNIL:
                return null;
            case lua.LUA_TBOOLEAN:
                return lua.lua_toboolean(L, index);
            case lua.LUA_TNUMBER:
                return lua.lua_tonumber(L, index);
            case lua.LUA_TSTRING:
                return to_jsstring(lua.lua_tostring(L, index));
            case lua.LUA_TTABLE:
                return luaTableToJS(L, index);
            default:
                return null;
        }
    }

    // Helper to convert JS to Lua
    function jsValueToLua(L: any, value: any): void {
        if (value === null || value === undefined) {
            lua.lua_pushnil(L);
        } else if (typeof value === 'boolean') {
            lua.lua_pushboolean(L, value);
        } else if (typeof value === 'number') {
            lua.lua_pushnumber(L, value);
        } else if (typeof value === 'string') {
            lua.lua_pushstring(L, value);
        } else if (Array.isArray(value)) {
            lua.lua_createtable(L, value.length, 0);
            for (let i = 0; i < value.length; i++) {
                jsValueToLua(L, value[i]);
                lua.lua_rawseti(L, -2, i + 1);
            }
        } else if (typeof value === 'object') {
            lua.lua_createtable(L, 0, Object.keys(value).length);
            for (const [k, v] of Object.entries(value)) {
                lua.lua_pushstring(L, k);
                jsValueToLua(L, v);
                lua.lua_settable(L, -3);
            }
        }
    }

    try {
        // Create safe API for Lua scripts
        lua.lua_newtable(L); // save table

        // save.data
        lua.lua_pushstring(L, 'data');
        jsValueToLua(L, workingSave.data);
        lua.lua_settable(L, -3);

        // save.name
        lua.lua_pushstring(L, 'name');
        lua.lua_pushstring(L, workingSave.name || 'Unnamed');
        lua.lua_settable(L, -3);

        // save.cityCode
        lua.lua_pushstring(L, 'cityCode');
        lua.lua_pushstring(L, workingSave.cityCode || 'Unknown');
        lua.lua_settable(L, -3);

        // Set as global 'save'
        lua.lua_setglobal(L, 'save');

        // Create log function
        lua.lua_pushcfunction(L, (L: any) => {
            const msg = to_jsstring(lauxlib.luaL_checkstring(L, 1));
            console.log(`[Script] ${msg}`);
            return 0;
        });
        lua.lua_setglobal(L, 'log');

        // Create warn function
        lua.lua_pushcfunction(L, (L: any) => {
            const msg = to_jsstring(lauxlib.luaL_checkstring(L, 1));
            console.warn(`[Script] ${msg}`);
            return 0;
        });
        lua.lua_setglobal(L, 'warn');

        // Create error function
        lua.lua_pushcfunction(L, (L: any) => {
            const msg = to_jsstring(lauxlib.luaL_checkstring(L, 1));
            console.error(`[Script] ${msg}`);
            return 0;
        });
        lua.lua_setglobal(L, 'error');

        // Helper: formatTime function
        lua.lua_pushcfunction(L, (L: any) => {
            const seconds = lauxlib.luaL_checknumber(L, 1);
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            const secs = Math.floor(seconds % 60);

            const parts: string[] = [];
            if (hours > 0) parts.push(`${hours}h`);
            if (minutes > 0) parts.push(`${minutes}m`);
            if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

            lua.lua_pushstring(L, parts.join(' '));
            return 1;
        });
        lua.lua_setglobal(L, 'formatTime');

        // Helper: formatMoney function
        lua.lua_pushcfunction(L, (L: any) => {
            const money = lauxlib.luaL_checknumber(L, 1);
            lua.lua_pushstring(L, `$${money.toLocaleString()}`);
            return 1;
        });
        lua.lua_setglobal(L, 'formatMoney');

        // Load and execute the script
        const scriptCode = await fs.readFile(scriptPath, 'utf-8');

        if (lauxlib.luaL_dostring(L, scriptCode) !== lua.LUA_OK) {
            const err = to_jsstring(lua.lua_tostring(L, -1));
            throw new Error(`Lua script error: ${err}`);
        }

        // Extract modified save data
        lua.lua_getglobal(L, 'save');
        if (!lua.lua_isnil(L, -1)) {
            const modifiedSave = luaTableToJS(L, -1);

            // Merge changes back into working save
            if (modifiedSave.data) {
                workingSave.data = modifiedSave.data;
            }
            if (modifiedSave.name) {
                workingSave.name = modifiedSave.name;
            }
            if (modifiedSave.cityCode) {
                workingSave.cityCode = modifiedSave.cityCode;
            }
        }

        return workingSave;

    } finally {
        lua.lua_close(L);
    }
}

/**
 * Validate a Lua script before running (syntax check)
 */
export async function validateLuaScript(scriptPath: string): Promise<{
    valid: boolean;
    error?: string;
}> {
    if (!fengari) {
        return {
            valid: false,
            error: 'Lua scripting requires fengari. Install with: npm install fengari'
        };
    }

    const fs = require('fs/promises');
    const lua = fengari.lua;
    const lauxlib = fengari.lauxlib;
    const lualib = fengari.lualib;
    const to_jsstring = fengari.to_jsstring;

    const L = lauxlib.luaL_newstate();
    lualib.luaL_openlibs(L);

    try {
        const scriptCode = await fs.readFile(scriptPath, 'utf-8');

        if (lauxlib.luaL_loadstring(L, scriptCode) !== lua.LUA_OK) {
            const err = to_jsstring(lua.lua_tostring(L, -1));
            return { valid: false, error: err };
        }

        return { valid: true };
    } catch (err: any) {
        return { valid: false, error: err.message };
    } finally {
        lua.lua_close(L);
    }
}
