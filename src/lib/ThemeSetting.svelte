<script lang="ts">
  import { tick } from 'svelte';
  import RadioSetting from './RadioSetting.svelte';

  const THEMES = [
    { id: 'system', label: 'System' },
    { id: 'light', label: 'Light' },
    { id: 'dark', label: 'Dark' },
  ];

  const root = document.documentElement;
  // public/theme.js has already applied the saved choice.
  let theme = $state(root.dataset.theme ?? 'system');

  // The old colours fade into the new ones. Browsers without view transitions just switch.
  // Links, buttons and labels skip their own colour transitions meanwhile; see app.css.
  function fade(change: () => Promise<void>) {
    root.dataset.themeChanging = '';
    const done = () => delete root.dataset.themeChanging;
    if (!('startViewTransition' in document) || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      // Two frames, so the new colours are styled before the transitions come back.
      void change().then(() => requestAnimationFrame(() => requestAnimationFrame(done)));
      return;
    }
    document.startViewTransition(change).finished.then(done, done);
  }

  function pick(next: string) {
    fade(async () => {
      theme = next;
      if (next === 'system') delete root.dataset.theme;
      else root.dataset.theme = next;
      // The new snapshot waits for Svelte to move the selection too.
      await tick();
    });

    try {
      if (next === 'system') localStorage.removeItem('theme');
      else localStorage.setItem('theme', next);
    } catch {
      // Storage can be blocked, so the choice only lasts until the page reloads.
    }
  }
</script>

<RadioSetting label="Theme" name="theme" options={THEMES} value={theme} onchange={pick} />
