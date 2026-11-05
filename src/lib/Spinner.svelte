<script lang="ts">
  import { onMount } from 'svelte';

  // The `pulse` spinner from cli-loaders (github.com/agilek/cli-loaders), via unicode-animations.
  const FRAMES = ['⠀⠶⠀', '⠰⣿⠆', '⢾⣉⡷', '⣏⠀⣹', '⡁⠀⢈'];
  const INTERVAL = 180;
  const REDUCED_INTERVAL = 700;

  let frame = $state(0);

  onMount(() => {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let timer: ReturnType<typeof setInterval>;
    const start = () => {
      clearInterval(timer);
      timer = setInterval(() => (frame = (frame + 1) % FRAMES.length), reduced.matches ? REDUCED_INTERVAL : INTERVAL);
    };
    start();
    reduced.addEventListener('change', start);
    return () => {
      clearInterval(timer);
      reduced.removeEventListener('change', start);
    };
  });
</script>

<span class="flex-none font-mono text-sm/none whitespace-pre text-accent" aria-hidden="true">{FRAMES[frame]}</span>
