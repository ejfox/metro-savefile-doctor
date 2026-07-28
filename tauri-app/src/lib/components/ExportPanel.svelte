<script lang="ts">
  import { exportTo } from '../stores/save';
  import { showToast } from '../stores/ui';
  import type { ExportFormat } from '@metro-savefile-doctor/core';
  import NeonButton from './NeonButton.svelte';

  const formats: { id: ExportFormat; label: string; hint: string }[] = [
    { id: 'geojson', label: 'GEOJSON', hint: 'Map layers (geojson.io, QGIS)' },
    { id: 'kml', label: 'KML', hint: 'Google Earth' },
    { id: 'kmz', label: 'KMZ', hint: 'Google Earth (zipped)' },
    { id: 'csv-stations', label: 'STATIONS CSV', hint: 'Spreadsheet of stations' },
    { id: 'csv-routes', label: 'ROUTES CSV', hint: 'Spreadsheet of routes' },
    { id: 'csv-tracks', label: 'TRACKS CSV', hint: 'Spreadsheet of tracks' },
  ];

  let busy: ExportFormat | null = null;

  async function doExport(format: ExportFormat) {
    busy = format;
    try {
      const ok = await exportTo(format);
      if (ok) showToast(`Exported ${format.toUpperCase()}!`, 'success');
    } catch (err) {
      showToast(`Export failed: ${err}`, 'error');
    } finally {
      busy = null;
    }
  }
</script>

<div class="export-panel">
  <h3 class="panel-title">EXPORT</h3>
  <div class="grid">
    {#each formats as f}
      <div class="row">
        <NeonButton color="cyan" small on:click={() => doExport(f.id)}>
          {busy === f.id ? '...' : f.label}
        </NeonButton>
        <span class="hint">{f.hint}</span>
      </div>
    {/each}
  </div>
</div>

<style>
  .export-panel {
    background: var(--bg-panel);
    border: 1px solid var(--neon-cyan);
    padding: 16px;
  }

  .panel-title {
    font-family: var(--font-pixel);
    font-size: 0.65rem;
    color: var(--neon-cyan);
    text-shadow: 0 0 5px var(--neon-cyan);
    margin-bottom: 16px;
  }

  .grid {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .row {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .hint {
    font-family: var(--font-terminal);
    font-size: 0.8rem;
    color: var(--text-muted);
  }
</style>
