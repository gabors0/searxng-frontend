<script lang="ts">
  import { DIGITS } from './clock-digits';
  import type { HourFormat } from './logo.svelte';

  const CELL_WIDTH = 118;
  const CELL_HEIGHT = 109;

  let { hours, class: className }: { hours: HourFormat; class?: string } = $props();

  let now = $state(new Date());

  const pad = (value: number) => String(value).padStart(2, '0');
  const hh = $derived(pad(hours === '12' ? now.getHours() % 12 || 12 : now.getHours()));
  const mm = $derived(pad(now.getMinutes()));

  $effect(() => {
    let timer: ReturnType<typeof setTimeout>;

    // Aims for the next minute rather than repeating every 60s, so the clock can't drift behind the real one.
    function tick() {
      clearTimeout(timer);
      // A local, because reading `now` here would make this effect re-run every time it writes `now`.
      const current = new Date();
      now = current;
      timer = setTimeout(tick, 60_000 - current.getSeconds() * 1000 - current.getMilliseconds());
    }

    // Browsers slow timers in background tabs, so the time can be stale when the tab comes back.
    function onVisibilityChange() {
      if (!document.hidden) tick();
    }

    tick();
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  });
</script>

<svg
  class={className}
  viewBox="0 0 {CELL_WIDTH * 2} {CELL_HEIGHT * 2}"
  width={CELL_WIDTH * 2}
  height={CELL_HEIGHT * 2}
  role="img"
  aria-label="gs0/searxng, {hh}:{mm}"
>
  {#each Array.from(hh + mm) as digit, index}
    <path
      d={DIGITS[Number(digit)]}
      transform="translate({(index % 2) * CELL_WIDTH} {Math.floor(index / 2) * CELL_HEIGHT})"
    />
  {/each}
</svg>
