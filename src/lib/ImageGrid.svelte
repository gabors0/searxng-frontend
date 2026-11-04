<script lang="ts">
  import { safeUrl, type SearchResult } from './searxng';

  let { results }: { results: SearchResult[] } = $props();

  // Removing a tile whose thumbnail fails keeps the grid free of broken images.
  let failed = $state.raw(new Set<number>());

  $effect(() => {
    results;
    failed = new Set();
  });

  function markFailed(index: number) {
    failed = new Set(failed).add(index);
  }
</script>

<ul class="grid grid-cols-[repeat(auto-fill,minmax(10.5rem,1fr))] gap-x-[0.9rem] gap-y-[1.1rem]">
  {#each results as result, index (`${result.url}-${index}`)}
    {@const href = safeUrl(result.url)}
    {@const full = safeUrl(result.img_src)}
    {@const thumbnail = safeUrl(result.thumbnail_src) ?? full}
    {#if thumbnail && !failed.has(index)}
      <li class="min-w-0">
        <a
          class="block aspect-4/3 overflow-hidden rounded-[0.4rem] bg-line"
          href={href ?? full}
          rel="noreferrer"
          title={result.title}
        >
          <img
            class="block size-full object-cover"
            src={thumbnail}
            alt={result.title}
            loading="lazy"
            decoding="async"
            referrerpolicy="no-referrer"
            onerror={() => markFailed(index)}
          />
        </a>
        <p class="mt-1 truncate text-[0.85rem]">{result.title}</p>
        <p class="mt-1 flex justify-between gap-2 truncate text-xs/normal text-muted">
          <span class="min-w-0 truncate">{[result.resolution, result.source || result.engine].filter(Boolean).join(' · ')}</span>
          {#if full}<a class="flex-none" href={full} rel="noreferrer">Image</a>{/if}
        </p>
      </li>
    {/if}
  {/each}
</ul>
