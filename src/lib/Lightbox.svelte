<script lang="ts">
  import Panzoom, { type PanzoomObject } from '@panzoom/panzoom';
  import type { Attachment } from 'svelte/attachments';
  import { copyImage, prepareCopy, saveImage, UnreadableImage, urlFileName } from './image-file';
  import { safeUrl, type SearchResult } from './searxng';

  // A full-screen viewer for image results. `index` is the open item, or null when closed.
  let { items, index = $bindable() }: { items: SearchResult[]; index: number | null } = $props();

  let dialog: HTMLDialogElement;
  let panzoom: PanzoomObject | undefined;
  let zoomed = $state(false);
  // The full image can be missing or blocked, so the thumbnail stands in for it.
  let fullFailed = $state(false);
  let loading = $state(true);
  let busy = $state<'save' | 'copy' | null>(null);
  let notice = $state('');
  let noticeTimer: ReturnType<typeof setTimeout> | undefined;

  const item = $derived(index === null ? undefined : items[index]);
  const full = $derived(item && safeUrl(item.img_src));
  const thumbnail = $derived(item && safeUrl(item.thumbnail_src));
  const src = $derived(fullFailed ? thumbnail : (full ?? thumbnail));
  const href = $derived(item && safeUrl(item.url));
  const name = $derived(urlFileName(full ?? src));

  $effect(() => {
    if (item && !dialog.open) dialog.showModal();
    else if (!item && dialog.open) dialog.close();
  });

  $effect.pre(() => {
    src;
    zoomed = false;
    loading = true;
  });

  $effect.pre(() => {
    item;
    fullFailed = false;
    notice = '';
  });

  function announce(text: string) {
    notice = text;
    clearTimeout(noticeTimer);
    noticeTimer = setTimeout(() => (notice = ''), 4000);
  }

  // When the image proxy can't fetch it, there's a fallback instead: a new tab to save from, or the link.
  async function save() {
    if (!src || busy) return;
    const url = src;
    busy = 'save';
    try {
      await saveImage(url, item?.title ?? '');
      announce('Saved');
    } catch (error) {
      if (!(error instanceof UnreadableImage)) throw error;
      window.open(url, '_blank', 'noopener,noreferrer');
      announce("Couldn't fetch the image, so it opened in a new tab.");
    } finally {
      busy = null;
    }
  }

  async function copy() {
    if (!src || busy) return;
    const url = src;
    busy = 'copy';
    try {
      await copyImage(url);
      announce('Copied image');
    } catch {
      try {
        await navigator.clipboard.writeText(url);
        announce("Couldn't fetch the image, so its link was copied instead.");
      } catch {
        announce("Couldn't copy the image.");
      }
    } finally {
      busy = null;
    }
  }

  // How far the fitted image must grow to show its real pixels.
  function actualScale(image: HTMLImageElement) {
    return image.clientWidth ? image.naturalWidth / image.clientWidth : 1;
  }

  // Zooming and panning come from @panzoom/panzoom, which zooms towards the pointer and handles pinch on touch screens.
  const zoomable: Attachment<HTMLImageElement> = (image) => {
    const instance = Panzoom(image, { minScale: 1, maxScale: 8, step: 0.4, panOnlyWhenZoomed: true, cursor: 'zoom-in' });
    const parent = image.parentElement!;
    let downAt = { x: 0, y: 0 };

    function settle() {
      // Zoomed all the way out, the image goes back to the centre.
      if (instance.getScale() <= 1.001) instance.reset({ animate: false });
      zoomed = instance.getScale() > 1.001;
      instance.setOptions({ cursor: zoomed ? 'grab' : 'zoom-in' });
    }

    function onwheel(event: WheelEvent) {
      instance.zoomWithWheel(event);
      settle();
    }

    function onpointerdown(event: PointerEvent) {
      downAt = { x: event.clientX, y: event.clientY };
    }

    // A click without a drag zooms to the clicked spot, or back out.
    function onclick(event: MouseEvent) {
      if (Math.hypot(event.clientX - downAt.x, event.clientY - downAt.y) > 5) return;
      if (zoomed) instance.reset();
      else instance.zoomToPoint(Math.min(Math.max(2.5, actualScale(image)), 8), event, { animate: true });
      zoomed = !zoomed;
      instance.setOptions({ cursor: zoomed ? 'grab' : 'zoom-in' });
    }

    function onload() {
      instance.setOptions({ maxScale: Math.max(4, actualScale(image) * 2) });
    }

    parent.addEventListener('wheel', onwheel, { passive: false });
    image.addEventListener('pointerdown', onpointerdown, { capture: true });
    image.addEventListener('click', onclick);
    image.addEventListener('load', onload);
    image.addEventListener('panzoomend', settle);
    panzoom = instance;

    return () => {
      parent.removeEventListener('wheel', onwheel);
      image.removeEventListener('pointerdown', onpointerdown, { capture: true });
      image.removeEventListener('click', onclick);
      image.removeEventListener('load', onload);
      image.removeEventListener('panzoomend', settle);
      instance.destroy();
      if (panzoom === instance) panzoom = undefined;
    };
  };

  function zoomBy(direction: 1 | -1 | 0) {
    if (!panzoom) return;
    if (direction === 0) panzoom.reset();
    else if (direction === 1) panzoom.zoomIn();
    else panzoom.zoomOut();
    setTimeout(() => {
      if (!panzoom) return;
      if (panzoom.getScale() <= 1.001) panzoom.reset({ animate: false });
      zoomed = panzoom.getScale() > 1.001;
      panzoom.setOptions({ cursor: zoomed ? 'grab' : 'zoom-in' });
    }, 220);
  }

  function step(by: number) {
    if (index === null || items.length === 0) return;
    index = (index + by + items.length) % items.length;
  }

  function onkeydown(event: KeyboardEvent) {
    if (event.key === 'ArrowLeft') step(-1);
    else if (event.key === 'ArrowRight') step(1);
    else if (event.key === '+' || event.key === '=') zoomBy(1);
    else if (event.key === '-') zoomBy(-1);
    else if (event.key === '0') zoomBy(0);
    else return;
    event.preventDefault();
  }

  // Clicks on the dark space around the image close the viewer.
  function closeOnBackdrop(event: MouseEvent) {
    if (event.target === event.currentTarget) index = null;
  }
