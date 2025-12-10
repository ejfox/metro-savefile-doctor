#!/usr/bin/env node
import React from 'react';
import { render } from 'ink';
import meow from 'meow';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import App from './ui.tsx';
import { runJSScript, validateJSScript } from './js-script-runner.js';
import { runLuaScript, validateLuaScript } from './script-runner.js';
import { readMetroSave, writeMetroSave, isMetroFile } from './metro-loader.js';

const cli = meow(
	`
	Usage
	  $ metro-savefile-doctor <save-file>

	Options
	  --script, -s   Run a script file (.js or .lua)
	  --validate     Validate a script without running it
	  --output, -o   Output file (default: overwrites input file)
	  --backup, -b   Create backup before modifying (default: true)

	Examples
	  $ metro-savefile-doctor my-save.json
	  $ metro-savefile-doctor my-save.json --script scripts/give-money.js
	  $ metro-savefile-doctor my-save.json --script scripts/stats-report.lua
	  $ metro-savefile-doctor --validate my-script.js
	  $ metro-savefile-doctor my-save.json --output modified-save.json
	  $ metro-savefile-doctor my-save.json --no-backup
`,
	{
		importMeta: import.meta,
		flags: {
			script: {
				type: 'string',
				shortFlag: 's',
			},
			validate: {
				type: 'boolean',
			},
			output: {
				type: 'string',
				shortFlag: 'o',
			},
			backup: {
				type: 'boolean',
				shortFlag: 'b',
				default: true,
			},
		},
	},
);

// Script validation mode
if (cli.flags.validate) {
	const scriptPath = cli.input[0];
	if (!scriptPath) {
		console.error('Error: Please provide a script file to validate');
		process.exit(1);
	}

	(async () => {
		const ext = path.extname(scriptPath).toLowerCase();
		let result;

		if (ext === '.js') {
			result = await validateJSScript(scriptPath);
		} else if (ext === '.lua') {
			result = await validateLuaScript(scriptPath);
		} else {
			console.error('Error: Unknown script type. Use .js or .lua');
			process.exit(1);
		}

		if (result.valid) {
			console.log('✅ Script syntax is valid');
			process.exit(0);
		} else {
			console.error('❌ Script has errors:', result.error);
			process.exit(1);
		}
	})();
} else if (cli.flags.script) {
	// Script execution mode
	const saveFilePath = cli.input[0];
	const scriptPath = cli.flags.script;
	const outputPath = cli.flags.output || saveFilePath;

	if (!saveFilePath) {
		console.error('Error: Please provide a save file');
		process.exit(1);
	}

	if (!existsSync(saveFilePath)) {
		console.error(`Error: Save file not found: ${saveFilePath}`);
		process.exit(1);
	}

	if (!existsSync(scriptPath)) {
		console.error(`Error: Script file not found: ${scriptPath}`);
		process.exit(1);
	}

	(async () => {
		try {
			// Load save file
			console.log(`📂 Loading save file: ${saveFilePath}`);
			const isMetro = await isMetroFile(saveFilePath);
			let saveData;

			if (isMetro) {
				saveData = await readMetroSave(saveFilePath);
			} else {
				const data = await fs.readFile(saveFilePath, 'utf-8');
				saveData = JSON.parse(data);
			}

			// Validate save structure
			if (!saveData.data) {
				console.error('Error: Invalid save file format - missing data field');
				process.exit(1);
			}

			// Run script
			const ext = path.extname(scriptPath).toLowerCase();
			console.log(`🔧 Running script: ${scriptPath}`);
			console.log('---');

			let result;
			if (ext === '.js') {
				result = await runJSScript(scriptPath, saveData);
				if (!result.success) {
					console.error('---');
					console.error('❌ Script failed:', result.errors.join('\n'));
					process.exit(1);
				}
				saveData = result.save;
			} else if (ext === '.lua') {
				saveData = await runLuaScript(scriptPath, saveData);
			} else {
				console.error('Error: Unknown script type. Use .js or .lua');
				process.exit(1);
			}

			console.log('---');

			// Create backup if requested
			if (cli.flags.backup && outputPath === saveFilePath) {
				const backupPath = `${saveFilePath}.backup`;
				await fs.copyFile(saveFilePath, backupPath);
				console.log(`💾 Backup created: ${backupPath}`);
			}

			// Save modified data
			if (isMetro) {
				await writeMetroSave(outputPath, saveData);
			} else {
				await fs.writeFile(outputPath, JSON.stringify(saveData, null, 2), 'utf-8');
			}

			console.log(`✅ Save file updated: ${outputPath}`);
			process.exit(0);
		} catch (err) {
			console.error('Error:', err.message);
			process.exit(1);
		}
	})();
} else {
	// Interactive TUI mode
	const saveFilePath = cli.input[0];

	if (!saveFilePath) {
		console.log(cli.help);
		process.exit(1);
	}

	render(
		<App
			saveFilePath={saveFilePath}
			outputPath={cli.flags.output || saveFilePath}
			createBackup={cli.flags.backup}
		/>
	);
}
