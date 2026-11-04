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
        <!-- Square tiles with the header's accent underline on hover. -->
        <a
          class="group block border-b-2 border-transparent hover:border-accent focus-visible:border-accent"
          href={href ?? full}
          rel="noreferrer"
          title={result.title}
        >
          <img
            class="block aspect-4/3 w-full bg-line object-cover transition-opacity group-hover:opacity-90"
            src={thumbnail}
            alt={result.title}
            loading="lazy"
            decoding="async"
            referrerpolicy="no-referrer"
            onerror={() => markFailed(index)}
          />
        </a>
        <p class="mt-[0.4rem] truncate text-[0.85rem]">{result.title}</p>
        <p class="mt-[0.1rem] flex justify-between gap-2 text-xs/normal text-muted">
          <span class="min-w-0 truncate">{[result.resolution, result.source || result.engine].filter(Boolean).join(' · ')}</span>
          {#if full}
            <a
              class="flex-none font-semibold text-accent no-underline decoration-accent underline-offset-2 hover:underline"
              href={full}
              rel="noreferrer">Image</a
            >
          {/if}
        </p>
      </li>
    {/if}
  {/each}
</ul>
