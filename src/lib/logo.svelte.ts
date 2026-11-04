import { load, save } from './storage';

export type LogoStyle = 'letters' | 'clock';
export type HourFormat = '24' | '12';

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
