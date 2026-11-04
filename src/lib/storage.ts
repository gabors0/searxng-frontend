export function load<T extends string>(key: string, fallback: T, others: readonly T[]): T {
  try {
    const saved = localStorage.getItem(key) as T | null;
    if (saved && others.includes(saved)) return saved;
  } catch {
    // Storage can be blocked, which leaves the default in place.
  }
  return fallback;
}

export function save(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage can be blocked, so the choice only lasts until the page reloads.
  }
}
