<script lang="ts">
  import { onMount } from 'svelte';
  import ImageGrid from './lib/ImageGrid.svelte';
  import InfoboxCard from './lib/InfoboxCard.svelte';
  import ResultList from './lib/ResultList.svelte';
  import { CATEGORIES, hrefFor, readRoute, type Route } from './lib/route';
  import { search, type SearchResponse } from './lib/searxng';

  const initial = readRoute(location.search);
  let route = $state.raw(initial);
  let input = $state(initial.q);
  // The category travels with the response so the layout only switches once it arrives.
  let shown = $state.raw<{ route: Route; response: SearchResponse } | null>(null);
  let error = $state<string | null>(null);
  let loading = $state(false);
  let attempt = $state(0);
  let inputElement: HTMLInputElement;
  const home = $derived(!route.q);

  $effect(() => {
    const current = route;
    attempt;
    document.title = current.q ? `${current.q} - Search` : 'Search';
    error = null;

    if (!current.q) {
      shown = null;
      loading = false;
      return;
    }

    const controller = new AbortController();
    loading = true;
    search(current, controller.signal).then(
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
    if (!route.q) inputElement.focus();
  });

  function navigate(next: Route) {
    const href = hrefFor(next);
    if (href === location.pathname + location.search) {
      attempt += 1;
    } else {
      history.pushState(null, '', href);
    }
    route = next;
    input = next.q;
    scrollTo(0, 0);
  }

  // Plain clicks stay in the app. Modified clicks keep their new-tab behaviour.
  function follow(event: MouseEvent, next: Route) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }
    event.preventDefault();
    navigate(next);
  }

  function submit(event: SubmitEvent) {
    event.preventDefault();
    navigate({ q: input.trim(), category: route.category, page: 1 });
  }

  function onPopState() {
    route = readRoute(location.search);
    input = route.q;
  }
</script>

<svelte:window onpopstate={onPopState} />

{#snippet queryLink(q: string)}
  {@const next = { q, category: route.category, page: 1 }}
  <a href={hrefFor(next)} onclick={(event) => follow(event, next)}>{q}</a>
{/snippet}

<div class={['mx-auto max-w-304 px-4 pt-4 pb-12', home && 'flex min-h-[70vh] flex-col justify-center']}>
  <header
    class={[
      'flex flex-wrap',
      home ? 'mx-auto w-full max-w-152 flex-col items-stretch gap-5' : 'items-center gap-x-4 gap-y-2',
    ]}
  >
    <p class={['font-serif', home ? 'text-center text-4xl/normal' : 'text-xl/normal']}>gs0/searxng</p>
    <form
      class={['flex gap-2', home ? 'flex-none' : 'max-w-176 flex-[1_1_18rem]']}
      role="search"
      action="/"
      method="get"
      onsubmit={submit}
    >
      <input
        class="min-w-0 flex-1 rounded-lg border border-line-strong bg-surface px-[0.8rem] py-[0.6rem]"
        bind:this={inputElement}
        bind:value={input}
        type="search"
        name="q"
        aria-label="Search query"
        placeholder="Search the web"
        autocomplete="off"
        enterkeyhint="search"
      />
      <button type="submit">Search</button>
    </form>
  </header>

  {#if route.q}
    <nav class="mt-3 flex gap-5 border-b border-line" aria-label="Categories">
      {#each CATEGORIES as { id, label } (id)}
        {@const next = { q: route.q, category: id, page: 1 }}
        <a
          class="-mb-px border-b-2 border-transparent px-[0.1rem] py-[0.45rem] text-muted no-underline aria-[current=page]:border-accent aria-[current=page]:font-semibold aria-[current=page]:text-text"
          href={hrefFor(next)}
          aria-current={route.category === id ? 'page' : undefined}
          onclick={(event) => follow(event, next)}>{label}</a
        >
      {/each}
    </nav>

    <div class="flex min-h-7 items-center gap-2 text-sm/normal text-muted" role="status">
      {#if loading}
        <span
          class="size-[0.8rem] animate-spin rounded-full border-2 border-line-strong border-t-accent [animation-duration:0.8s] motion-reduce:[animation-duration:3s]"
          aria-hidden="true"
        ></span>
        <span>Searching…</span>
      {/if}
    </div>

    <main class:opacity-55={loading}>
      {#if error}
        <div class="max-w-184 rounded-lg border border-danger px-4 py-[0.8rem]" role="alert">
          <p class="mb-3">{error}</p>
          <button type="button" onclick={() => (attempt += 1)}>Try again</button>
          <button type="button" onclick={() => location.reload()}>Reload page</button>
        </div>
      {:else if shown}
        {@const { response } = shown}
        {@const isImages = shown.route.category === 'images'}

        {#if response.corrections.length}
          <p class="mb-4">
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
              <p class="mb-4 rounded-lg border border-line bg-surface px-4 py-[0.8rem] font-[550]">{answer.answer}</p>
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

          {#if response.infoboxes.length}
            <aside>
              {#each response.infoboxes as infobox}
                <InfoboxCard {infobox} />
              {/each}
            </aside>
          {/if}
        </div>

        {#if response.suggestions.length}
          <section class="mt-8" aria-label="Suggested searches">
            <h2 class="mb-2 text-[0.95rem] font-bold">Related searches</h2>
            <ul class="flex flex-wrap gap-x-4 gap-y-[0.4rem]">
              {#each response.suggestions as suggestion}
                <li>{@render queryLink(suggestion)}</li>
              {/each}
            </ul>
          </section>
        {/if}

        {#if shown.route.page > 1 || response.results.length}
          {@const previous = { ...shown.route, page: shown.route.page - 1 }}
          {@const following = { ...shown.route, page: shown.route.page + 1 }}
          <nav class="mt-8 flex items-center gap-4 text-muted" aria-label="Pages">
            {#if shown.route.page > 1}
              <a rel="prev" href={hrefFor(previous)} onclick={(event) => follow(event, previous)}>Previous</a>
            {/if}
            <span>Page {shown.route.page}</span>
            {#if response.results.length}
              <a rel="next" href={hrefFor(following)} onclick={(event) => follow(event, following)}>Next</a>
            {/if}
          </nav>
        {/if}

        {#if response.unresponsive_engines.length}
          <p class="mt-6 text-[0.8rem] text-muted">
            No response from
            {response.unresponsive_engines.map(([engine, reason]) => `${engine} (${reason})`).join(', ')}.
          </p>
        {/if}
      {/if}
    </main>
  {/if}
</div>