</script>

<dialog
  bind:this={dialog}
  class="m-0 h-dvh max-h-none w-dvw max-w-none overflow-hidden bg-transparent p-0 text-[#e8e8e6] backdrop:bg-black/90"
  aria-label={item?.title ?? 'Image viewer'}
  onclose={() => (index = null)}
  {onkeydown}
>
  {#if item}
    <div class="flex h-full flex-col">
      <div class="flex flex-none items-center gap-4 px-4 py-2 text-sm">
        <p class="min-w-0 flex-1 truncate">
          {item.title}
          {#if items.length > 1}<span class="ml-2 text-[#a0a3a9]">{(index ?? 0) + 1} / {items.length}</span>{/if}
        </p>
        {#if notice}
          <p class="min-w-0 truncate text-xs text-[#a0a3a9]" role="status" title={notice}>{notice}</p>
        {/if}
        {#if src}
          <button class="flex-none font-semibold text-[#93b3f7]" type="button" disabled={busy !== null} onclick={save}
            >{busy === 'save' ? 'Saving…' : 'Save'}</button
          >
          {#if typeof ClipboardItem !== 'undefined'}
            <button class="flex-none font-semibold text-[#93b3f7]" type="button" disabled={busy !== null} onclick={copy}
              >{busy === 'copy' ? 'Copying…' : 'Copy'}</button
            >
          {/if}
        {/if}
        {#if full}
          <a class="flex-none border-b-2 border-transparent px-[0.1rem] py-1 font-semibold text-[#93b3f7] no-underline visited:text-[#93b3f7] hover:border-accent" href={full} rel="noreferrer">Image</a>
        {/if}
        {#if href}
          <a class="flex-none border-b-2 border-transparent px-[0.1rem] py-1 font-semibold text-[#93b3f7] no-underline visited:text-[#93b3f7] hover:border-accent" href={href} rel="noreferrer">Page</a>
        {/if}
        <button class="flex-none text-xl/none text-[#e8e8e6]" type="button" aria-label="Close" onclick={() => (index = null)}
          >×</button
        >
      </div>

      <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
      <div class="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden px-12" onclick={closeOnBackdrop}>
        {#if loading && thumbnail && src !== thumbnail}
          <img
            class="pointer-events-none absolute inset-0 m-auto max-h-full max-w-[calc(100%-6rem)] object-contain opacity-60 blur-sm"
            src={thumbnail}
            alt=""
            referrerpolicy="no-referrer"
          />
        {/if}
        <!-- Click, scroll or pinch to zoom; drag to move around once zoomed. -->
        {#key src}
          <img
            class="relative block max-h-full max-w-full object-contain select-none"
            {src}
            alt={item.title}
            referrerpolicy="no-referrer"
            draggable="false"
            onload={() => {
              loading = false;
              if (src && typeof ClipboardItem !== 'undefined') prepareCopy(src).catch(() => {});
            }}
            onerror={() => {
              if (!fullFailed && thumbnail && src !== thumbnail) fullFailed = true;
              else loading = false;
            }}
            {@attach zoomable}
          />
        {/key}
      </div>

      {#if items.length > 1}
        <button
          class="absolute top-1/2 left-1 -translate-y-1/2 px-3 py-4 text-3xl/none text-[#e8e8e6]"
          type="button"
          aria-label="Previous image"
          onclick={() => step(-1)}>‹</button
        >
        <button
          class="absolute top-1/2 right-1 -translate-y-1/2 px-3 py-4 text-3xl/none text-[#e8e8e6]"
          type="button"
          aria-label="Next image"
          onclick={() => step(1)}>›</button
        >
      {/if}

      <p class="flex-none truncate px-4 py-2 font-mono text-xs text-[#a0a3a9]">
        {[item.resolution, item.source || item.engine, name].filter(Boolean).join(' · ')}
      </p>
    </div>
  {/if}
</dialog>
