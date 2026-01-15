<script lang="ts">
  import { onDestroy } from 'svelte';
  import { open } from '@tauri-apps/plugin-dialog';
  import { readFile, copyFile } from '@tauri-apps/plugin-fs';
  import { parseMetroBuffer, parseJsonSave, isMetroFormat } from '@metro-savefile-doctor/core';
  import { loadSave } from '../stores/save';
  import { setView, showToast } from '../stores/ui';
  import NeonButton from './NeonButton.svelte';

  let isDragging = false;
  let isLoading = false;
  let dropzone: HTMLElement;
  let loadingPhase = 0;
  let loadingInterval: ReturnType<typeof setInterval> | null = null;
  let glitchText = '';

  const loadingPhrases = [
    'READING BINARY...',
    'DECOMPRESSING DATA...',
    'PARSING ROUTES...',
    'ANALYZING TRAINS...',
    'MAPPING STATIONS...',
    'DECRYPTING SAVE...',
    'BYPASSING CRC...',
    'INJECTING CODE...',
  ];

  const glitchChars = '!@#$%^&*()_+-=[]{}|;:,.<>?░▒▓█▀▄';

  function startLoadingAnimation() {
    loadingPhase = 0;
    loadingInterval = setInterval(() => {
      loadingPhase = (loadingPhase + 1) % loadingPhrases.length;
      // Generate random glitch text
      glitchText = Array.from({ length: 20 }, () =>
        glitchChars[Math.floor(Math.random() * glitchChars.length)]
      ).join('');
    }, 200);
  }

  function stopLoadingAnimation() {
    if (loadingInterval) {
      clearInterval(loadingInterval);
      loadingInterval = null;
    }
  }

  onDestroy(() => stopLoadingAnimation());

  // Handle browser native drag-drop (works when Tauri dragDropEnabled: false)
  function handleDragEnter(e: DragEvent) {
    e.preventDefault();
    isDragging = true;
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
  }

  function handleDragLeave(e: DragEvent) {
    e.preventDefault();
    // Only set to false if we're leaving the dropzone entirely
    if (e.relatedTarget === null || !dropzone.contains(e.relatedTarget as Node)) {
      isDragging = false;
    }
  }

  async function handleDrop(e: DragEvent) {
    e.preventDefault();
    isDragging = false;

    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    console.log('File dropped:', file.name);
    await loadFileFromBrowser(file);
  }

  async function loadFileFromBrowser(file: File) {
    isLoading = true;
    startLoadingAnimation();
    try {
      const arrayBuffer = await file.arrayBuffer();

      // Add artificial delay for the cool animation
      await new Promise(r => setTimeout(r, 1200));

      let data;
      let format: 'metro' | 'json';

      if (isMetroFormat(arrayBuffer)) {
        data = parseMetroBuffer(arrayBuffer);
        format = 'metro';
      } else {
        const text = new TextDecoder().decode(arrayBuffer);
        data = parseJsonSave(text);
        format = 'json';
      }

      // Use filename since we don't have full path from browser drag-drop
      loadSave(data, file.name, format);
      setView('editor');
      showToast('Save file loaded successfully!', 'success');
    } catch (err) {
      console.error('Failed to load file:', err);
      showToast(`Failed to load file: ${err}`, 'error');
    } finally {
      stopLoadingAnimation();
      isLoading = false;
    }
  }

  async function loadFileFromPath(path: string) {
    isLoading = true;
    startLoadingAnimation();
    try {
      // Auto-backup the original file
      const bakPath = path + '.bak';
      try {
        await copyFile(path, bakPath);
        showToast('Original backed up to .bak', 'info');
      } catch (e) {
        // Backup might fail on first load, that's ok
      }

      const buffer = await readFile(path);

      // Add artificial delay for the cool animation
      await new Promise(r => setTimeout(r, 1200));

      const arrayBuffer = buffer.buffer.slice(
        buffer.byteOffset,
        buffer.byteOffset + buffer.byteLength
      );

      let data;
      let format: 'metro' | 'json';

      if (isMetroFormat(arrayBuffer)) {
        data = parseMetroBuffer(arrayBuffer);
        format = 'metro';
      } else {
        const text = new TextDecoder().decode(buffer);
        data = parseJsonSave(text);
        format = 'json';
      }

      loadSave(data, path, format);
      setView('editor');
      showToast('Save file loaded successfully!', 'success');
    } catch (err) {
      console.error('Failed to load file:', err);
      showToast(`Failed to load file: ${err}`, 'error');
    } finally {
      stopLoadingAnimation();
      isLoading = false;
    }
  }

  async function handleBrowse() {
    const selected = await open({
      multiple: false,
      filters: [
        {
          name: 'Save Files',
          extensions: ['metro', 'json'],
        },
      ],
    });

    if (selected) {
      await loadFileFromPath(selected);
    }
  }
</script>

<div
  class="dropzone"
  class:dragging={isDragging}
  class:loading={isLoading}
  bind:this={dropzone}
  on:dragenter={handleDragEnter}
  on:dragover={handleDragOver}
  on:dragleave={handleDragLeave}
  on:drop={handleDrop}
