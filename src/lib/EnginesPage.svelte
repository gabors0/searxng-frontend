<script lang="ts">
  import { chosenEngines, setEngines } from './engines.svelte';
  import RadioSetting from './RadioSetting.svelte';
  import { CATEGORIES } from './route';
  import { fetchEngines, type Category, type EngineInfo } from './searxng';
  import SectionTitle from './SectionTitle.svelte';
  import Spinner from './Spinner.svelte';

  let { onback }: { onback: (event: MouseEvent) => void } = $props();

  let engines = $state.raw<EngineInfo[] | null>(null);
  let error = $state<string | null>(null);
  let attempt = $state(0);
  let category = $state<Category>('general');

  $effect(() => {
    attempt;
    error = null;
    const controller = new AbortController();
    fetchEngines(controller.signal).then(
      (list) => (engines = list),
      (failure: Error) => {
        if (!controller.signal.aborted) error = failure.message;
      },
    );
    return () => controller.abort();
  });

  const inCategory = $derived(
    (engines ?? []).filter((engine) => engine.categories.includes(category)).sort((a, b) => a.name.localeCompare(b.name)),
  );
  const defaults = $derived(inCategory.filter((engine) => engine.enabled).map((engine) => engine.name));
  const customized = $derived(chosenEngines[category] !== undefined);
  const on = $derived(new Set(chosenEngines[category] ?? defaults));

  function toggle(name: string, checked: boolean) {
    const next = inCategory.map((engine) => engine.name).filter((n) => (n === name ? checked : on.has(n)));
    // Matching the server's set goes back to following it.
    const same = next.length === defaults.length && next.every((n) => defaults.includes(n));
    setEngines(category, same ? undefined : next);
  }
</script>

<div class="flex max-w-184 flex-col gap-6">
  <a class="w-fit font-bold text-accent no-underline hover:underline" href="/" onclick={onback}>&lt;&lt;&lt; Settings</a>

  <RadioSetting label="Category" name="engine-category" options={CATEGORIES} value={category} onchange={(next) => (category = next)} />

  {#if error}
    <div role="alert">
      <p class="mb-2">{error}</p>
      <button type="button" onclick={() => (attempt += 1)}>Try again</button>
    </div>
  {:else if !engines}
    <p class="flex items-center gap-2 text-muted"><Spinner /> Loading engines…</p>
  {:else}
    <section aria-label="Engines">
      <SectionTitle
        title="Engines"
        info={{
          id: 'engines-info',
          text: 'Searches in this category use the checked engines. Until you change them, they follow the server.',
        }}
      >
        {#snippet aside()}<span>{on.size} of {inCategory.length} on{customized ? '' : ', server default'}</span>{/snippet}
        {#snippet action()}
          {#if customized}
            <button class="-mb-px flex-none py-1" type="button" onclick={() => setEngines(category, undefined)}
              >Reset</button
            >
          {/if}
        {/snippet}
      </SectionTitle>
      <!-- Columns rather than a grid, so the alphabetical order runs down each column first. -->
      <ul class="columns-[14rem] gap-x-6">
        {#each inCategory as engine (engine.name)}
          {@const checked = on.has(engine.name)}
          <li class="break-inside-avoid">
            <label class="flex cursor-pointer items-baseline gap-2 py-1">
              <input
                class="accent-accent"
                type="checkbox"
                {checked}
                disabled={checked && on.size === 1}
                onchange={(event) => toggle(engine.name, event.currentTarget.checked)}
              />
              <span class={['truncate', !checked && 'text-muted']}>{engine.name}</span>
              <span class="ml-auto flex-none font-mono text-[0.8rem] text-muted">!{engine.shortcut}</span>
            </label>
          </li>
        {/each}
      </ul>
    </section>
  {/if}
</div>
