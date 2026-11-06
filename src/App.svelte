<script lang="ts">
  import { onMount } from 'svelte';
  import logoBlack from './assets/logo-black.svg';
  import logoWhite from './assets/logo-white.svg';
  import { aiSummary } from './lib/ai-summary.svelte';
  import AiSummary from './lib/AiSummary.svelte';
  import AiToggle from './lib/AiToggle.svelte';
  import { chosenEngines } from './lib/engines.svelte';
  import EnginesPage from './lib/EnginesPage.svelte';
  import ImageGrid from './lib/ImageGrid.svelte';
  import InfoboxCard from './lib/InfoboxCard.svelte';
  import { logo } from './lib/logo.svelte';
  import LogoClock from './lib/LogoClock.svelte';
  import LogoSetting from './lib/LogoSetting.svelte';
  import ResultList from './lib/ResultList.svelte';
  import { searchPrefs } from './lib/search-prefs.svelte';
  import SearchBox from './lib/SearchBox.svelte';
  import SearchSettings from './lib/SearchSettings.svelte';
  import SectionTitle from './lib/SectionTitle.svelte';
  import Spinner from './lib/Spinner.svelte';
  import ThemeSetting from './lib/ThemeSetting.svelte';
  import { CATEGORIES, hrefFor, readRoute, searchText, TIME_RANGES, wantsSummary, type Route } from './lib/route';
  import { search, type SearchResponse } from './lib/searxng';
  import { cachedSummary } from './lib/summary-cache';
  import { underline } from './lib/underline';

  const initial = readRoute(location.search);
  let route = $state.raw(initial);
  let input = $state(initial.q);
  // The engines page has its own path. Everything else is the search page, described by the query string.
  let view = $state<'search' | 'engines'>(location.pathname === '/engines' ? 'engines' : 'search');
  // The category travels with the response so the layout only switches once it arrives.
  let shown = $state.raw<{ route: Route; response: SearchResponse } | null>(null);
  let error = $state<string | null>(null);
  let loading = $state(false);
  let attempt = $state(0);
  let inputElement = $state<HTMLInputElement>();

  // Comparing routes ends a summary as soon as a new search starts, while the old results are still on screen.
  const canSummarize = $derived(
    shown?.route === route &&
      route.category === 'general' &&
      route.page === 1 &&
      // Summaries are cached by query alone, so a filtered search would show the unfiltered one.
      route.time === 'any' &&
      shown.response.results.length > 0,
  );
  const summarize = $derived(
    canSummarize &&
      (aiSummary.choice === 'on' ||
        wantsSummary(route.q) ||
        cachedSummary(searchText(route.q)) !== undefined),
  );

  $effect(() => {
    const current = route;
    const prefs = {
      safesearch: searchPrefs.safesearch,
      language: searchPrefs.language,
      engines: chosenEngines[current.category]?.slice(),
    };
    const onEngines = view === 'engines';
    attempt;
    document.title = onEngines ? 'Engines - Search' : current.q ? `${current.q} - Search` : 'Search';
    error = null;

    if (onEngines || !current.q) {
      shown = null;
      loading = false;
      return;
    }

    const controller = new AbortController();
    loading = true;
    search({ ...current, q: searchText(current.q) }, prefs, controller.signal).then(
      (response) => {
        shown = { route: current, response };
        loading = false;
      },
      (failure: Error) => {
        if (controller.signal.aborted) return;
        shown = null;
        error = failure.message;
        loading = false;
      },
    );
    return () => controller.abort();
  });

  onMount(() => {
    if (!route.q) inputElement?.focus();
  });

  function navigate(next: Route) {
    const href = hrefFor(next);
    if (href === location.pathname + location.search) {
      attempt += 1;
    } else {
      history.pushState(null, '', href);
    }
    view = 'search';
    route = next;
    // Picking a tab before searching must not wipe what's been typed.
    if (next.q) input = next.q;
    scrollTo(0, 0);
  }

  // Plain clicks stay in the app. Modified clicks keep their new-tab behaviour.
  function isPlainClick(event: MouseEvent): boolean {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
    event.preventDefault();
    return true;
  }

  function follow(event: MouseEvent, next: Route) {
    if (isPlainClick(event)) navigate(next);
  }

  function openEngines(event: MouseEvent) {
    if (!isPlainClick(event)) return;
    history.pushState(null, '', '/engines');
    view = 'engines';
    scrollTo(0, 0);
  }

  function submit(event: SubmitEvent) {
    event.preventDefault();
    const q = input.trim();
    // A lone "-" has nothing to search for, so it goes back to the start page like an empty box.
    navigate({ ...route, q: searchText(q) ? q : '', page: 1 });
  }

  const pageStep =
    '-mb-px flex w-11 items-center justify-center border-b-2 border-transparent font-bold text-accent no-underline hover:border-accent';

  function onPopState() {
    view = location.pathname === '/engines' ? 'engines' : 'search';
    route = readRoute(location.search);
    input = route.q;
  }
