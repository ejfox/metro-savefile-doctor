<script lang="ts">
  export let color: 'cyan' | 'magenta' | 'green' | 'orange' | 'red' = 'cyan';
  export let disabled = false;
  export let small = false;

  const colorMap: Record<string, string> = {
    cyan: 'var(--neon-cyan)',
    magenta: 'var(--neon-magenta)',
    green: 'var(--neon-green)',
    orange: 'var(--neon-orange)',
    red: 'var(--neon-red)',
  };
</script>

<button
  class="neon-button"
  class:disabled
  class:small
  style="--btn-color: {colorMap[color]}"
  {disabled}
  on:click
>
  <slot />
</button>

<style>
  .neon-button {
    background: transparent;
    border: 2px solid var(--btn-color);
    color: var(--btn-color);
    padding: 12px 24px;
    font-family: var(--font-pixel);
    font-size: 0.65rem;
    cursor: pointer;
    text-transform: uppercase;
    position: relative;
    transition: all 0.2s ease;
    box-shadow: 0 0 5px var(--btn-color), inset 0 0 5px transparent;
  }

  .neon-button.small {
    padding: 8px 16px;
    font-size: 0.55rem;
  }

  .neon-button:hover:not(.disabled) {
    background: var(--btn-color);
    color: var(--bg-dark);
    box-shadow: 0 0 20px var(--btn-color), 0 0 40px var(--btn-color),
      inset 0 0 10px var(--btn-color);
  }

  .neon-button:active:not(.disabled) {
    transform: scale(0.98);
  }

  .neon-button.disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
</style>
