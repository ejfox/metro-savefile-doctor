/**
 * JavaScript Script Runner for Savefile Doctor
 *
 * Allows users to write JS scripts to automate save file modifications.
 * No external dependencies required - uses Node's built-in vm module.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as vm from 'vm';

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

export interface ScriptResult {
    success: boolean;
    save: SaveData;
    logs: string[];
    warnings: string[];
    errors: string[];
}

/**
 * Helper functions exposed to scripts
 */
function createHelpers() {
    return {
        /**
         * Format seconds into human-readable time
         */
        formatTime(seconds: number): string {
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            const secs = Math.floor(seconds % 60);

            const parts: string[] = [];
            if (hours > 0) parts.push(`${hours}h`);
            if (minutes > 0) parts.push(`${minutes}m`);
            if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

            return parts.join(' ');
        },

        /**
         * Format money with $ and commas
         */
        formatMoney(amount: number): string {
            return `$${amount.toLocaleString()}`;
        },

        /**
         * Format large numbers with K/M/B suffixes
         */
        formatNumber(num: number): string {
            if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1)}B`;
            if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
            if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
            return num.toString();
        },

        /**
         * Deep clone an object
         */
        clone<T>(obj: T): T {
            return JSON.parse(JSON.stringify(obj));
        },

        /**
         * Get nested property safely
         */
        get(obj: any, path: string, defaultValue: any = undefined): any {
            const keys = path.split('.');
            let result = obj;
            for (const key of keys) {
                if (result === null || result === undefined) {
                    return defaultValue;
                }
                result = result[key];
            }
            return result ?? defaultValue;
        },

        /**
         * Set nested property
         */
        set(obj: any, path: string, value: any): void {
            const keys = path.split('.');
            let current = obj;
            for (let i = 0; i < keys.length - 1; i++) {
                const key = keys[i];
                if (!(key in current)) {
                    current[key] = {};
                }
                current = current[key];
            }
            current[keys[keys.length - 1]] = value;
        },
    };
}

/**
 * Execute a JavaScript script with access to save data
 */
export async function runJSScript(scriptPath: string, saveData: SaveData): Promise<ScriptResult> {
    const logs: string[] = [];
    const warnings: string[] = [];
    const errors: string[] = [];

    // Make a mutable copy of save data
    const workingSave = JSON.parse(JSON.stringify(saveData));

    // Create sandbox context
    const context = {
        // The save data object - scripts modify this directly
        save: workingSave,

        // Logging functions
        log: (...args: any[]) => {
            const msg = args.map((a) => (typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a))).join(' ');
            logs.push(msg);
            console.log(`[Script] ${msg}`);
        },
        warn: (...args: any[]) => {
            const msg = args.map((a) => (typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a))).join(' ');
            warnings.push(msg);
            console.warn(`[Script] ${msg}`);
        },
        error: (...args: any[]) => {
            const msg = args.map((a) => (typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a))).join(' ');
            errors.push(msg);
            console.error(`[Script] ${msg}`);
        },

        // Helper functions
        ...createHelpers(),

        // Safe globals
        console: {
            log: (...args: any[]) => context.log(...args),
            warn: (...args: any[]) => context.warn(...args),
            error: (...args: any[]) => context.error(...args),
        },
        JSON,
        Math,
        Date,
        Array,
        Object,
        String,
        Number,
        Boolean,
        parseInt,
        parseFloat,
        isNaN,
        isFinite,
    };

    try {
        // Read the script
        const scriptCode = await fs.readFile(scriptPath, 'utf-8');

        // Create a VM context
        vm.createContext(context);

        // Run the script
        vm.runInContext(scriptCode, context, {
            filename: path.basename(scriptPath),
            timeout: 5000, // 5 second timeout
        });

        return {
            success: true,
            save: workingSave,
            logs,
            warnings,
            errors,
        };
    } catch (err: any) {
        errors.push(err.message);
        return {
            success: false,
            save: saveData, // Return original on error
            logs,
            warnings,
            errors,
        };
    }
}

/**
 * Validate a JS script before running (syntax check)
 */
export async function validateJSScript(scriptPath: string): Promise<{
    valid: boolean;
    error?: string;
}> {
    try {
        const scriptCode = await fs.readFile(scriptPath, 'utf-8');

        // Try to parse as a script (not module)
        new vm.Script(scriptCode, {
            filename: path.basename(scriptPath),
        });

        return { valid: true };
    } catch (err: any) {
        return { valid: false, error: err.message };
    }
}

/**
 * Run a script string directly (for REPL/interactive use)
 */
export function runJSScriptString(scriptCode: string, saveData: SaveData): ScriptResult {
    const logs: string[] = [];
    const warnings: string[] = [];
    const errors: string[] = [];

    const workingSave = JSON.parse(JSON.stringify(saveData));

    const context = {
        save: workingSave,
        log: (...args: any[]) => {
            const msg = args.map((a) => (typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a))).join(' ');
            logs.push(msg);
        },
        warn: (...args: any[]) => {
            const msg = args.map((a) => (typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a))).join(' ');
            warnings.push(msg);
        },
        error: (...args: any[]) => {
            const msg = args.map((a) => (typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a))).join(' ');
            errors.push(msg);
        },
        ...createHelpers(),
        console: {
            log: (...args: any[]) => {
                logs.push(args.join(' '));
            },
            warn: (...args: any[]) => {
                warnings.push(args.join(' '));
            },
            error: (...args: any[]) => {
                errors.push(args.join(' '));
            },
        },
        JSON,
        Math,
        Date,
        Array,
        Object,
        String,
        Number,
        Boolean,
        parseInt,
        parseFloat,
        isNaN,
        isFinite,
    };

    try {
        vm.createContext(context);
        vm.runInContext(scriptCode, context, { timeout: 5000 });

        return {
            success: true,
            save: workingSave,
            logs,
            warnings,
            errors,
        };
    } catch (err: any) {
        errors.push(err.message);
        return {
            success: false,
            save: saveData,
            logs,
            warnings,
            errors,
        };
    }
}
