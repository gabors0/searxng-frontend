<script lang="ts">
  import RadioSetting from './RadioSetting.svelte';
  import { aiSummary, setAiSummary, type AiSummaryChoice } from './ai-summary.svelte';

  const CHOICES: { id: AiSummaryChoice; label: string }[] = [
    { id: 'off', label: 'Off' },
    { id: 'on', label: 'On' },
  ];
</script>

<RadioSetting
  label="AI summary (sends queries and result snippets to OpenRouter, keeps summaries in this browser for 24 hours)"
  name="ai-summary"
  options={CHOICES}
  value={aiSummary.choice}
  onchange={setAiSummary}
/>
