<script lang="ts">
  import { saveData } from '../stores/save';
  import { showToast } from '../stores/ui';
  import {
    analyzeRoutes,
    analyzeOrphans,
    analyzeTrackCoverage,
    checkRouteCompleteness,
  } from '@metro-savefile-doctor/core';
  import NeonButton from './NeonButton.svelte';

  // Reactive analysis results
  $: routeResults = $saveData ? analyzeRoutes($saveData.data) : null;
  $: orphanResults = $saveData ? analyzeOrphans($saveData.data) : null;
  $: coverageResults = $saveData ? analyzeTrackCoverage($saveData.data) : null;
  $: completenessResults = $saveData ? checkRouteCompleteness($saveData.data) : null;

  function getReceiptText(): string {
    if (!routeResults || !orphanResults || !coverageResults || !completenessResults) return '';

    let text = `
╔══════════════════════════════════════╗
║      METRO SAVEFILE ANALYSIS         ║
╚══════════════════════════════════════╝

────────────── ROUTES ──────────────
  Total Routes:      ${String(routeResults.totalRoutes).padStart(6)}
  Total Trains:      ${String(routeResults.totalTrains).padStart(6)}`;

    if (routeResults.issues.routesWithNoPath.length > 0) {
      text += `\n  ⚠ No Path:         ${String(routeResults.issues.routesWithNoPath.length).padStart(6)}`;
    }
    if (routeResults.issues.inactiveRoutes.length > 0) {
      text += `\n  ⚠ Inactive:        ${String(routeResults.issues.inactiveRoutes.length).padStart(6)}`;
    }
    if (routeResults.issues.emptyRoutes.length > 0) {
      text += `\n  ⚠ Empty:           ${String(routeResults.issues.emptyRoutes.length).padStart(6)}`;
    }

    text += `

────────────── ORPHANS ─────────────
  Orphaned Tracks:   ${String(orphanResults.orphanedTrackCount).padStart(6)}
  Orphaned Stations: ${String(orphanResults.orphanedStationCount).padStart(6)}
  Track Groups:      ${String(orphanResults.trackGroupStats.totalGroups).padStart(6)}
  Fully Orphaned:    ${String(orphanResults.trackGroupStats.fullyOrphanedGroups).padStart(6)}

────────────── COVERAGE ────────────
  Total Tracks:      ${String(coverageResults.totalTracks).padStart(6)}
  In Routes:         ${String(coverageResults.tracksInRoutes).padStart(6)}
  Track Coverage:    ${String(coverageResults.trackCoveragePercent).padStart(5)}%

  Total Stations:    ${String(coverageResults.totalStations).padStart(6)}
  With Routes:       ${String(coverageResults.stationsWithRoutes).padStart(6)}
  Station Coverage:  ${String(coverageResults.stationCoveragePercent).padStart(5)}%

─────────── COMPLETENESS ───────────
  Complete Routes:   ${String(completenessResults.completeCount).padStart(6)}
  Incomplete:        ${String(completenessResults.incompleteCount).padStart(6)}`;

    if (routeResults.trainsByRoute.length > 0) {
      text += `\n\n─────────── TOP ROUTES ─────────────`;
      for (const item of routeResults.trainsByRoute.slice(0, 5)) {
        const name = (item.routeName || 'Unnamed').slice(0, 18).padEnd(18);
        text += `\n  ${name} ${String(item.count).padStart(4)} trains`;
      }
    }

    text += `

════════════════════════════════════════
  ANALYSIS COMPLETE
════════════════════════════════════════`;

    return text;
  }

  async function copyToClipboard() {
    const text = getReceiptText();
    await navigator.clipboard.writeText(text);
    showToast('Copied to clipboard!', 'success');
  }

  function fixOrphanedTracks() {
    if (!$saveData) return;

    // Get all track IDs that are in routes
    const tracksInRoutes = new Set<string>();
    for (const route of $saveData.data.routes || []) {
      for (const segment of route.path || []) {
        if (segment.trackId) tracksInRoutes.add(segment.trackId);
      }
    }

    // Filter out orphaned tracks
    const originalCount = $saveData.data.tracks?.length || 0;
    $saveData.data.tracks = ($saveData.data.tracks || []).filter(
      track => tracksInRoutes.has(track.id)
    );
    const removed = originalCount - ($saveData.data.tracks?.length || 0);

    // Trigger reactivity
    saveData.set($saveData);
    showToast(`Removed ${removed} orphaned tracks!`, 'success');
  }

  function fixEmptyRoutes() {
    if (!$saveData) return;

    const originalCount = $saveData.data.routes?.length || 0;
    $saveData.data.routes = ($saveData.data.routes || []).filter(
      route => (route.path?.length || 0) > 0 || (route.trains?.length || 0) > 0
    );
    const removed = originalCount - ($saveData.data.routes?.length || 0);

    // Update stats
    $saveData.stats.routes = $saveData.data.routes?.length || 0;

    // Trigger reactivity
    saveData.set($saveData);
    showToast(`Removed ${removed} empty routes!`, 'success');
  }
</script>

<div class="analysis-panel">
  <div class="actions">
    <NeonButton color="cyan" small on:click={copyToClipboard}>COPY</NeonButton>
    {#if orphanResults && orphanResults.orphanedTrackCount > 0}
      <NeonButton color="orange" small on:click={fixOrphanedTracks}>FIX ORPHANS</NeonButton>
    {/if}
    {#if routeResults && routeResults.issues.emptyRoutes.length > 0}
      <NeonButton color="orange" small on:click={fixEmptyRoutes}>FIX EMPTY</NeonButton>
    {/if}
  </div>

  <pre class="receipt">{getReceiptText()}</pre>
</div>

<style>
  .analysis-panel {
    background: var(--bg-panel);
    border: 1px solid var(--neon-green);
    padding: 16px;
    height: 100%;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
  }

  .actions {
    display: flex;
    gap: 8px;
    margin-bottom: 12px;
    flex-wrap: wrap;
  }

  .receipt {
    font-family: var(--font-terminal);
    font-size: 0.85rem;
    line-height: 1.3;
    color: var(--neon-green);
    text-shadow: 0 0 5px var(--neon-green);
    white-space: pre;
    margin: 0;
    flex: 1;
    overflow: auto;
  }
</style>
