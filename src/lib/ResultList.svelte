<script lang="ts">
  import { faviconUrl, resultImage, safeUrl, type SearchResult } from './searxng';

  let { results }: { results: SearchResult[] } = $props();

  // Icons and pictures that didn't load, by address, so a site without an icon is only asked once per list.
  let failed = $state.raw(new Set<string>());

  function markFailed(src: string) {
    failed = new Set(failed).add(src);
  }

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

<ol class="rise-in divide-y divide-line">
  {#each results as result, index (`${result.url}-${index}`)}
    {@const href = safeUrl(result.url)}
    {@const detail = formatDate(result.publishedDate) ?? result.metadata}
    {@const { host, path } = splitUrl(result.url)}
    {@const icon = faviconUrl(result.url)}
    {@const image = resultImage(result)}
    <li class="flex gap-4 py-4 first:pt-1">
      <div class="min-w-0 flex-1">
        <p class="flex items-center gap-[0.4rem] text-[0.85rem]">
          <!-- The icon's space stays when it's missing, so the hosts line up down the list. -->
          <span class="size-4 flex-none">
            {#if icon && !failed.has(icon)}
              <img
                class="block size-4"
                src={icon}
                alt=""
                loading="lazy"
                decoding="async"
                referrerpolicy="no-referrer"
                onerror={() => markFailed(icon)}
              />
            {/if}
          </span>
          <span class="truncate"
            ><span class="text-text">{host.replace(/^www\./, '')}</span><span class="text-muted">{path}</span></span
          >
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
      </div>
      {#if image && !failed.has(image)}
        <img
          class="h-20 w-28 flex-none bg-line object-cover max-sm:h-16 max-sm:w-20"
          src={image}
          alt=""
          loading="lazy"
          decoding="async"
          referrerpolicy="no-referrer"
          onerror={() => markFailed(image)}
        />
      {/if}
    </li>
  {/each}
</ol>
