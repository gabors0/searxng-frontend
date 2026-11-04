<script lang="ts">
  import type { Snippet } from 'svelte';
  import InfoTip from './InfoTip.svelte';

  // The title sits on the rule like the header's current tab, so result blocks read as part of the same line work.
  // action sits at the far end without padding, so a button there can underline itself on the rule.
  let {
    title,
    aside,
    action,
    info,
    danger = false,
  }: {
    title: string;
    aside?: Snippet;
    action?: Snippet;
    info?: { id: string; text: string };
    danger?: boolean;
  } = $props();
</script>

<div class="mb-3 flex items-end justify-between gap-4 border-b border-line-strong">
  <div class="flex min-w-0 items-baseline gap-[0.1rem]">
    <h2
      class={['-mb-px border-b-2 px-[0.1rem] py-1 font-semibold', danger ? 'border-danger text-danger' : 'border-accent']}
    >
      {title}
    </h2>
    {#if info}<InfoTip id={info.id} text={info.text} />{/if}
  </div>
  {#if aside}
    <div class="flex min-w-0 items-center gap-2 py-1 text-[0.8rem] text-muted">{@render aside()}</div>
  {/if}
  {@render action?.()}
</div>
