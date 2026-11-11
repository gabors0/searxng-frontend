<script lang="ts">
  import { linkCitations, type Source, type SummaryPart } from './openrouter';
  import { faviconUrl } from './searxng';

  let {
    text,
    sources,
    starts = [],
    writing = false,
  }: { text: string; sources: Source[]; starts?: number[]; writing?: boolean } = $props();

  const id = $props.id();
  const GAP = 6;

  // starts holds where each streamed update began. Every piece of text is its own span keyed by where it starts,
  // so only text that just arrived fades in.
  const pieces = $derived.by(() => {
    const out: (SummaryPart & { start: number })[] = [];
    let offset = 0;
    for (const part of linkCitations(text, sources)) {
      const end = offset + part.text.length;
      if ('href' in part) {
        out.push({ ...part, start: offset });
      } else {
        let from = offset;
        for (const cut of starts) {
          if (cut <= from || cut >= end) continue;
          out.push({ text: text.slice(from, cut), start: from });
          from = cut;
        }
        out.push({ text: text.slice(from, end), start: from });
      }
      offset = end;
    }
    return out;
  });

  // The citation under the pointer or holding keyboard focus, whose source the preview card shows.
  let active = $state.raw<{ start: number; link: HTMLElement; href: string; source: Source } | null>(null);
  let imageFailed = $state(false);
  let iconFailed = $state(false);
  let wrapper: HTMLElement;
  let card = $state<HTMLElement>();

  const preview = $derived.by(() => {
    if (!active) return null;
    const url = new URL(active.href);
    const host = url.hostname.replace(/^www\./, '');
    return {
      host,
      title: active.source.title || host,
      snippet: active.source.snippet,
      image: imageFailed ? undefined : active.source.image,
      icon: iconFailed ? undefined : faviconUrl(active.href),
    };
  });

  function show(event: Event, piece: { start: number; href: string; source: Source }) {
    if (active?.start === piece.start) return;
    imageFailed = false;
    iconFailed = false;
    active = { ...piece, link: event.currentTarget as HTMLElement };
  }

  function hide() {
    active = null;
    tapped = null;
  }

  // Touch has no hover, so the first tap on a citation opens its preview and a second tap follows the link.
  let touch = false;
  let tapped: number | null = null;

  function tap(event: MouseEvent, piece: { start: number; href: string; source: Source }) {
    if (!touch || tapped === piece.start) return;
    event.preventDefault();
    show(event, piece);
    tapped = piece.start;
  }

  // A tap anywhere else closes the preview, since touch has no mouseleave to count on.
  function onWindowPointerDown(event: PointerEvent) {
    if (active && !(event.target instanceof Node && active.link.contains(event.target))) hide();
  }

  // A citation replaced by new text never gets a mouseleave.
  $effect(() => {
    pieces;
    if (active && !active.link.isConnected) active = null;
  });

  // Sits under the citation, or above it when the window has no room below, and stays inside the text column.
  // The position is set from script because the CSP blocks inline style attributes.
  $effect(() => {
    if (!active || !card) return;
    // A picture that fails to load changes the card's height.
    imageFailed;
    const link = active.link.getBoundingClientRect();
    const box = wrapper.getBoundingClientRect();
    const height = card.offsetHeight;
    const fitsBelow = link.bottom + GAP + height <= document.documentElement.clientHeight;
    const fitsAbove = link.top - GAP - height >= 0;
    const top = fitsBelow || !fitsAbove ? link.bottom + GAP : link.top - GAP - height;
    const left = Math.max(0, Math.min(link.left - box.left, box.width - card.offsetWidth));
    card.style.left = `${left}px`;
    card.style.top = `${top - box.top}px`;
  });
</script>

<svelte:window onpointerdown={onWindowPointerDown} />

<div class="relative" bind:this={wrapper}>
  <!-- Model output is untrusted: it only ever renders as text, plus links to real results. -->
  <p class="font-serif text-[1.05rem] wrap-anywhere whitespace-pre-wrap">{#each pieces as piece (piece.start)}{#if 'href' in piece}<a class="ink font-sans text-[0.75em] font-semibold text-accent no-underline hover:underline" href={piece.href} rel="noreferrer" aria-describedby={active?.start === piece.start ? id : undefined} onmouseenter={(event) => show(event, piece)} onmouseleave={hide} onfocus={(event) => show(event, piece)} onblur={hide} onpointerdown={(event) => (touch = event.pointerType !== 'mouse')} onclick={(event) => tap(event, piece)} onkeydown={(event) => { touch = false; if (event.key === 'Escape') hide(); }}>{piece.text}</a>{:else}<span class="ink">{piece.text}</span>{/if}{/each}{#if writing}<span class="caret" aria-hidden="true"></span>{/if}</p>

  <!-- A preview of the cited result. Its title and snippet come from the result site, so they render as text. -->
  {#if preview}
    <div
      {id}
      role="tooltip"
      class="appear pointer-events-none absolute z-10 w-80 max-w-full overflow-hidden border border-line-strong bg-surface text-[0.85rem]/normal shadow-lg"
      bind:this={card}
    >
      {#if preview.image}
        <img class="h-36 w-full object-cover" src={preview.image} alt="" onerror={() => (imageFailed = true)} />
      {/if}
      <div class="px-3 py-2">
        <p class="flex items-center gap-[0.4rem] text-[0.8rem] text-muted">
          {#if !preview.image && preview.icon}
            <img class="size-4 flex-none" src={preview.icon} alt="" onerror={() => (iconFailed = true)} />
          {/if}
          <span class="truncate">{preview.host}</span>
        </p>
        <p class="mt-[0.15rem] line-clamp-2 font-medium wrap-anywhere">{preview.title}</p>
        {#if preview.snippet}
          <p class="mt-[0.2rem] line-clamp-4 wrap-anywhere text-muted">{preview.snippet}</p>
        {/if}
      </div>
    </div>
  {/if}
</div>
