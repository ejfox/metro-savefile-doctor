/**
 * Save Data Store - Svelte 4 version
 */

import { writable, derived, get } from 'svelte/store';
import { writeFile, copyFile } from '@tauri-apps/plugin-fs';
import { save as saveDialog } from '@tauri-apps/plugin-dialog';
import { serializeMetroSave, serializeJsonSave } from '@metro-savefile-doctor/core';
import type { MetroSaveData } from '@metro-savefile-doctor/core';

export const filePath = writable<string | null>(null);
export const fileName = writable<string | null>(null);
export const fileFormat = writable<'metro' | 'json' | null>(null);

export const saveData = writable<MetroSaveData | null>(null);
export const originalData = writable<MetroSaveData | null>(null);

// Derived store for modification check
export const isModified = derived(
  [saveData, originalData],
  ([$saveData, $originalData]) => {
    if (!$saveData || !$originalData) return false;
    return JSON.stringify($saveData) !== JSON.stringify($originalData);
  }
);

// Action functions
export function loadSave(data: MetroSaveData, path: string, format: 'metro' | 'json') {
  saveData.set(data);
  originalData.set(JSON.parse(JSON.stringify(data)));
  filePath.set(path);
  fileName.set(path.split('/').pop() ?? path.split('\\').pop() ?? 'Unknown');
  fileFormat.set(format);
}

export function updateMoney(value: number) {
  saveData.update(s => {
    if (s) {
      s.data.money = value;
      s.stats.money = value;
    }
    return s;
  });
}

export function updateElapsedTime(value: number) {
  saveData.update(s => {
    if (s) s.data.elapsedSeconds = value;
    return s;
  });
}

export function updateTrainCount(value: number) {
  saveData.update(s => {
    if (s) {
      s.data.ownedTrainCount = value;
      s.stats.trains = value;
    }
    return s;
  });
}

export function markSaved() {
  saveData.subscribe(s => {
    if (s) originalData.set(JSON.parse(JSON.stringify(s)));
  })();
}

export function resetSave() {
  saveData.set(null);
  originalData.set(null);
  filePath.set(null);
  fileName.set(null);
  fileFormat.set(null);
}

// Getter functions for QuickEditPanel
let currentSaveData: MetroSaveData | null = null;
saveData.subscribe(v => currentSaveData = v);

export function getMoney(): number {
  return currentSaveData?.data.money ?? 0;
}

export function getElapsedTime(): number {
  return currentSaveData?.data.elapsedSeconds ?? 0;
}

export function getTrainCount(): number {
  return currentSaveData?.data.ownedTrainCount ?? 0;
}

// Save to file function
export const isSaving = writable(false);

export async function saveToFile(): Promise<boolean> {
  const data = get(saveData);
  const path = get(filePath);
  const format = get(fileFormat);

  if (!data) return false;

  isSaving.set(true);
  try {
    let savePath = path;

    // If path doesn't look like a full path (just a filename), prompt for location
    if (!savePath || (!savePath.startsWith('/') && !savePath.includes(':'))) {
      const defaultName = savePath || `${data.name || 'save'}.${format || 'metro'}`;
      savePath = await saveDialog({
        defaultPath: defaultName,
        filters: [
          { name: 'Metro Save', extensions: ['metro'] },
          { name: 'JSON Save', extensions: ['json'] },
        ],
      });
      if (!savePath) {
        isSaving.set(false);
        return false; // User cancelled
      }
    } else {
      // Create backup for existing file
      const backupPath = savePath + '.backup';
      try {
        await copyFile(savePath, backupPath);
      } catch {
        // Backup may fail if file doesn't exist yet, that's ok
      }
    }

    // Determine format from path extension
    const saveFormat = savePath.endsWith('.json') ? 'json' : 'metro';

    // Serialize and write
    let fileData: Uint8Array;
    if (saveFormat === 'metro') {
      const buffer = serializeMetroSave(data);
      fileData = new Uint8Array(buffer);
    } else {
      const json = serializeJsonSave(data);
      fileData = new TextEncoder().encode(json);
    }

    await writeFile(savePath, fileData);
    markSaved();
    return true;
  } catch (err) {
    console.error('Failed to save:', err);
    throw err;
  } finally {
    isSaving.set(false);
  }
}