</script>

<svelte:window onpopstate={onPopState} />

{#snippet queryLink(q: string)}
  {@const next = { ...route, q, page: 1 }}
  <a
    class="no-underline decoration-accent decoration-2 underline-offset-4 hover:underline"
    href={hrefFor(next)}
    onclick={(event) => follow(event, next)}>{q}</a
  >
{/snippet}

<div class="mx-auto max-w-304 px-4 pt-4 pb-12">
  <!-- relative so the search suggestions can span the whole header on a thin screen. -->
  <header class="relative grid grid-cols-[auto_minmax(0,1fr)_auto] items-center sm:flex">
    {#if logo.style === 'clock'}
      <LogoClock class="mr-4 h-11 w-auto flex-none fill-black dark:fill-white" hours={logo.hours} />
    {:else}
      <img class="mr-4 h-11 w-auto flex-none dark:hidden" src={logoBlack} alt="gs0/searxng" width="236" height="218" />
      <img
        class="mr-4 hidden h-11 w-auto flex-none dark:block"
        src={logoWhite}
        alt="gs0/searxng"
        width="236"
        height="218"
      />
    {/if}
    <!--
      The input, tabs and button share one box model so their text lines up and accents sit on the line.
      Below sm the form dissolves into the header's grid: logo, input and button, then the tabs at full width.
    -->
    <form
      class="flex min-h-11 min-w-0 flex-1 border-b border-line-strong max-sm:contents"
      role="search"
      action="/"
      method="get"
      onsubmit={submit}
    >
      <SearchBox bind:value={input} bind:element={inputElement} onpick={(q) => navigate({ ...route, q, page: 1 })} />
      <nav
        class="slide-underline relative flex gap-5 max-sm:col-span-full max-sm:row-start-2 max-sm:mt-1 max-sm:min-h-11 max-sm:border-b max-sm:border-line-strong"
        aria-label="Categories"
        use:underline={route.category}
      >
        {#each CATEGORIES as { id, label } (id)}
          {@const next = { ...route, category: id, page: 1 }}
          <a
            class="-mb-px flex items-center border-b-2 border-transparent px-[0.1rem] text-muted no-underline aria-[current=page]:font-semibold aria-[current=page]:text-text"
            href={hrefFor(next)}
            aria-current={route.category === id ? 'page' : undefined}
            onclick={(event) => follow(event, next)}>{label}</a
          >
        {/each}
      </nav>
      <!-- Fixed width so the tabs don't shift when the weight changes on the first keystroke. -->
      <button
        class={[
          '-mb-px w-11 flex-none rounded-none border-0 border-b-2 border-transparent bg-transparent p-0 max-sm:col-start-3 max-sm:row-start-1 max-sm:mb-0 max-sm:h-11 max-sm:border-b max-sm:border-line-strong sm:ml-3',
          input.trim() ? 'font-bold text-accent hover:border-accent' : 'text-muted',
        ]}
        type="submit"
        aria-label="Search">&gt;&gt;&gt;</button
      >
    </form>
  </header>

  <!-- The AI switch sits under the logo on every page, with the search progress beside it. The header, this line,
    the time ranges and the results are spaced evenly, 0.75rem apart. -->
  <div class="my-3 flex items-center gap-5 text-sm/normal text-muted">
    <AiToggle />
    <div class="flex min-w-0 items-center gap-2" role="status">
      {#if loading}
        <Spinner />
        <span>Searching…</span>
      {/if}
    </div>
  </div>

  <main class="transition-opacity duration-200" class:opacity-55={loading}>
    {#if view === 'search' && route.q}
      <nav
        class="slide-underline relative mb-3 flex flex-wrap gap-x-4 gap-y-1 text-sm/normal"
        aria-label="Time range"
        use:underline={route.time}
      >
        {#each TIME_RANGES as { id, label } (id)}
          {@const next = { ...route, time: id, page: 1 }}
          <a
            class="border-b-2 border-transparent px-[0.1rem] text-muted no-underline hover:text-text aria-[current=true]:font-semibold aria-[current=true]:text-text"
            href={hrefFor(next)}
            aria-current={route.time === id ? 'true' : undefined}
            onclick={(event) => follow(event, next)}>{label}</a
          >
        {/each}
      </nav>
    {/if}
    {#if view === 'engines'}
      <EnginesPage onback={(event) => follow(event, { q: '', category: 'general', page: 1, time: 'any' })} />
    {:else if !route.q}
      <div class="flex flex-col gap-3">
        <ThemeSetting />
        <LogoSetting />
        <SearchSettings />
        <div class="flex w-fit items-baseline gap-4 border-b border-line-strong">
          <span class="text-text">Engines</span>
          <a class="-mb-px border-b-2 border-transparent px-[0.1rem] py-1 font-semibold text-accent no-underline hover:border-accent" href="/engines" onclick={openEngines}
            >{Object.keys(chosenEngines).length ? 'Customized' : 'Server default'} &gt;&gt;&gt;</a
          >
        </div>
      </div>
    {:else if error}
      <div class="max-w-184" role="alert">
        <SectionTitle title="Search failed" danger />
        <p class="mb-2">{error}</p>
        <div class="flex gap-5">
          <button type="button" onclick={() => (attempt += 1)}>Try again</button>
          <button type="button" onclick={() => location.reload()}>Reload page</button>
        </div>
      </div>
    {:else if shown}
      {@const { response } = shown}
      {@const isImages = shown.route.category === 'images'}
      <!-- Each response is drawn afresh, so its results rise in even when they match the last ones. -->
      {#key response}

      {#if response.corrections.length}
        <p class="mb-4 text-muted">
          Did you mean
          {#each response.corrections as correction, index}
            {#if index > 0},{/if}
            {@render queryLink(correction)}
          {/each}?
        </p>
      {/if}

      <div
        class="grid gap-6 min-[66rem]:has-[aside]:grid-cols-[minmax(0,46rem)_minmax(0,22rem)] min-[66rem]:has-[aside]:justify-between"
      >
        <div class={['min-w-0', !isImages && 'max-w-184']}>
          {#each response.answers as answer}
            <section class="appear mb-8" aria-label="Answer">
              <SectionTitle title="Answer">
                {#snippet aside()}<span class="truncate">{answer.engine}</span>{/snippet}
              </SectionTitle>
              <p class="font-serif text-[1.2rem] wrap-anywhere">{answer.answer}</p>
            </section>
          {/each}

          {#if response.results.length === 0}
            <p class="mb-4">
              {shown.route.page > 1 ? 'No more results' : 'No results'} for “{response.query}”.
            </p>
          {:else if isImages}
            <ImageGrid results={response.results} />
          {:else}
            <ResultList results={response.results} />
          {/if}
        </div>

        <!--
          The side column holds the summary and infoboxes. Below the two-column width it dissolves into the grid,
          lifting the summary and then the infoboxes above the results, so a thin screen opens on the overview.
        -->
        {#if summarize || response.infoboxes.length}
          <aside class="rise-in flex min-w-0 flex-col gap-8 max-[66rem]:contents">
            {#if summarize}
              <div class="max-[66rem]:order-first max-[66rem]:max-w-184">
                <AiSummary query={searchText(shown.route.q)} results={response.results} />
              </div>
            {/if}
            {#each response.infoboxes as infobox}
              <div class="min-w-0 max-[66rem]:order-first max-[66rem]:max-w-184">
                <InfoboxCard {infobox} />
              </div>
            {/each}
          </aside>
        {/if}
      </div>

      {#if response.suggestions.length}
        <section class="appear mt-8" aria-label="Suggested searches">
          <SectionTitle title="Related searches" />
          <ul class="flex flex-wrap gap-x-5 gap-y-[0.4rem]">
            {#each response.suggestions as suggestion}
              <li>{@render queryLink(suggestion)}</li>
            {/each}
          </ul>
        </section>
      {/if}

      {#if shown.route.page > 1 || response.results.length}
        {@const previous = { ...shown.route, page: shown.route.page - 1 }}
        {@const following = { ...shown.route, page: shown.route.page + 1 }}
        <!-- The header's line and arrows again: the current page sits on the rule like a tab, unavailable steps stay gray. -->
        <nav class="mt-8 flex min-h-11 gap-3 border-b border-line-strong" aria-label="Pages">
          {#if shown.route.page > 1}
            <a
              class={pageStep}
              rel="prev"
              aria-label="Previous page"
              href={hrefFor(previous)}
              onclick={(event) => follow(event, previous)}>&lt;&lt;&lt;</a
            >
          {:else}
            <span class="flex w-11 items-center justify-center text-muted" aria-hidden="true">&lt;&lt;&lt;</span>
          {/if}
          <span class="-mb-px flex items-center border-b-2 border-accent px-[0.1rem] font-semibold" aria-current="page"
            >Page {shown.route.page}</span
          >
          {#if response.results.length}
            <a
              class={pageStep}
              rel="next"
              aria-label="Next page"
              href={hrefFor(following)}
              onclick={(event) => follow(event, following)}>&gt;&gt;&gt;</a
            >
          {:else}
            <span class="flex w-11 items-center justify-center text-muted" aria-hidden="true">&gt;&gt;&gt;</span>
          {/if}
        </nav>
      {/if}

      {#if response.unresponsive_engines.length}
        <p class="mt-6 text-[0.8rem] text-muted">
          No response from
          {response.unresponsive_engines.map(([engine, reason]) => `${engine} (${reason})`).join(', ')}.
        </p>
      {/if}
      {/key}
    {/if}
  </main>
</div>
