import { load, save } from './storage';
import { clearSummaries, pruneSummaries } from './summary-cache';

// Off shows no summary at all; a search starting with - still asks for one.
export type AiSummaryChoice = 'off' | 'on';

export const AI_SUMMARY_CHOICES: { id: AiSummaryChoice; label: string }[] = [
  { id: 'off', label: 'Off' },
  { id: 'on', label: 'On' },
];

const KEY = 'ai-summary';

export const aiSummary = $state({
  choice: load<AiSummaryChoice>(KEY, 'off', ['on']),
});

// Expired summaries go on the next visit, and anything but on keeps nothing in storage.
if (aiSummary.choice === 'on') pruneSummaries();
else clearSummaries();

export function setAiSummary(choice: AiSummaryChoice) {
  aiSummary.choice = choice;
  save(KEY, choice);
  if (choice !== 'on') clearSummaries();
}

// Off means no automatic requests, including from a tab that was already open.
addEventListener('storage', (event) => {
  if (event.key === KEY || event.key === null) {
    aiSummary.choice = load<AiSummaryChoice>(KEY, 'off', ['on']);
    if (aiSummary.choice !== 'on') clearSummaries();
  }
});
