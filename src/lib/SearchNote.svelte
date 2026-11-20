<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { Source } from './openrouter';

  // A search the model ran for the summary or a follow-up. sources stays unset while it runs.
  // link renders the query as a link to the same search on this page.
  let { query, sources, link }: { query: string; sources?: Source[]; link: Snippet<[string]> } = $props();

  const found = $derived(
    !sources ? '' : !sources.length ? 'no new results' : sources.length === 1 ? '1 new result' : `${sources.length} new results`,
  );
</script>

<div class={['mb-2 border-l-2 border-line-strong pl-2 text-[0.8rem]', !sources && 'animate-pulse']}>
  <p class="font-mono text-muted">{sources ? `searched · ${found}` : 'searching…'}</p>
  <!-- The model picks the query, so it renders as text. -->
  <p class="wrap-anywhere">{@render link(query)}</p>
</div>
