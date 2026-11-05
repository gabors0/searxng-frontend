<script lang="ts">
  import { safeUrl, type Infobox } from './searxng';
  import SectionTitle from './SectionTitle.svelte';

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

<section class="wrap-anywhere" aria-label={infobox.infobox}>
  <SectionTitle title={infobox.infobox}>
    {#snippet aside()}<span class="truncate">{infobox.engine}</span>{/snippet}
  </SectionTitle>
  {#if image}
    <img class="mb-3 block max-h-56 max-w-full bg-line" src={image} alt="" loading="lazy" referrerpolicy="no-referrer" />
  {/if}
  {#if infobox.content}
    <p class="mb-3 font-serif text-[1rem]">{infobox.content}</p>
  {/if}
  {#if attributes.length}
    <dl class="mb-3 grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] text-[0.85rem]">
      {#each attributes as attribute, index (`${attribute.label}-${index}`)}
        <dt class="border-b border-line py-[0.35rem] pr-3 text-muted">{attribute.label}</dt>
        <dd class="border-b border-line py-[0.35rem]">{attribute.value}</dd>
      {/each}
    </dl>
  {/if}
  {#if links.length}
    <ul class="flex flex-wrap gap-x-4 gap-y-1 text-[0.85rem]">
      {#each links as link, index (`${link.href}-${index}`)}
        <li>
          <a
            class="font-semibold text-accent no-underline decoration-accent decoration-2 underline-offset-4 hover:underline"
            href={link.href}
            rel="noreferrer">{link.title}</a
          >
        </li>
      {/each}
    </ul>
  {/if}
</section>
