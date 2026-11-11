<script lang="ts">
  import { linkCitations, type Source, type SummaryPart } from './openrouter';

  let {
    text,
    sources,
    starts = [],
    writing = false,
  }: { text: string; sources: Source[]; starts?: number[]; writing?: boolean } = $props();

  // starts holds where each streamed update began. Every piece of text is its own span keyed by where it starts,
  // so only text that just arrived fades in.
  const pieces = $derived.by(() => {
    const out: (SummaryPart & { start: number })[] = [];
    let offset = 0;
    for (const part of linkCitations(text, sources)) {
      const end = offset + part.text.length;
      if ('href' in part) {
        out.push({ ...part, start: offset });
      } else {
        let from = offset;
        for (const cut of starts) {
          if (cut <= from || cut >= end) continue;
          out.push({ text: text.slice(from, cut), start: from });
          from = cut;
        }
        out.push({ text: text.slice(from, end), start: from });
      }
      offset = end;
    }
    return out;
  });
</script>

<!-- Model output is untrusted: it only ever renders as text, plus links to real results. -->
<p class="font-serif text-[1.05rem] wrap-anywhere whitespace-pre-wrap">{#each pieces as piece (piece.start)}{#if 'href' in piece}<a class="ink font-sans text-[0.75em] font-semibold text-accent no-underline hover:underline" href={piece.href} title={piece.title} rel="noreferrer">{piece.text}</a>{:else}<span class="ink">{piece.text}</span>{/if}{/each}{#if writing}<span class="caret" aria-hidden="true"></span>{/if}</p>
