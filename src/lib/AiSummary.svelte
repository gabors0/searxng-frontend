<script lang="ts">
  import { aiSummary } from './ai-summary.svelte';
  import { linkCitations, sourcesFor, streamSummary, SummaryError, type Source } from './openrouter';
  import type { SearchResult } from './searxng';
  import { cachedSummary, saveSummary } from './summary-cache';

  let { query, results }: { query: string; results: SearchResult[] } = $props();

  let text = $state('');
  let sources = $state.raw<Source[]>([]);
  let cutOff = $state(false);
  let failure = $state.raw<SummaryError | null>(null);
  let loading = $state(false);
  let attempt = $state(0);

  const parts = $derived(linkCitations(text, sources));

  $effect(() => {
    const currentQuery = query;
    const currentResults = results;
    attempt;
    failure = null;
    cutOff = false;

    const cached = cachedSummary(currentQuery);
    if (cached) {
      ({ text, sources, cutOff } = cached);
      loading = false;
      return;
    }

    const controller = new AbortController();
    text = '';
    sources = sourcesFor(currentResults);
    loading = true;
    streamSummary(currentQuery, currentResults, controller.signal, (partial) => (text = partial)).then(
      (summary) => {
        saveSummary(currentQuery, summary, aiSummary.choice === 'on');
        cutOff = summary.cutOff;
        loading = false;
      },
      (error: SummaryError) => {
        if (controller.signal.aborted) return;
        failure = error;
        loading = false;
      },
    );
    return () => controller.abort();
  });
</script>

<section class="mb-4 rounded-lg border border-line bg-surface px-4 py-[0.8rem]" aria-label="AI summary" aria-busy={loading}>
  <p class="flex items-center gap-2 text-[0.8rem] text-muted">
    {#if loading}
      <span
        class="size-[0.8rem] flex-none animate-spin rounded-full border-2 border-line-strong border-t-accent [animation-duration:0.8s] motion-reduce:[animation-duration:3s]"
        aria-hidden="true"
      ></span>
    {/if}
    <span>AI summary of search snippets. It can be wrong.</span>
  </p>

  {#if text}
    <!-- Model output is untrusted: it only ever renders as text, plus links to real results. -->
    <p class="mt-[0.4rem] wrap-anywhere whitespace-pre-wrap">{#each parts as part}{#if 'href' in part}<a href={part.href} title={part.title} rel="noreferrer">{part.text}</a>{:else}{part.text}{/if}{/each}</p>
  {:else if loading}
    <p class="mt-[0.4rem] text-muted">Summarizing…</p>
  {/if}

  {#if cutOff}
    <p class="mt-[0.4rem] text-[0.8rem] text-muted">This summary was cut off before it finished.</p>
  {/if}

  {#if failure}
    <div class="mt-[0.4rem]" role="alert">
      <p class={[failure.canRetry ? 'text-danger' : 'text-muted', failure.canRetry && 'mb-3']}>{failure.message}</p>
      {#if failure.canRetry}
        <button type="button" onclick={() => (attempt += 1)}>Try again</button>
      {/if}
    </div>
  {/if}
</section>