>
  <div class="dropzone-content">
    {#if isLoading}
      <div class="loading-container">
        <div class="file-icon shake">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
            <path d="M14 2v6h6" />
            <path d="M12 18v-6" />
            <path d="M9 15h6" />
          </svg>
        </div>
        <div class="glitch-text">{glitchText}</div>
        <div class="loading-text glow">{loadingPhrases[loadingPhase]}</div>
        <div class="progress-bar">
          <div class="progress-fill"></div>
        </div>
        <div class="hex-stream">
          {Array.from({length: 32}, () => Math.floor(Math.random()*256).toString(16).padStart(2,'0')).join(' ')}
        </div>
      </div>
    {:else}
      <div class="icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M12 3v12m0 0l-4-4m4 4l4-4" />
          <path d="M3 15v4a2 2 0 002 2h14a2 2 0 002-2v-4" />
        </svg>
      </div>
      <h2 class="title">DROP SAVEFILE HERE</h2>
      <p class="subtitle">.metro or .json format</p>
      <div class="divider">--- OR ---</div>
      <NeonButton color="cyan" on:click={handleBrowse}>BROWSE FILES</NeonButton>
    {/if}
  </div>

  <div class="corner tl"></div>
  <div class="corner tr"></div>
  <div class="corner bl"></div>
  <div class="corner br"></div>
</div>

<style>
  .dropzone {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    border: 2px dashed var(--neon-cyan);
    background: var(--bg-panel);
    transition: all 0.3s ease;
  }

  .dropzone.dragging {
    border-color: var(--neon-magenta);
    background: rgba(255, 0, 255, 0.1);
    box-shadow: 0 0 30px var(--neon-magenta), inset 0 0 30px rgba(255, 0, 255, 0.1);
  }

  .dropzone.loading {
    border-color: var(--neon-yellow);
  }

  .dropzone-content {
    text-align: center;
    padding: 40px;
  }

  .icon {
    width: 80px;
    height: 80px;
    margin: 0 auto 20px;
    color: var(--neon-cyan);
    animation: glow 2s ease-in-out infinite;
  }

  .icon svg {
    width: 100%;
    height: 100%;
  }

  .title {
    font-family: var(--font-pixel);
    font-size: 1rem;
    color: var(--neon-cyan);
    text-shadow: 0 0 10px var(--neon-cyan);
    margin-bottom: 10px;
  }

  .subtitle {
    font-family: var(--font-terminal);
    font-size: 1.2rem;
    color: var(--text-dim);
    margin-bottom: 20px;
  }

  .divider {
    font-family: var(--font-terminal);
    color: var(--text-muted);
    margin: 20px 0;
  }

  .loading-container {
    text-align: center;
  }

  .file-icon {
    width: 80px;
    height: 80px;
    margin: 0 auto 20px;
    color: var(--neon-magenta);
  }

  .file-icon svg {
    width: 100%;
    height: 100%;
  }

  .file-icon.shake {
    animation: shake 0.1s infinite, colorCycle 0.5s infinite;
  }

  @keyframes shake {
    0%, 100% { transform: translateX(0) rotate(0deg); }
    25% { transform: translateX(-5px) rotate(-2deg); }
    50% { transform: translateX(5px) rotate(2deg); }
    75% { transform: translateX(-3px) rotate(-1deg); }
  }

  @keyframes colorCycle {
    0% { color: var(--neon-magenta); }
    33% { color: var(--neon-cyan); }
    66% { color: var(--neon-green); }
    100% { color: var(--neon-magenta); }
  }

  .glitch-text {
    font-family: monospace;
    font-size: 1.2rem;
    color: var(--neon-red);
    text-shadow: 0 0 10px var(--neon-red);
    margin-bottom: 10px;
    letter-spacing: 2px;
    opacity: 0.7;
  }

  .loading-text {
    font-family: var(--font-pixel);
    font-size: 0.8rem;
    color: var(--neon-yellow);
    text-shadow: 0 0 10px var(--neon-yellow);
    margin-bottom: 15px;
  }

  .progress-bar {
    width: 200px;
    height: 8px;
    background: var(--bg-input);
    border: 1px solid var(--neon-cyan);
    margin: 0 auto 15px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--neon-cyan), var(--neon-magenta), var(--neon-green));
    background-size: 200% 100%;
    animation: progressAnim 0.5s infinite linear, progressMove 2s infinite;
  }

  @keyframes progressAnim {
    0% { width: 0%; }
    50% { width: 100%; }
    100% { width: 0%; }
  }

  @keyframes progressMove {
    0% { background-position: 0% 0%; }
    100% { background-position: 200% 0%; }
  }

  .hex-stream {
    font-family: monospace;
    font-size: 0.7rem;
    color: var(--neon-green);
    opacity: 0.5;
    word-break: break-all;
    max-width: 300px;
    margin: 0 auto;
  }

  .corner {
    position: absolute;
    width: 20px;
    height: 20px;
    border-color: var(--neon-cyan);
    border-style: solid;
  }

  .tl { top: 10px; left: 10px; border-width: 2px 0 0 2px; }
  .tr { top: 10px; right: 10px; border-width: 2px 2px 0 0; }
  .bl { bottom: 10px; left: 10px; border-width: 0 0 2px 2px; }
  .br { bottom: 10px; right: 10px; border-width: 0 2px 2px 0; }

  .dragging .corner {
    border-color: var(--neon-magenta);
  }
</style>
