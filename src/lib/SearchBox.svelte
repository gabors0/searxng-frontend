<script lang="ts">
  import { onDestroy } from 'svelte';
  import { searchPrefs } from './search-prefs.svelte';
  import { suggest } from './searxng';
  import { underline } from './underline';

  let {
    value = $bindable(),
    element = $bindable(),
    onpick,
  }: { value: string; element?: HTMLInputElement; onpick: (q: string) => void } = $props();

  const LIMIT = 8;
  // Long enough to skip most keystrokes of a fast typist, short enough to feel immediate.
  const DELAY = 120;
  const id = 'search-suggestions';

  let suggestions = $state.raw<string[]>([]);
  // What was typed, as opposed to a suggestion the arrow keys have put in the box.
  let typed = $state('');
  // -1 is the typed text; the arrow keys cycle through it as one more stop.
  let active = $state(-1);
  let timer: ReturnType<typeof setTimeout> | undefined;
  let controller: AbortController | undefined;

  const expanded = $derived(suggestions.length > 0);
  // The part a suggestion shares with the query stays regular, so the completion stands out.
  const prefix = $derived(typed.trim().toLowerCase());

  function cancel() {
    clearTimeout(timer);
    controller?.abort();
    controller = undefined;
  }

  function close() {
    cancel();
    suggestions = [];
    active = -1;
  }

  function oninput() {
    typed = value;
    active = -1;
    cancel();
    const q = value.trim();
    if (!q) {
      suggestions = [];
      return;
    }
    // The previous list stays up until the new one arrives, so it doesn't flicker while typing.
    timer = setTimeout(() => {
      const current = (controller = new AbortController());
      suggest(q, searchPrefs.language, current.signal).then((list) => {
        if (current.signal.aborted) return;
        suggestions = list.slice(0, LIMIT);
      });
    }, DELAY);
  }

  function onkeydown(event: KeyboardEvent) {
    if (event.isComposing) return;
    // Up and down enter and walk the list; left and right walk it too once a suggestion is highlighted,
    // and otherwise keep moving the caret.
    const vertical = event.key === 'ArrowDown' || event.key === 'ArrowUp';
    const horizontal = (event.key === 'ArrowRight' || event.key === 'ArrowLeft') && active >= 0;
    if ((vertical || horizontal) && expanded) {
      event.preventDefault();
      const stops = suggestions.length + 1;
      const step = event.key === 'ArrowDown' || event.key === 'ArrowRight' ? 1 : -1;
      active = ((active + 1 + step + stops) % stops) - 1;
      value = suggestions[active] ?? typed;
    } else if (event.key === 'Escape' && expanded) {
      // A search input would otherwise clear itself as well.
      event.preventDefault();
      value = typed;
      close();
    } else if (event.key === 'Enter') {
      // The form submits whatever is in the box, which is the highlighted suggestion if there is one.
      close();
    }
  }

  function pick(q: string) {
    value = q;
    close();
    onpick(q);
  }

  onDestroy(cancel);
</script>

<div class="relative -mb-px flex min-w-40 flex-1 max-sm:mb-0 max-sm:min-w-0">
  <input
    class="min-w-0 flex-1 border-b-2 border-transparent pr-3 pl-[0.2rem] outline-none focus:border-b-2 focus:border-accent max-sm:h-11 max-sm:border-b max-sm:border-line-strong"
    bind:this={element}
    bind:value
    type="search"
    name="q"
    role="combobox"
    aria-label="Search query"
    aria-autocomplete="list"
    aria-expanded={expanded}
    aria-controls={id}
    aria-activedescendant={active >= 0 ? `${id}-${active}` : undefined}
    placeholder="Search the web"
    autocomplete="off"
    enterkeyhint="search"
    {oninput}
    {onkeydown}
    onblur={close}
  />
  {#if expanded}
    <!--
      Suggestions run on like the related searches, wrapping onto new lines. The panel is a raised surface with the
      header's strong rule on three sides, so it reads as floating over the page rather than part of it.
      The sliding accent bar marks the highlighted one.
    -->
    <ul
      class="appear slide-underline absolute top-full right-0 left-0 z-20 flex flex-wrap gap-x-5 gap-y-1 border border-t-0 border-line-strong bg-surface px-3 pt-2 pb-2 shadow-[0_0.75rem_1.5rem_-0.5rem_rgb(0_0_0/0.35)]"
      {id}
      role="listbox"
      aria-label="Suggestions"
      aria-orientation="horizontal"
      use:underline={active}
    >
      {#each suggestions as suggestion, index (suggestion)}
        {@const shared = suggestion.toLowerCase().startsWith(prefix) ? prefix.length : 0}
        <!-- The input keeps focus and handles the keys, as in the ARIA combobox pattern. -->
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <li
          class="group max-w-full cursor-pointer truncate border-b-2 border-transparent px-[0.1rem] py-1"
          id="{id}-{index}"
          role="option"
          aria-selected={index === active}
          onmousedown={(event) => event.preventDefault()}
          onclick={() => pick(suggestion)}
        >
          <!-- Colour rather than weight marks the highlight, so the wrapped lines don't reflow under the cursor. -->
          <span class="text-muted">{suggestion.slice(0, shared)}</span><span
            class="text-text transition-colors duration-150 group-hover:text-accent group-aria-selected:text-accent"
            >{suggestion.slice(shared)}</span
          >
        </li>
      {/each}
    </ul>
  {/if}
</div>
