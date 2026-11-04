<script lang="ts">
  import { safeUrl, type SearchResult } from './searxng';

  let { results }: { results: SearchResult[] } = $props();

  function formatDate(value: string | null): string | undefined {
    if (!value) return undefined;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return undefined;
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function displayUrl(url: string): string {
    return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
  }

  // The host leads in full text colour so the site is readable at a glance; the path trails off muted.
  function splitUrl(url: string): { host: string; path: string } {
    const shown = displayUrl(url);
    const slash = shown.indexOf('/');
    return slash === -1 ? { host: shown, path: '' } : { host: shown.slice(0, slash), path: shown.slice(slash) };
  }
</script>

<ol class="divide-y divide-line">
  {#each results as result, index (`${result.url}-${index}`)}
    {@const href = safeUrl(result.url)}
    {@const detail = formatDate(result.publishedDate) ?? result.metadata}
    {@const { host, path } = splitUrl(result.url)}
    <li class="py-4 first:pt-1">
      <p class="truncate text-[0.85rem]">
        <span class="text-text">{host.replace(/^www\./, '')}</span><span class="text-muted">{path}</span>
      </p>
      <h2 class="mt-[0.1rem] text-[1.1rem] leading-[1.3] font-medium">
        {#if href}
          <a
            class="no-underline decoration-accent decoration-2 underline-offset-4 hover:underline"
            {href}
            rel="noreferrer">{result.title || displayUrl(result.url)}</a
          >
        {:else}
          {result.title}
        {/if}
      </h2>
      {#if result.content}
        <p class="mt-[0.3rem] wrap-anywhere">{result.content}</p>
      {/if}
      <p class="mt-[0.3rem] text-[0.8rem] wrap-anywhere text-muted">
        {[detail, result.engines.length ? result.engines.join(', ') : result.engine].filter(Boolean).join(' · ')}
      </p>
    </li>
  {/each}
</ol>
