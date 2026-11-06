<script lang="ts">
  import { AI_SUMMARY_CHOICES, aiSummary, setAiSummary } from './ai-summary.svelte';
  import InfoTip from './InfoTip.svelte';
  import { underline } from './underline';

  // The AI summary setting, in the small type of the time range tabs so it can sit under the logo on every page.
</script>

<div class="flex flex-none items-baseline gap-3">
  <span class="flex flex-none items-baseline gap-[0.1rem]">
    <span id="ai-toggle-label" class="whitespace-nowrap">AI summary</span>
    <InfoTip
      id="ai-toggle-info"
      text="On summarizes each search automatically, sends the query and result snippets to OpenRouter, and keeps summaries in this browser for 24 hours. Off shows no summary; start a search with - to summarize just that one."
    />
  </span>
  <div
    class="slide-underline relative flex gap-x-3"
    role="radiogroup"
    aria-labelledby="ai-toggle-label"
    use:underline={aiSummary.choice}
  >
    {#each AI_SUMMARY_CHOICES as choice (choice.id)}
      <label
        class="cursor-pointer border-b-2 border-transparent px-[0.1rem] text-muted hover:text-text has-checked:font-semibold has-checked:text-text has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent"
      >
        <input
          class="sr-only"
          type="radio"
          name="ai-toggle"
          checked={aiSummary.choice === choice.id}
          onchange={() => setAiSummary(choice.id)}
        />
        {choice.label}
      </label>
    {/each}
  </div>
</div>
