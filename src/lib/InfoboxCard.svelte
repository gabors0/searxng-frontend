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

<section aria-label={infobox.infobox}>
  {#if image}
    <img src={image} alt="" loading="lazy" referrerpolicy="no-referrer" />
  {/if}
  <h2>{infobox.infobox}</h2>
  {#if infobox.content}
    <p>{infobox.content}</p>
  {/if}
  {#if attributes.length}
    <dl>
      {#each attributes as attribute, index (`${attribute.label}-${index}`)}
        <dt>{attribute.label}</dt>
        <dd>{attribute.value}</dd>
      {/each}
    </dl>
  {/if}
  {#if links.length}
    <ul>
      {#each links as link, index (`${link.href}-${index}`)}
        <li><a href={link.href} rel="noreferrer">{link.title}</a></li>
      {/each}
    </ul>
  {/if}
  <p class="meta">{infobox.engine}</p>
</section>

<style>
  section {
    margin-bottom: 1rem;
    padding: 1rem;
    border: 1px solid var(--line);
    border-radius: 0.5rem;
    background: var(--surface);
    overflow-wrap: anywhere;
  }

  img {
    display: block;
    max-width: 100%;
    max-height: 14rem;
    margin: 0 auto 0.75rem;
    border-radius: 0.3rem;
  }

  h2 {
    margin: 0 0 0.4rem;
    font-size: 1.15rem;
  }

  p {
    margin: 0 0 0.75rem;
    font-size: 0.92rem;
  }

  dl {
    display: grid;
    grid-template-columns: minmax(0, 2fr) minmax(0, 3fr);
    gap: 0.3rem 0.75rem;
    margin: 0 0 0.75rem;
    font-size: 0.85rem;
  }

  dt {
    color: var(--muted);
  }

  dd {
    margin: 0;
  }

  ul {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem 0.9rem;
    margin: 0 0 0.75rem;
    padding: 0;
    font-size: 0.85rem;
    list-style: none;
  }

  .meta {
    margin: 0;
    color: var(--muted);
    font-size: 0.75rem;
  }
</style>
