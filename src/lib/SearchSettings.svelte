<script lang="ts">
  import RadioSetting from './RadioSetting.svelte';
  import { LANGUAGES, SAFE_SEARCH, searchPrefs, setLanguage, setSafeSearch } from './search-prefs.svelte';
</script>

<RadioSetting
  label="Safe search"
  info="Default uses the search server's setting."
  name="safesearch"
  options={SAFE_SEARCH}
  value={searchPrefs.safesearch}
  onchange={setSafeSearch}
/>
<!-- Same line and spacing as RadioSetting; the list is too long for radios. -->
<div class="flex w-fit items-baseline gap-4 border-b border-line-strong">
  <label class="text-text" for="language">Language</label>
  <select
    id="language"
    class="-mb-px cursor-pointer border-0 border-b-2 border-transparent bg-transparent px-[0.1rem] py-1 font-semibold text-text outline-none focus-visible:border-accent"
    value={searchPrefs.language}
    onchange={(event) => setLanguage(event.currentTarget.value)}
  >
    {#each LANGUAGES as language (language.id)}
      <option class="bg-surface text-text" value={language.id}>{language.label}</option>
    {/each}
  </select>
</div>
