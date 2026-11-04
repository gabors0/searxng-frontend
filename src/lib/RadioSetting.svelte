<script lang="ts" generics="T extends string">
  let {
    label,
    name,
    options,
    value,
    onchange,
  }: {
    label: string;
    name: string;
    options: readonly { id: T; label: string }[];
    value: T;
    onchange: (next: T) => void;
  } = $props();
</script>

<div class="flex w-fit items-baseline gap-4 border-b border-line-strong">
  <span id="{name}-label" class="text-text">{label}</span>
  <div class="flex gap-3" role="radiogroup" aria-labelledby="{name}-label">
    {#each options as option (option.id)}
      <label
        class="-mb-px cursor-pointer border-b-2 border-transparent px-[0.1rem] py-1 text-muted has-checked:border-accent has-checked:font-semibold has-checked:text-text has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent"
      >
        <input class="sr-only" type="radio" {name} checked={value === option.id} onchange={() => onchange(option.id)} />
        {option.label}
      </label>
    {/each}
  </div>
</div>
