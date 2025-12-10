import React, { useState, useEffect, useMemo } from 'react';
import { Box, Text, Newline, useApp, useInput } from 'ink';
import TextInput from 'ink-text-input';
import SelectInput from 'ink-select-input';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import chalk from 'chalk';
import { readMetroSave, writeMetroSave, isMetroFile } from './metro-loader.js';

// If Young Metro don't trust you...
const METRO_QUOTES = [
	"If Young Metro don't trust your save file, I'm gon' restore it",
	"If Young Metro don't trust you, I'm gon' backup your data",
	"Metro Boomin want some more... trains",
	"If Young Metro don't trust you, your save file's gettin' fixed",
	"Metro Boomin make it boom... your transit network",
	"Trust issues? Metro's got backup plans",
	"Young Metro trusted this save file ✓",
	"If Young Metro don't trust you, check your .metro extension",
];

export default function App({ saveFilePath, outputPath, createBackup }) {
	const { exit } = useApp();
	const [state, setState] = useState('loading'); // loading, menu, editing, saving, error, success
	const [saveData, setSaveData] = useState(null);
	const [error, setError] = useState(null);
	const [editingField, setEditingField] = useState(null);
	const [editValue, setEditValue] = useState('');
	const [modified, setModified] = useState(false);
	const [isMetroFormat, setIsMetroFormat] = useState(false);

	// Pick a random quote on mount
	const metroQuote = useMemo(() => METRO_QUOTES[Math.floor(Math.random() * METRO_QUOTES.length)], []);

	// Load save file
	useEffect(() => {
		async function loadSave() {
			try {
				if (!existsSync(saveFilePath)) {
					setError(`File not found: ${saveFilePath}`);
					setState('error');
					return;
				}

				// Detect format
				const isMetro = await isMetroFile(saveFilePath);
				setIsMetroFormat(isMetro);

				let save;
				if (isMetro) {
					// Load .metro binary format
					save = await readMetroSave(saveFilePath);
				} else {
					// Load JSON format
					const data = await fs.readFile(saveFilePath, 'utf-8');
					save = JSON.parse(data);
				}

				// Validate it's a Subway Builder save
				if (!save.data) {
					setError('Invalid save file format - missing data field');
					setState('error');
					return;
				}

				setSaveData(save);
				setState('menu');
			} catch (err) {
				setError(err.message);
				setState('error');
			}
		}

		loadSave();
	}, [saveFilePath]);

	// Handle saving
	const handleSave = async () => {
		setState('saving');
		try {
			// Create backup if requested
			if (createBackup && outputPath === saveFilePath) {
				const backupPath = `${saveFilePath}.backup`;
				await fs.copyFile(saveFilePath, backupPath);
			}

			// Save in appropriate format
			if (isMetroFormat) {
				await writeMetroSave(outputPath, saveData);
			} else {
				await fs.writeFile(outputPath, JSON.stringify(saveData, null, 2), 'utf-8');
			}

			setState('success');
			setTimeout(() => exit(), 2000);
		} catch (err) {
			setError(`Failed to save: ${err.message}`);
			setState('error');
		}
	};

	// Handle field editing
	const startEditing = (field) => {
		setEditingField(field);
		const currentValue = getFieldValue(field);
		setEditValue(String(currentValue));
	};

	const finishEditing = () => {
		if (editingField) {
			const newValue = parseFieldValue(editingField, editValue);
			setFieldValue(editingField, newValue);
			setModified(true);
		}
		setEditingField(null);
		setEditValue('');
	};

	const cancelEditing = () => {
		setEditingField(null);
		setEditValue('');
	};

	// Field getters/setters
	const getFieldValue = (field) => {
		switch (field) {
			case 'money': return saveData.data.money;
			case 'elapsedSeconds': return saveData.data.elapsedSeconds;
			case 'ownedTrainCount': return saveData.data.ownedTrainCount || 0;
			case 'transitCost': return saveData.data.transitCost || 0;
			default: return null;
		}
	};

	const setFieldValue = (field, value) => {
		const newSaveData = { ...saveData };
		switch (field) {
			case 'money':
				newSaveData.data.money = value;
				break;
			case 'elapsedSeconds':
				newSaveData.data.elapsedSeconds = value;
				break;
			case 'ownedTrainCount':
				newSaveData.data.ownedTrainCount = value;
				break;
			case 'transitCost':
				newSaveData.data.transitCost = value;
				break;
		}
		setSaveData(newSaveData);
	};

	const parseFieldValue = (field, value) => {
		return parseFloat(value) || 0;
	};

	// Keyboard shortcuts
	useInput((input, key) => {
		if (state === 'menu' && !editingField) {
			if (input === 'q') {
				exit();
			} else if (input === 's' && modified) {
				handleSave();
			}
		} else if (editingField) {
			if (key.escape) {
				cancelEditing();
			} else if (key.return) {
				finishEditing();
			}
		}
	});

	// Menu items (only if saveData is loaded)
	const menuItems = saveData ? [
		{ label: `💰 Money: $${getFieldValue('money')?.toLocaleString() || 0}`, value: 'money' },
		{ label: `⏱️  Game Time: ${formatTime(getFieldValue('elapsedSeconds'))}`, value: 'elapsedSeconds' },
		{ label: `🚆 Owned Trains: ${getFieldValue('ownedTrainCount')}`, value: 'ownedTrainCount' },
		{ label: `🎫 Transit Cost: $${getFieldValue('transitCost')?.toFixed(2) || 0}`, value: 'transitCost' },
	] : [];

	// Render states
	if (state === 'loading') {
		return <Text>Loading save file...</Text>;
	}

	if (state === 'error') {
		return (
			<Box flexDirection="column">
				<Text color="red">❌ Error: {error}</Text>
			</Box>
		);
	}

	if (state === 'saving') {
		return <Text>💾 Saving changes...</Text>;
	}

	if (state === 'success') {
		return (
			<Box flexDirection="column">
				<Text color="green">✅ Save file updated successfully!</Text>
				{createBackup && outputPath === saveFilePath && (
					<Text dimColor>Backup created at: {saveFilePath}.backup</Text>
				)}
			</Box>
		);
	}

	if (editingField) {
		return (
			<Box flexDirection="column">
				<Text bold>Editing {editingField}</Text>
				<Newline />
				<Box>
					<Text>New value: </Text>
					<TextInput
						value={editValue}
						onChange={setEditValue}
						onSubmit={finishEditing}
					/>
				</Box>
				<Newline />
				<Text dimColor>Press Enter to save, Esc to cancel</Text>
			</Box>
		);
	}

	return (
		<Box flexDirection="column" padding={1}>
			<Box borderStyle="round" borderColor="cyan" paddingX={2} paddingY={1} flexDirection="column">
				<Text bold color="cyan">🏥 Subway Builder Savefile Doctor</Text>
				<Text dimColor italic>"{metroQuote}"</Text>
			</Box>
			<Newline />

			<Box flexDirection="column">
				<Text dimColor>File: {saveFilePath}</Text>
				<Text dimColor>Format: {isMetroFormat ? '📦 .metro (binary)' : '📄 JSON'}</Text>
				<Text dimColor>Name: {saveData.name || 'Unnamed'}</Text>
				<Text dimColor>City: {saveData.cityCode || 'Unknown'}</Text>
				<Text dimColor>Stations: {saveData.data.stations?.length || 0} | Routes: {saveData.data.routes?.length || 0} | Trains: {saveData.data.trains?.length || 0}</Text>
			</Box>
			<Newline />

			<Text bold>Select a field to edit:</Text>
			<Newline />

			<SelectInput items={menuItems} onSelect={(item) => startEditing(item.value)} />

			<Newline />
			<Box flexDirection="column">
				<Text dimColor>• Use arrow keys to navigate</Text>
				<Text dimColor>• Press Enter to edit a field</Text>
				{modified && <Text color="yellow">• Press &apos;s&apos; to save changes</Text>}
				<Text dimColor>• Press &apos;q&apos; to quit{modified ? ' (without saving)' : ''}</Text>
			</Box>

			{modified && (
				<Box marginTop={1}>
					<Text color="yellow">⚠️  Unsaved changes!</Text>
				</Box>
			)}
		</Box>
	);
}

function formatTime(seconds) {
	if (!seconds) return '0s';
	const hours = Math.floor(seconds / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);
	const secs = Math.floor(seconds % 60);

	const parts = [];
	if (hours > 0) parts.push(`${hours}h`);
	if (minutes > 0) parts.push(`${minutes}m`);
	if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

	return parts.join(' ');
}
