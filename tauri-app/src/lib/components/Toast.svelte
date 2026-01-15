<script lang="ts">
  import { toastMessage } from '../stores/ui';
</script>

{#if $toastMessage.message}
  <div class="toast" class:success={$toastMessage.type === 'success'} class:error={$toastMessage.type === 'error'}>
    {$toastMessage.message}
  </div>
{/if}

<style>
  .toast {
    position: fixed;
    bottom: 80px;
    left: 50%;
    transform: translateX(-50%);
    background: var(--bg-panel);
    border: 2px solid var(--neon-cyan);
    color: var(--text-primary);
    padding: 12px 24px;
    font-family: var(--font-terminal);
    font-size: 1.1rem;
    z-index: 1000;
    box-shadow: 0 0 20px var(--neon-cyan);
    animation: slideUp 0.3s ease;
  }

  .toast.success {
    border-color: var(--neon-green);
    box-shadow: 0 0 20px var(--neon-green);
  }

  .toast.error {
    border-color: var(--neon-red);
    box-shadow: 0 0 20px var(--neon-red);
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateX(-50%) translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  }
</style>
