<script lang="ts">
  import { saveData, fileName, fileFormat, resetSave } from '../stores/save';
  import { setView } from '../stores/ui';
  import { formatMoney } from '@metro-savefile-doctor/core';
  import NeonButton from './NeonButton.svelte';

  function handleClose() {
    resetSave();
    setView('dropzone');
  }
</script>

<div class="info-card">
  <div class="card-header">
    <span class="label">FILE</span>
    <span class="format-badge">{$fileFormat?.toUpperCase()}</span>
  </div>

  <h3 class="filename">{$fileName}</h3>

  {#if $saveData}
    <div class="stats-grid">
      <div class="stat">
        <span class="stat-label">CITY</span>
        <span class="stat-value">{$saveData.cityCode}</span>
      </div>
      <div class="stat">
        <span class="stat-label">NAME</span>
        <span class="stat-value">{$saveData.name}</span>
      </div>
      <div class="stat">
        <span class="stat-label">STATIONS</span>
        <span class="stat-value cyan">{$saveData.stats.stations}</span>
      </div>
      <div class="stat">
        <span class="stat-label">ROUTES</span>
        <span class="stat-value magenta">{$saveData.stats.routes}</span>
      </div>
      <div class="stat">
        <span class="stat-label">TRAINS</span>
        <span class="stat-value green">{$saveData.stats.trains}</span>
      </div>
      <div class="stat">
        <span class="stat-label">MONEY</span>
        <span class="stat-value yellow">{formatMoney($saveData.stats.money)}</span>
      </div>
    </div>
  {/if}

  <div class="actions">
    <NeonButton color="red" small on:click={handleClose}>CLOSE FILE</NeonButton>
  </div>
</div>

<style>
  .info-card {
    background: var(--bg-panel);
    border: 1px solid var(--neon-cyan);
    padding: 16px;
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .label {
    font-family: var(--font-pixel);
    font-size: 0.55rem;
    color: var(--text-dim);
  }

  .format-badge {
    font-family: var(--font-pixel);
    font-size: 0.5rem;
    background: var(--neon-cyan);
    color: var(--bg-dark);
    padding: 2px 6px;
  }

  .filename {
    font-family: var(--font-terminal);
    font-size: 1.2rem;
    color: var(--text-primary);
    margin-bottom: 16px;
    word-break: break-all;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-bottom: 16px;
  }

  .stat {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .stat-label {
    font-family: var(--font-pixel);
    font-size: 0.45rem;
    color: var(--text-dim);
  }

  .stat-value {
    font-family: var(--font-terminal);
    font-size: 1.1rem;
  }

  .stat-value.cyan {
    color: var(--neon-cyan);
  }
  .stat-value.magenta {
    color: var(--neon-magenta);
  }
  .stat-value.green {
    color: var(--neon-green);
  }
  .stat-value.yellow {
    color: var(--neon-yellow);
  }

  .actions {
    display: flex;
    justify-content: flex-end;
  }
</style>
