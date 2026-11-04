<script lang="ts">
  import { safeUrl, type Infobox } from './searxng';

  let { infobox }: { infobox: Infobox } = $props();

  const image = $derived(safeUrl(infobox.img_src));
  const attributes = $derived(infobox.attributes?.filter((attribute) => attribute.value) ?? []);
  const links = $derived(
    (infobox.urls ?? []).flatMap((link) => {
      const href = safeUrl(link.url);
      return href ? [{ title: link.title, href }] : [];
    }),
  );
</script>

<section class="mb-4 rounded-lg border border-line bg-surface p-4 wrap-anywhere" aria-label={infobox.infobox}>
  {#if image}
    <img
      class="mx-auto mb-3 block max-h-56 max-w-full rounded-[0.3rem]"
      src={image}
      alt=""
      loading="lazy"
      referrerpolicy="no-referrer"
    />
  {/if}
  <h2 class="mb-[0.4rem] text-[1.15rem] font-bold">{infobox.infobox}</h2>
  {#if infobox.content}
    <p class="mb-3 text-[0.92rem]">{infobox.content}</p>
  {/if}
  {#if attributes.length}
    <dl class="mb-3 grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-x-3 gap-y-[0.3rem] text-[0.85rem]">
      {#each attributes as attribute, index (`${attribute.label}-${index}`)}
        <dt class="text-muted">{attribute.label}</dt>
        <dd>{attribute.value}</dd>
      {/each}
    </dl>
  {/if}
  {#if links.length}
    <ul class="mb-3 flex flex-wrap gap-x-[0.9rem] gap-y-1 text-[0.85rem]">
      {#each links as link, index (`${link.href}-${index}`)}
        <li><a href={link.href} rel="noreferrer">{link.title}</a></li>
      {/each}
    </ul>
  {/if}
  <p class="text-xs/normal text-muted">{infobox.engine}</p>
</section>
