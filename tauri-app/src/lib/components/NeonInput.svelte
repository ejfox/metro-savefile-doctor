<script lang="ts">
  export let value: string = '';
  export let type: 'text' | 'number' = 'text';
  export let placeholder: string = '';
</script>

{#if type === 'number'}
  <input class="neon-input" type="number" {placeholder} bind:value />
{:else}
  <input class="neon-input" type="text" {placeholder} bind:value />
{/if}

<style>
  .neon-input {
    flex: 1;
    background: var(--bg-input);
    border: 1px solid var(--neon-cyan);
    color: var(--text-primary);
    padding: 8px 12px;
    font-family: var(--font-terminal);
    font-size: 1rem;
    transition: all 0.2s ease;
  }

  .neon-input:focus {
    outline: none;
    border-color: var(--neon-magenta);
    box-shadow: 0 0 10px var(--neon-magenta);
  }

  .neon-input::placeholder {
    color: var(--text-muted);
  }

  /* Hide number input spinners */
  .neon-input[type='number']::-webkit-inner-spin-button,
  .neon-input[type='number']::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  .neon-input[type='number'] {
    -moz-appearance: textfield;
  }
</style>
