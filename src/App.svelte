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

<div class="page" class:home={!route.q}>
  <header>
    <a class="brand" href="/" onclick={(event) => follow(event, { q: '', category: 'general', page: 1 })}>Search</a>
    <form role="search" action="/" method="get" onsubmit={submit}>
      <input
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
    <nav class="tabs" aria-label="Categories">
      {#each CATEGORIES as { id, label } (id)}
        {@const next = { q: route.q, category: id, page: 1 }}
        <a
          href={hrefFor(next)}
          aria-current={route.category === id ? 'page' : undefined}
          onclick={(event) => follow(event, next)}>{label}</a
        >
      {/each}
    </nav>

    <div class="status" role="status">
      {#if loading}
        <span class="progress" aria-hidden="true"></span>
        <span>Searching…</span>
      {/if}
    </div>

    <main class:stale={loading}>
      {#if error}
        <div class="error" role="alert">
          <p>{error}</p>
          <button type="button" onclick={() => (attempt += 1)}>Try again</button>
          <button type="button" onclick={() => location.reload()}>Reload page</button>
        </div>
      {:else if shown}
        {@const { response } = shown}
        {@const isImages = shown.route.category === 'images'}

        {#if response.corrections.length}
          <p class="hint">
            Did you mean
            {#each response.corrections as correction, index}
              {#if index > 0},{/if}
              {@render queryLink(correction)}
            {/each}?
          </p>
        {/if}

        <div class="columns" class:wide={isImages}>
          <div class="primary">
            {#each response.answers as answer}
              <p class="answer">{answer.answer}</p>
            {/each}

            {#if response.results.length === 0}
              <p class="empty">
                {shown.route.page > 1 ? 'No more results' : 'No results'} for “{response.query}”.
              </p>
            {:else if isImages}
              <ImageGrid results={response.results} />
            {:else}
              <ResultList results={response.results} />
            {/if}
          </div>

          {#if response.infoboxes.length}
            <aside class="secondary">
              {#each response.infoboxes as infobox}
                <InfoboxCard {infobox} />
              {/each}
            </aside>
          {/if}
        </div>

        {#if response.suggestions.length}
          <section class="suggestions" aria-label="Suggested searches">
            <h2>Related searches</h2>
            <ul>
              {#each response.suggestions as suggestion}
                <li>{@render queryLink(suggestion)}</li>
              {/each}
            </ul>
          </section>
        {/if}

        {#if shown.route.page > 1 || response.results.length}
          {@const previous = { ...shown.route, page: shown.route.page - 1 }}
          {@const following = { ...shown.route, page: shown.route.page + 1 }}
          <nav class="pagination" aria-label="Pages">
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
          <p class="note">
            No response from
            {response.unresponsive_engines.map(([engine, reason]) => `${engine} (${reason})`).join(', ')}.
          </p>
        {/if}
      {/if}
    </main>
  {/if}
</div>

<style>
  .page {
    max-width: 76rem;
    margin: 0 auto;
    padding: 1rem 1rem 3rem;
  }

  .page.home {
    display: flex;
    flex-direction: column;
    justify-content: center;
    min-height: 70vh;
  }

  header {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem 1rem;
  }

  .home header {
    flex-direction: column;
    align-items: stretch;
    width: 100%;
    max-width: 38rem;
    margin: 0 auto;
    gap: 1.25rem;
  }

  .brand {
    color: var(--text);
    font-size: 1.25rem;
    font-weight: 650;
    letter-spacing: -0.02em;
    text-decoration: none;
  }

  .home .brand {
    font-size: 2.25rem;
    text-align: center;
  }

  form {
    display: flex;
    flex: 1 1 18rem;
    gap: 0.5rem;
    max-width: 44rem;
  }

  .home form {
    flex: none;
    max-width: none;
  }

  input {
    flex: 1;
    min-width: 0;
    padding: 0.6rem 0.8rem;
    border: 1px solid var(--line-strong);
    border-radius: 0.5rem;
    background: var(--surface);
    color: var(--text);
    font: inherit;
  }

  .tabs {
    display: flex;
    gap: 1.25rem;
    margin-top: 0.75rem;
    border-bottom: 1px solid var(--line);
  }

  .tabs a {
    padding: 0.45rem 0.1rem;
    border-bottom: 2px solid transparent;
    margin-bottom: -1px;
    color: var(--muted);
    text-decoration: none;
  }

  .tabs a[aria-current='page'] {
    border-color: var(--accent);
    color: var(--text);
    font-weight: 600;
  }

  .status {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-height: 1.75rem;
    color: var(--muted);
    font-size: 0.875rem;
  }

  .progress {
    width: 0.8rem;
    height: 0.8rem;
    border: 2px solid var(--line-strong);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .progress {
      animation-duration: 3s;
    }
  }

  main.stale {
    opacity: 0.55;
  }

  .columns {
    display: grid;
    gap: 1.5rem;
  }

  .primary {
    min-width: 0;
    max-width: 46rem;
  }

  .wide .primary {
    max-width: none;
  }

  @media (min-width: 66rem) {
    .columns:has(.secondary) {
      grid-template-columns: minmax(0, 46rem) minmax(0, 22rem);
      justify-content: space-between;
    }
  }

  .answer {
    margin: 0 0 1rem;
    padding: 0.8rem 1rem;
    border: 1px solid var(--line);
    border-radius: 0.5rem;
    background: var(--surface);
    font-weight: 550;
  }

  .hint,
  .empty {
    margin: 0 0 1rem;
  }

  .suggestions {
    margin-top: 2rem;
  }

  .suggestions h2 {
    margin: 0 0 0.5rem;
    font-size: 0.95rem;
  }

  .suggestions ul {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem 1rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .pagination {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-top: 2rem;
    color: var(--muted);
  }

  .note {
    margin: 1.5rem 0 0;
    color: var(--muted);
    font-size: 0.8rem;
  }

  .error {
    max-width: 46rem;
    padding: 0.8rem 1rem;
    border: 1px solid var(--danger);
    border-radius: 0.5rem;
  }

  .error p {
    margin: 0 0 0.75rem;
  }
</style>
