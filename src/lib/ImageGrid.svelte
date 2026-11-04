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

<ul>
  {#each results as result, index (`${result.url}-${index}`)}
    {@const href = safeUrl(result.url)}
    {@const full = safeUrl(result.img_src)}
    {@const thumbnail = safeUrl(result.thumbnail_src) ?? full}
    {#if thumbnail && !failed.has(index)}
      <li>
        <a class="frame" href={href ?? full} rel="noreferrer" title={result.title}>
          <img
            src={thumbnail}
            alt={result.title}
            loading="lazy"
            decoding="async"
            referrerpolicy="no-referrer"
            onerror={() => markFailed(index)}
          />
        </a>
        <p class="title">{result.title}</p>
        <p class="meta">
          <span>{[result.resolution, result.source || result.engine].filter(Boolean).join(' · ')}</span>
          {#if full}<a href={full} rel="noreferrer">Image</a>{/if}
        </p>
      </li>
    {/if}
  {/each}
</ul>

<style>
  ul {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(10.5rem, 1fr));
    gap: 1.1rem 0.9rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  li {
    min-width: 0;
  }

  .frame {
    display: block;
    overflow: hidden;
    aspect-ratio: 4 / 3;
    border-radius: 0.4rem;
    background: var(--line);
  }

  img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  p {
    overflow: hidden;
    margin: 0.25rem 0 0;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .title {
    font-size: 0.85rem;
  }

  .meta {
    display: flex;
    justify-content: space-between;
    gap: 0.5rem;
    color: var(--muted);
    font-size: 0.75rem;
  }

  .meta span {
    overflow: hidden;
    min-width: 0;
    text-overflow: ellipsis;
  }

  .meta a {
    flex: none;
  }
</style>
