<script lang="ts">
  import RadioSetting from './RadioSetting.svelte';
  import { aiSummary, setAiSummary, type AiSummaryChoice } from './ai-summary.svelte';

  const CHOICES: { id: AiSummaryChoice; label: string }[] = [
    { id: 'off', label: 'Off' },
    { id: 'on', label: 'On' },
  ];
</script>

<RadioSetting
  label="AI summary"
  info="On summarizes each search automatically, sends the query and result snippets to OpenRouter, and keeps summaries in this browser for 24 hours. Off shows a button to start one, or start a search with - to summarize it."
  name="ai-summary"
  options={CHOICES}
  value={aiSummary.choice}
  onchange={setAiSummary}
/>
