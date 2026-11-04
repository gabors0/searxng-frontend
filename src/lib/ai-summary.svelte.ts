import { load, save } from './storage';

export type AiSummaryChoice = 'off' | 'on';

const KEY = 'ai-summary';

export const aiSummary = $state({
  choice: load<AiSummaryChoice>(KEY, 'off', ['on']),
});

export function setAiSummary(choice: AiSummaryChoice) {
  aiSummary.choice = choice;
  save(KEY, choice);
}

// Off means no requests at all, including from a tab that was already open.
addEventListener('storage', (event) => {
  if (event.key === KEY || event.key === null) {
    aiSummary.choice = load<AiSummaryChoice>(KEY, 'off', ['on']);
  }
});
