<script lang="ts">
  import { aiSummary } from './ai-summary.svelte';
  import CitedText from './CitedText.svelte';
  import { chosenEngines } from './engines.svelte';
  import {
    allSources,
    formatCost,
    formatDuration,
    MAX_FOLLOW_UPS,
    MAX_QUESTION_LENGTH,
    MODEL,
    sourcesFor,
    streamFollowUp,
    streamSummary,
    SummaryError,
    type FollowUp,
    type Source,
    type Summary,
    type WebSearch,
  } from './openrouter';
  import { search, type SearchResult } from './searxng';
  import { searchPrefs } from './search-prefs.svelte';
  import SectionTitle from './SectionTitle.svelte';
  import Spinner from './Spinner.svelte';
  import { cachedSummary, saveSummary } from './summary-cache';

  let { query, results }: { query: string; results: SearchResult[] } = $props();

  let text = $state('');
  let sources = $state.raw<Source[]>([]);
  let cutOff = $state(false);
  let cost = $state<number | undefined>(undefined);
  let duration = $state<number | undefined>(undefined);
  let failure = $state.raw<SummaryError | null>(null);
  let loading = $state(false);
  let attempt = $state(0);
  let starts = $state.raw<number[]>([]);

  let followUps = $state.raw<FollowUp[]>([]);
  // The follow-up being written, shown after the finished ones.
  // search.sources stays unset while the search runs.
  let pending = $state.raw<{
    question: string;
    text: string;
    search?: { query: string; sources?: WebSearch['sources'] };
  } | null>(null);
  let pendingStarts = $state.raw<number[]>([]);
  let followUpFailure = $state.raw<SummaryError | null>(null);
  let draft = $state('');
  let followUpController: AbortController | undefined;

  const shown = $derived(pending ? [...followUps, { ...pending, cutOff: false }] : followUps);
  // Every number the answers can cite, including results from follow-up searches.
  const citable = $derived([...allSources({ sources, followUps }), ...(pending?.search?.sources ?? [])]);
  const canAsk = $derived(Boolean(text) && !loading && !failure && followUps.length < MAX_FOLLOW_UPS);
  const totalCost = $derived(
    [cost, ...followUps.map((followUp) => followUp.cost)].reduce<number | undefined>(
      (sum, value) => (value === undefined ? sum : (sum ?? 0) + value),
      undefined,
    ),
  );

  function current(): Summary {
    return { text, sources, cutOff, cost, duration, followUps };
  }

  $effect(() => {
    const currentQuery = query;
    const currentResults = results;
    attempt;
    starts = [];
    failure = null;
    cutOff = false;
    cost = undefined;
    duration = undefined;
    pending = null;
    followUpFailure = null;
    draft = '';

    const cached = cachedSummary(currentQuery);
    if (cached) {
      ({ text, sources, cutOff, cost, duration } = cached);
      followUps = cached.followUps ?? [];
      loading = false;
      return () => followUpController?.abort();
    }

    const controller = new AbortController();
    text = '';
    sources = sourcesFor(currentResults);
    followUps = [];
    loading = true;
    streamSummary(currentQuery, currentResults, controller.signal, (partial) => {
        starts = [...starts, text.length];
        text = partial;
      }).then(
      (summary) => {
        saveSummary(currentQuery, summary, aiSummary.choice === 'on');
        cutOff = summary.cutOff;
        cost = summary.cost;
        duration = summary.duration;
        loading = false;
      },
      (error: SummaryError) => {
        if (controller.signal.aborted) return;
        failure = error;
        loading = false;
      },
    );
    return () => {
      controller.abort();
      followUpController?.abort();
    };
  });

  // Searches General with the same settings as the page, for a follow-up the results don't cover.
  async function webSearch(q: string, signal: AbortSignal): Promise<SearchResult[]> {
    const prefs = { ...searchPrefs, engines: chosenEngines.general?.slice() };
    const response = await search({ q, category: 'general', page: 1, time: 'any' }, prefs, signal);
    return response.results;
  }

  function ask(event: SubmitEvent) {
    event.preventDefault();
    const question = draft.trim();
    if (!question || !canAsk || pending) return;

    const currentQuery = query;
    const base = current();
    const controller = (followUpController = new AbortController());
    pending = { question, text: '' };
    pendingStarts = [];
    followUpFailure = null;
    draft = '';

    streamFollowUp(currentQuery, base, question, controller.signal, (partial) => {
      if (!pending) return;
      pendingStarts = [...pendingStarts, pending.text.length];
      pending = { ...pending, text: partial };
    }, (found) => {
      if (!pending) return;
      // The answer starts over after a search, so the fade-in does too.
      pendingStarts = [];
      pending = { ...pending, text: '', search: found };
    }, webSearch).then(
      (followUp) => {
        followUps = [...followUps, followUp];
        pending = null;
        saveSummary(currentQuery, current(), aiSummary.choice === 'on');
      },
      (error: SummaryError) => {
        if (controller.signal.aborted) return;
        followUpFailure = error;
        pending = null;
        // Puts the question back so it can be sent again.
        draft = question;
      },
    );
  }
