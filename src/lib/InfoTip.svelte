<script lang="ts">
  // A small "i" that reveals a note on hover or keyboard focus. Screen readers get the note as its description.
  let { id, text }: { id: string; text: string } = $props();

  // Touch screens have no hover, so a tap toggles the note too. Leaving the button or pressing Escape closes it.
  let open = $state(false);
</script>

<span class="relative inline-flex">
  <button
    class={[
      'peer flex flex-none cursor-help items-center border-0 px-[0.4rem] py-1 font-mono text-[0.9rem]/none hover:text-accent focus-visible:text-accent',
      open ? 'text-accent' : 'text-muted',
    ]}
    type="button"
    aria-label="More information"
    aria-describedby={id}
    onclick={() => (open = !open)}
    onblur={() => (open = false)}
    onkeydown={(event) => {
      if (event.key === 'Escape') open = false;
    }}>i</button
  >
  <span
    {id}
    role="tooltip"
    class={[
      'absolute top-full left-0 z-10 mt-2 w-max max-w-[min(16rem,calc(100vw-9rem))] border border-line-strong bg-surface px-3 py-2 text-[0.8rem]/normal font-normal text-text transition-opacity',
      open
        ? 'visible opacity-100'
        : 'invisible opacity-0 peer-hover:visible peer-hover:opacity-100 peer-focus-visible:visible peer-focus-visible:opacity-100',
    ]}>{text}</span
  >
</span>
