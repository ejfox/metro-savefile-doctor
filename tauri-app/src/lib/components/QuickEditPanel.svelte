<script lang="ts">
  import {
    saveData,
    getMoney,
    getElapsedTime,
    getTrainCount,
    updateMoney,
    updateElapsedTime,
    updateTrainCount,
  } from '../stores/save';
  import { showToast } from '../stores/ui';
  import { formatMoney, formatTime } from '@metro-savefile-doctor/core';
  import NeonButton from './NeonButton.svelte';
  import NeonInput from './NeonInput.svelte';

  let moneyInput = '';
  let timeInput = '';
  let trainInput = '';

  // Initialize inputs when save data changes
  $: if ($saveData) {
    moneyInput = String(getMoney());
    timeInput = String(getElapsedTime());
    trainInput = String(getTrainCount());
  }

  function applyMoney() {
    const value = parseInt(moneyInput, 10);
    if (!isNaN(value) && value >= 0) {
      updateMoney(value);
      showToast('Money updated!', 'success');
    }
  }

  function applyTime() {
    const value = parseInt(timeInput, 10);
    if (!isNaN(value) && value >= 0) {
      updateElapsedTime(value);
      showToast('Time updated!', 'success');
    }
  }

  function applyTrains() {
    const value = parseInt(trainInput, 10);
    if (!isNaN(value) && value >= 0) {
      updateTrainCount(value);
      showToast('Train count updated!', 'success');
    }
  }
</script>

<div class="edit-panel">
  <h3 class="panel-title">QUICK EDIT</h3>

  <div class="field">
    <label class="field-label">MONEY</label>
    <div class="field-row">
      <NeonInput bind:value={moneyInput} type="number" placeholder="0" />
      <NeonButton color="green" small on:click={applyMoney}>SET</NeonButton>
    </div>
    <span class="field-hint">{formatMoney(parseInt(moneyInput) || 0)}</span>
  </div>

  <div class="field">
    <label class="field-label">ELAPSED TIME (seconds)</label>
    <div class="field-row">
      <NeonInput bind:value={timeInput} type="number" placeholder="0" />
      <NeonButton color="green" small on:click={applyTime}>SET</NeonButton>
    </div>
    <span class="field-hint">{formatTime(parseInt(timeInput) || 0)}</span>
  </div>

  <div class="field">
    <label class="field-label">TRAIN COUNT</label>
    <div class="field-row">
      <NeonInput bind:value={trainInput} type="number" placeholder="0" />
      <NeonButton color="green" small on:click={applyTrains}>SET</NeonButton>
    </div>
  </div>
</div>

<style>
  .edit-panel {
    background: var(--bg-panel);
    border: 1px solid var(--neon-magenta);
    padding: 16px;
  }

  .panel-title {
    font-family: var(--font-pixel);
    font-size: 0.65rem;
    color: var(--neon-magenta);
    text-shadow: 0 0 5px var(--neon-magenta);
    margin-bottom: 16px;
  }

  .field {
    margin-bottom: 16px;
  }

  .field-label {
    display: block;
    font-family: var(--font-pixel);
    font-size: 0.5rem;
    color: var(--text-dim);
    margin-bottom: 6px;
  }

  .field-row {
    display: flex;
    gap: 8px;
  }

  .field-hint {
    display: block;
    font-family: var(--font-terminal);
    font-size: 0.9rem;
    color: var(--text-muted);
    margin-top: 4px;
  }
</style>
