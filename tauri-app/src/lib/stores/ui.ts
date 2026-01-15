/**
 * UI State Store - Svelte 4 version
 */

import { writable } from 'svelte/store';

export type View = 'dropzone' | 'editor';

export const currentView = writable<View>('dropzone');
export const toastMessage = writable<{ message: string | null; type: 'info' | 'success' | 'error' }>({
  message: null,
  type: 'info',
});

let toastTimeout: ReturnType<typeof setTimeout> | null = null;

export function showToast(message: string, type: 'info' | 'success' | 'error' = 'info', duration = 3000) {
  if (toastTimeout) clearTimeout(toastTimeout);
  toastMessage.set({ message, type });
  toastTimeout = setTimeout(() => {
    toastMessage.set({ message: null, type: 'info' });
  }, duration);
}

export function setView(view: View) {
  currentView.set(view);
}
