<script lang="ts">
  import AsciiHeader from './lib/components/AsciiHeader.svelte';
  import ScrollingCredits from './lib/components/ScrollingCredits.svelte';
  import DropZone from './lib/components/DropZone.svelte';
  import QuickEditPanel from './lib/components/QuickEditPanel.svelte';
  import AnalysisPanel from './lib/components/AnalysisPanel.svelte';
  import SaveInfoCard from './lib/components/SaveInfoCard.svelte';
  import Toast from './lib/components/Toast.svelte';
  import { currentView, showToast } from './lib/stores/ui';
  import { isModified, isSaving, saveToFile } from './lib/stores/save';

  async function handleSave() {
    try {
      const success = await saveToFile();
      if (success) {
        showToast('Save file written successfully!', 'success');
      }
    } catch (err) {
      showToast(`Failed to save: ${err}`, 'error');
    }
  }
</script>

<main class="app scanlines">
  <header>
    <AsciiHeader />
  </header>

  <div class="content">
    {#if $currentView === 'dropzone'}
      <DropZone />
    {:else}
      <div class="panels">
        <aside class="sidebar">
          <SaveInfoCard />
          <QuickEditPanel />
        </aside>
        <section class="main-panel">
          <AnalysisPanel />
        </section>
      </div>
    {/if}
  </div>

  {#if $currentView === 'editor'}
    <div class="save-bar" class:modified={$isModified}>
      <button class="save-button" class:saving={$isSaving} on:click={handleSave} disabled={$isSaving}>
        {#if $isSaving}
          <span class="save-icon spin">⟳</span> SAVING...
        {:else if $isModified}
          <span class="save-icon pulse">●</span> SAVE CHANGES
        {:else}
          <span class="save-icon">✓</span> EXPORT FILE
        {/if}
      </button>
      {#if $isModified}
        <span class="modified-badge">UNSAVED</span>
      {/if}
    </div>
  {/if}

  <footer>
    <ScrollingCredits />
  </footer>

  <Toast />
</main>

<style>
  .app {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--bg-dark);
  }

  header {
    flex-shrink: 0;
    padding: 10px 20px;
    border-bottom: 1px solid var(--bg-panel);
  }

  .content {
    flex: 1;
    padding: 20px;
    overflow: hidden;
  }

  .panels {
    display: grid;
    grid-template-columns: 320px 1fr;
    gap: 20px;
    height: 100%;
  }

  .sidebar {
    display: flex;
    flex-direction: column;
    gap: 16px;
    overflow-y: auto;
  }

  .main-panel {
    overflow-y: auto;
  }

  footer {
    flex-shrink: 0;
  }

  /* Sticky Save Bar */
  .save-bar {
    position: fixed;
    bottom: 50px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px;
    background: var(--bg-panel);
    border: 2px solid var(--neon-cyan);
    box-shadow: 0 0 20px rgba(0, 255, 255, 0.3);
    z-index: 100;
    transition: all 0.3s ease;
  }

  .save-bar.modified {
    border-color: var(--neon-orange);
    box-shadow: 0 0 30px rgba(255, 165, 0, 0.5), 0 0 60px rgba(255, 165, 0, 0.2);
    animation: urgentPulse 1s infinite;
  }

  @keyframes urgentPulse {
    0%, 100% { transform: translateX(-50%) scale(1); }
    50% { transform: translateX(-50%) scale(1.02); }
  }

  .save-button {
    background: transparent;
    border: 2px solid var(--neon-magenta);
    color: var(--neon-magenta);
    padding: 12px 32px;
    font-family: var(--font-pixel);
    font-size: 0.7rem;
    cursor: pointer;
    text-transform: uppercase;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .save-button:hover:not(:disabled) {
    background: var(--neon-magenta);
    color: var(--bg-dark);
    box-shadow: 0 0 20px var(--neon-magenta);
  }

  .save-button:disabled {
    opacity: 0.7;
    cursor: wait;
  }

  .save-button.saving {
    border-color: var(--neon-yellow);
    color: var(--neon-yellow);
  }

  .save-icon {
    font-size: 1rem;
  }

  .save-icon.pulse {
    animation: iconPulse 0.5s infinite;
    color: var(--neon-orange);
  }

  .save-icon.spin {
    animation: iconSpin 1s infinite linear;
  }

  @keyframes iconPulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }

  @keyframes iconSpin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .modified-badge {
    background: var(--neon-orange);
    color: var(--bg-dark);
    padding: 4px 8px;
    font-family: var(--font-pixel);
    font-size: 0.5rem;
    animation: badgeBlink 0.5s infinite;
  }

  @keyframes badgeBlink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
  }
</style>
