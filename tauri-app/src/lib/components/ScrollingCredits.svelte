<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  const credits = [
    'METRO SAVEFILE DOCTOR v1.0',
    '---',
    'CODED BY EJFOX',
    '---',
    'TAURI + SVELTE + TYPESCRIPT',
    '---',
    'GREETS TO ALL METRO BUILDERS',
    '---',
    'DRAG & DROP YOUR .METRO FILE TO BEGIN',
  ];

  let offset = 0;
  const creditText = credits.join(' /// ');
  let interval: ReturnType<typeof setInterval>;

  onMount(() => {
    interval = setInterval(() => {
      offset = (offset + 1) % (creditText.length * 10);
    }, 40);
  });

  onDestroy(() => {
    if (interval) clearInterval(interval);
  });
</script>

<div class="credits-container">
  <div class="credits-track" style="transform: translateX(-{offset}px)">
    {creditText} /// {creditText}
  </div>
</div>

<style>
  .credits-container {
    overflow: hidden;
    width: 100%;
    background: var(--bg-panel);
    padding: 10px 0;
    border-top: 2px solid var(--neon-cyan);
  }

  .credits-track {
    white-space: nowrap;
    color: var(--neon-yellow);
    font-family: var(--font-pixel);
    font-size: 0.65rem;
    text-shadow: 0 0 5px var(--neon-yellow);
  }
</style>