</script>

<section aria-label="AI summary" aria-busy={loading || pending !== null}>
  <SectionTitle
    title="AI summary"
    info={{ id: 'ai-summary-info', text: 'Written by an AI from the result snippets, sent to OpenRouter. Follow-ups can run their own search. It can be wrong.' }}
  >
    {#snippet aside()}
      {#if loading || pending}
        <Spinner />
      {/if}
    {/snippet}
  </SectionTitle>

  {#if text}
    <CitedText {text} {sources} {starts} writing={loading} />
  {:else if loading}
    <p class="animate-pulse text-muted">Summarizing…</p>
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

  {#each shown as followUp, index (index)}
    {@const writing = pending !== null && index === followUps.length}
    <div class="mt-4">
      <!-- The question is the user's own text, rendered as text. -->
      <p class="mb-1 text-[0.9rem] font-semibold wrap-anywhere">{followUp.question}</p>
      {#if followUp.search}
        <!-- The model picks the query, so it renders as text too. -->
        <p class={['mb-1 text-[0.8rem] text-muted wrap-anywhere', !followUp.search.sources && 'animate-pulse']}>
          {followUp.search.sources ? 'Searched for' : 'Searching for'} “{followUp.search.query}”{followUp.search.sources && !followUp.search.sources.length ? ', with no new results' : ''}
        </p>
      {/if}
      {#if followUp.text}
        <CitedText text={followUp.text} sources={citable} starts={writing ? pendingStarts : []} {writing} />
      {:else if !followUp.search || followUp.search.sources}
        <p class="animate-pulse text-muted">Answering…</p>
      {/if}
      {#if followUp.cutOff}
        <p class="mt-[0.4rem] text-[0.8rem] text-muted">This answer was cut off before it finished.</p>
      {/if}
    </div>
  {/each}

  {#if followUpFailure}
    <p class={['mt-[0.4rem]', followUpFailure.canRetry ? 'text-danger' : 'text-muted']} role="alert">
      {followUpFailure.message}
    </p>
  {/if}

  {#if canAsk}
    <form class="mt-4 flex items-center gap-3" onsubmit={ask}>
      <input
        class="min-w-0 flex-1 border-b border-line-strong bg-transparent py-1 placeholder:text-muted focus:border-accent"
        type="text"
        bind:value={draft}
        maxlength={MAX_QUESTION_LENGTH}
        placeholder="Ask a follow-up"
        aria-label="Follow-up question"
        autocomplete="off"
        enterkeyhint="send"
        disabled={pending !== null}
      />
      <button type="submit" disabled={pending !== null || !draft.trim()}>Ask</button>
    </form>
  {:else if text && !loading && followUps.length >= MAX_FOLLOW_UPS}
    <p class="mt-4 text-[0.8rem] text-muted">That's the most follow-ups for one search. Search again to ask more.</p>
  {/if}

  <!-- The provider prefix is dropped; the full id is in the tooltip. -->
  <p class="mt-3 flex justify-between gap-4 border-t border-line pt-2 font-mono text-[0.8rem] text-muted">
    <span class="truncate" title={MODEL}>{MODEL.split('/').pop()}</span>
    <span class="flex flex-none gap-4">
      {#if duration !== undefined}
        <span title="Time the summary took">{formatDuration(duration)}</span>
      {/if}
      {#if totalCost !== undefined}
        <span title={followUps.length ? 'Cost of the summary and follow-ups' : 'Cost of this request'}
          >{formatCost(totalCost)}</span
        >
      {/if}
    </span>
  </p>
</section>
