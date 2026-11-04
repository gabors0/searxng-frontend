<script lang="ts">
  import RadioSetting from './RadioSetting.svelte';
  import { logo, setHourFormat, setLogoStyle, type HourFormat, type LogoStyle } from './logo.svelte';

  const STYLES: { id: LogoStyle; label: string }[] = [
    { id: 'letters', label: 'Letters' },
    { id: 'clock', label: 'Clock' },
  ];

  const HOUR_FORMATS: { id: HourFormat; label: string }[] = [
    { id: '24', label: '24h' },
    { id: '12', label: '12h' },
  ];
</script>

<RadioSetting label="Logo" name="logo" options={STYLES} value={logo.style} onchange={setLogoStyle} />
{#if logo.style === 'clock'}
  <RadioSetting label="Hours" name="logo-hours" options={HOUR_FORMATS} value={logo.hours} onchange={setHourFormat} />
{/if}
