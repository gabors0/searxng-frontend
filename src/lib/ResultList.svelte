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

<ol class="grid gap-[1.4rem]">
  {#each results as result, index (`${result.url}-${index}`)}
    {@const href = safeUrl(result.url)}
    {@const detail = formatDate(result.publishedDate) ?? result.metadata}
    <li>
      <h2 class="text-[1.1rem] leading-[1.3] font-medium">
        {#if href}
          <a {href} rel="noreferrer">{result.title || displayUrl(result.url)}</a>
        {:else}
          {result.title}
        {/if}
      </h2>
      <p class="mt-[0.15rem] text-[0.85rem] wrap-anywhere text-success">{displayUrl(result.url)}</p>
      {#if result.content}
        <p class="mt-[0.3rem] wrap-anywhere">{result.content}</p>
      {/if}
      <p class="mt-[0.15rem] text-[0.8rem] wrap-anywhere text-muted">
        {[detail, result.engines.length ? result.engines.join(', ') : result.engine].filter(Boolean).join(' · ')}
      </p>
    </li>
  {/each}
</ol>
