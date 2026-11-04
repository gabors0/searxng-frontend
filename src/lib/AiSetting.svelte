<script lang="ts">
  import RadioSetting from './RadioSetting.svelte';
  import { aiSummary, setAiSummary, type AiSummaryChoice } from './ai-summary.svelte';

  const CHOICES: { id: AiSummaryChoice; label: string }[] = [
    { id: 'off', label: 'Off' },
    { id: 'on', label: 'On' },
  ];
</script>

<RadioSetting
  label="AI summary (sends queries and result snippets to OpenRouter)"
  name="ai-summary"
  options={CHOICES}
  value={aiSummary.choice}
  onchange={setAiSummary}
/>
