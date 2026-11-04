<script lang="ts">
  import RadioSetting from './RadioSetting.svelte';

  const THEMES = [
    { id: 'system', label: 'System' },
    { id: 'light', label: 'Light' },
    { id: 'dark', label: 'Dark' },
  ];

  const root = document.documentElement;
  // public/theme.js has already applied the saved choice.
  let theme = $state(root.dataset.theme ?? 'system');

  function pick(next: string) {
    theme = next;
    if (next === 'system') delete root.dataset.theme;
    else root.dataset.theme = next;

    try {
      if (next === 'system') localStorage.removeItem('theme');
      else localStorage.setItem('theme', next);
    } catch {
      // Storage can be blocked, so the choice only lasts until the page reloads.
    }
  }
</script>

<RadioSetting label="Theme" name="theme" options={THEMES} value={theme} onchange={pick} />
