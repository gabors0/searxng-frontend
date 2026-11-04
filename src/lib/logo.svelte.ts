export type LogoStyle = 'letters' | 'clock';
export type HourFormat = '24' | '12';

function load<T extends string>(key: string, fallback: T, others: readonly T[]): T {
  try {
    const saved = localStorage.getItem(key) as T | null;
    if (saved && others.includes(saved)) return saved;
  } catch {
    // Storage can be blocked, which leaves the default in place.
  }
  return fallback;
}

function save(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage can be blocked, so the choice only lasts until the page reloads.
  }
}

// The header shows the logo and the settings change it, so both read from here.
export const logo = $state({
  style: load<LogoStyle>('logo', 'letters', ['clock']),
  hours: load<HourFormat>('logo-hours', '24', ['12']),
});

export function setLogoStyle(style: LogoStyle) {
  logo.style = style;
  save('logo', style);
}

export function setHourFormat(hours: HourFormat) {
  logo.hours = hours;
  save('logo-hours', hours);
}
