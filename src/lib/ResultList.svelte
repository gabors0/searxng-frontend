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
</script>

<ol>
  {#each results as result, index (`${result.url}-${index}`)}
    {@const href = safeUrl(result.url)}
    {@const detail = formatDate(result.publishedDate) ?? result.metadata}
    <li>
      <h2>
        {#if href}
          <a {href} rel="noreferrer">{result.title || displayUrl(result.url)}</a>
        {:else}
          {result.title}
        {/if}
      </h2>
      <p class="url">{displayUrl(result.url)}</p>
      {#if result.content}
        <p class="content">{result.content}</p>
      {/if}
      <p class="meta">
        {[detail, result.engines.length ? result.engines.join(', ') : result.engine].filter(Boolean).join(' · ')}
      </p>
    </li>
  {/each}
</ol>

<style>
  ol {
    display: grid;
    gap: 1.4rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  h2 {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 500;
    line-height: 1.3;
  }

  p {
    margin: 0.15rem 0 0;
    overflow-wrap: anywhere;
  }

  .url {
    color: var(--success);
    font-size: 0.85rem;
  }

  .content {
    margin-top: 0.3rem;
  }

  .meta {
    color: var(--muted);
    font-size: 0.8rem;
  }
</style>
