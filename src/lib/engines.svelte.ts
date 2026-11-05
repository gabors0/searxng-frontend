import type { Category } from './searxng';

const KEY = 'engines';

// A category without a list uses the server's engines. A saved list is a snapshot, so engines the server adds
// later stay off until the list is reset.
type Chosen = Partial<Record<Category, string[]>>;

function read(): Chosen {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? '{}');
    const chosen: Chosen = {};
    for (const category of ['general', 'images', 'news'] as const) {
      const names = saved?.[category];
      if (Array.isArray(names) && names.length && names.every((name) => typeof name === 'string')) {
        chosen[category] = names;
      }
    }
    return chosen;
  } catch {
    // Storage can be blocked, or the saved value can be damaged.
    return {};
  }
}

export const chosenEngines = $state<Chosen>(read());

export function setEngines(category: Category, names: string[] | undefined) {
  if (names?.length) chosenEngines[category] = names;
  else delete chosenEngines[category];
  try {
    if (Object.keys(chosenEngines).length) localStorage.setItem(KEY, JSON.stringify(chosenEngines));
    else localStorage.removeItem(KEY);
  } catch {
    // Storage can be blocked, so the choice only lasts until the page reloads.
  }
}
