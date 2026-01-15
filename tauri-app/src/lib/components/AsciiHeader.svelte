<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  const asciiArt = `
 ███╗   ███╗███████╗████████╗██████╗  ██████╗
 ████╗ ████║██╔════╝╚══██╔══╝██╔══██╗██╔═══██╗
 ██╔████╔██║█████╗     ██║   ██████╔╝██║   ██║
 ██║╚██╔╝██║██╔══╝     ██║   ██╔══██╗██║   ██║
 ██║ ╚═╝ ██║███████╗   ██║   ██║  ██║╚██████╔╝
 ╚═╝     ╚═╝╚══════╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝
    ╔═══════════════════════════════════╗
    ║   S A V E F I L E   D O C T O R   ║
    ╚═══════════════════════════════════╝`;

  const colors = ['var(--neon-cyan)', 'var(--neon-magenta)', 'var(--neon-green)'];
  let colorIndex = 0;
  let interval: ReturnType<typeof setInterval>;

  onMount(() => {
    interval = setInterval(() => {
      colorIndex = (colorIndex + 1) % colors.length;
    }, 2000);
  });

  onDestroy(() => {
    if (interval) clearInterval(interval);
  });
</script>

<pre
  class="ascii-header"
  style="color: {colors[colorIndex]}; text-shadow: 0 0 10px {colors[colorIndex]};"
>{asciiArt}</pre>

<style>
  .ascii-header {
    font-family: monospace;
    font-size: 0.55rem;
    line-height: 1.15;
    text-align: center;
    transition: color 1s ease, text-shadow 1s ease;
    user-select: none;
    white-space: pre;
  }
</style>
