import { load, save } from './storage';
import { clearSummaries, pruneSummaries } from './summary-cache';

export type AiSummaryChoice = 'off' | 'on';

const KEY = 'ai-summary';

export const aiSummary = $state({
  choice: load<AiSummaryChoice>(KEY, 'off', ['on']),
});

// Expired summaries go on the next visit, and off keeps nothing in storage.
if (aiSummary.choice === 'on') pruneSummaries();
else clearSummaries();

export function setAiSummary(choice: AiSummaryChoice) {
  aiSummary.choice = choice;
  save(KEY, choice);
  if (choice === 'off') clearSummaries();
}

// Off means no automatic requests, including from a tab that was already open.
addEventListener('storage', (event) => {
  if (event.key === KEY || event.key === null) {
    aiSummary.choice = load<AiSummaryChoice>(KEY, 'off', ['on']);
    if (aiSummary.choice === 'off') clearSummaries();
  }
});
