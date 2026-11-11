import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  allSources,
  formatCost,
  formatDuration,
  linkCitations,
  sourcesFor,
  streamFollowUp,
  streamSummary,
  SummaryError,
  type FollowUp,
  type Summary,
} from './openrouter';
import type { SearchResult } from './searxng';

function result(index: number, extra: Partial<SearchResult> = {}): SearchResult {
  return {
    url: `https://example.com/${index}`,
    title: `Result ${index}`,
    content: `Snippet ${index}`,
    engine: 'test',
    engines: ['test'],
    publishedDate: null,
    img_src: '',
    ...extra,
  };
}

// A reply the way OpenRouter streams it: one data line per chunk, then the end marker.
function stream(chunks: object[], done = true): Response {
  const lines = chunks.map((chunk) => `data: ${JSON.stringify(chunk)}\n\n`);
  return new Response([': OPENROUTER PROCESSING\n\n', ...lines, done ? 'data: [DONE]\n\n' : ''].join(''), {
    headers: { 'content-type': 'text/event-stream' },
  });
}

function text(content: string, finish?: string) {
  return { choices: [{ delta: { content }, finish_reason: finish ?? null }] };
}

// Answers each request with the next reply and records the bodies that were sent.
function mockFetch(...replies: Response[]) {
  const bodies: any[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (_url: string, init: RequestInit) => {
      bodies.push(JSON.parse(init.body as string));
      return replies.shift()!;
    }),
  );
  return bodies;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('linkCitations', () => {
  const sources = [
    { title: 'One', url: 'https://one.test/' },
    { title: 'Two', url: 'javascript:alert(1)' },
  ];

  it('links numbers that match a source', () => {
    expect(linkCitations('Tall [1]. End', sources)).toEqual([
      { text: 'Tall ' },
      { text: '[1]', href: 'https://one.test/', source: sources[0] },
      { text: '. End' },
    ]);
  });

  it('leaves numbers without a source, or with an unsafe address, as text', () => {
    for (const part of linkCitations('[0][2][3][999]', sources)) expect(part).not.toHaveProperty('href');
  });

  it('keeps all of the text', () => {
    const written = 'A [1][2] b [x] [1234] c';
    expect(linkCitations(written, sources).map((part) => part.text).join('')).toBe(written);
  });
});

describe('sourcesFor', () => {
  it('keeps the first eight results', () => {
    const sources = sourcesFor(Array.from({ length: 12 }, (_, index) => result(index)));
    expect(sources).toHaveLength(8);
    expect(sources[7]).toEqual({ title: 'Result 7', url: 'https://example.com/7', snippet: 'Snippet 7', image: undefined });
  });

  it('tidies and shortens snippets', () => {
    const [source] = sourcesFor([result(0, { content: `  a\n\tb  ${'x'.repeat(500)}` })]);
    expect(source!.snippet).toHaveLength(400);
    expect(source!.snippet!.startsWith('a b x')).toBe(true);
  });

  it('keeps a picture only when it is a short web address', () => {
    const pictures = sourcesFor([
      result(0, { thumbnail: 'https://img.test/a.png' }),
      result(1, { img_src: 'data:image/png;base64,AAAA' }),
      result(2, { img_src: `https://img.test/${'a'.repeat(1000)}` }),
    ]).map((source) => source.image);
    expect(pictures).toEqual(['https://img.test/a.png', undefined, undefined]);
  });
});

describe('allSources', () => {
  it('numbers follow-up searches after the summary\'s results, in order', () => {
    const a = { title: 'a', url: 'https://a.test/' };
    const b = { title: 'b', url: 'https://b.test/' };
    const c = { title: 'c', url: 'https://c.test/' };
    const followUps: FollowUp[] = [
      { question: 'q1', text: '', cutOff: false, search: { query: 's', sources: [b] } },
      { question: 'q2', text: '', cutOff: false },
      { question: 'q3', text: '', cutOff: false, search: { query: 's', sources: [c] } },
    ];
    expect(allSources({ sources: [a], followUps })).toEqual([a, b, c]);
    expect(allSources({ sources: [a] })).toEqual([a]);
  });
});

describe('formatting', () => {
  it('shows small costs with two significant digits', () => {
    expect(formatCost(0.000123)).toBe('$0.00012');
    expect(formatCost(0.0456)).toBe('$0.046');
  });

  it('shows durations in seconds', () => {
    expect(formatDuration(1234)).toBe('1.2s');
    expect(formatDuration(3000)).toBe('3.0s');
  });
});

describe('streamSummary', () => {
  it('reports the text as it arrives, then the finished summary', async () => {
    const bodies = mockFetch(stream([text('Tall '), text('peak [1].', 'stop'), { choices: [], usage: { cost: 0.002 } }]));
    const heard: string[] = [];
    const summary = await streamSummary(
      'everest',
      [result(1, { thumbnail: 'https://img.test/a.png' })],
      new AbortController().signal,
      (partial) => heard.push(partial),
    );

    expect(heard).toEqual(['Tall ', 'Tall peak [1].']);
    expect(summary).toMatchObject({ text: 'Tall peak [1].', cutOff: false, cost: 0.002 });
    expect(summary.sources).toEqual([
      { title: 'Result 1', url: 'https://example.com/1', snippet: 'Snippet 1', image: 'https://img.test/a.png' },
    ]);
    // The model gets the numbered results, without the pictures.
    expect(JSON.parse(bodies[0].messages[1].content)).toEqual({
      query: 'everest',
      results: [{ number: 1, title: 'Result 1', url: 'https://example.com/1', snippet: 'Snippet 1' }],
    });
    expect(bodies[0].tools).toBeUndefined();
  });

  it('marks a summary that hit the length limit as cut off', async () => {
    mockFetch(stream([text('Tall', 'length')]));
    const summary = await streamSummary('everest', [result(1)], new AbortController().signal, () => {});
    expect(summary.cutOff).toBe(true);
  });

  it('fails when the stream ends early or carries an error', async () => {
    const signal = new AbortController().signal;
    mockFetch(stream([text('Tall')], false));
    await expect(streamSummary('everest', [result(1)], signal, () => {})).rejects.toThrow('ended before');

    mockFetch(stream([{ error: { message: 'overloaded' } }]));
    await expect(streamSummary('everest', [result(1)], signal, () => {})).rejects.toThrow('overloaded');
  });

  it('explains a missing key without offering a retry', async () => {
    mockFetch(Response.json({ error: { code: 'not_configured' } }, { status: 503 }));
    const failure = await streamSummary('everest', [result(1)], new AbortController().signal, () => {}).catch(
      (error) => error,
    );
    expect(failure).toBeInstanceOf(SummaryError);
    expect(failure.canRetry).toBe(false);
  });

  it('treats an HTML page as the sign-in having expired', async () => {
    mockFetch(new Response('<html>', { headers: { 'content-type': 'text/html' } }));
    await expect(streamSummary('everest', [result(1)], new AbortController().signal, () => {})).rejects.toThrow(
      'sign-in may have expired',
    );
  });
});

describe('streamFollowUp', () => {
  const base: Summary = { text: 'Tall peak [1].', cutOff: false, sources: sourcesFor([result(1)]) };
  const signal = new AbortController().signal;

  it('answers from the results it has when the model does not search', async () => {
    const bodies = mockFetch(stream([text('In Nepal [1].', 'stop')]));
    const runSearch = vi.fn();
    const followUp = await streamFollowUp('everest', base, ' Where is it? ', signal, () => {}, () => {}, runSearch);

    expect(followUp).toMatchObject({ question: 'Where is it?', text: 'In Nepal [1].', cutOff: false });
    expect(followUp.search).toBeUndefined();
    expect(runSearch).not.toHaveBeenCalled();
    expect(bodies[0].tool_choice).toBe('auto');
    expect(bodies[0].messages.at(-1)).toEqual({ role: 'user', content: '{"follow_up_question":"Where is it?"}' });
  });

  it('searches when the model asks, numbering only the new results', async () => {
    const call = (args: string) => ({
      choices: [{ delta: { tool_calls: [{ index: 0, function: { name: args ? '' : 'search', arguments: args } }] } }],
    });
    const bodies = mockFetch(
      stream([call(''), call('{"query":"everest '), call('first ascent"}'), { choices: [{ delta: {}, finish_reason: 'tool_calls' }] }]),
      stream([text('In 1953 [2].', 'stop')]),
    );
    const searches: unknown[] = [];
    const followUp = await streamFollowUp(
      'everest',
      base,
      'First climbed?',
      signal,
      () => {},
      (search) => searches.push(search),
      async () => [result(1), result(2)],
    );

    const found = { query: 'everest first ascent', sources: sourcesFor([result(2)]) };
    expect(searches).toEqual([{ query: 'everest first ascent' }, found]);
    expect(followUp).toMatchObject({ text: 'In 1953 [2].', search: found });
    // The second request shows the model its search, numbered on from the summary's results, and stops it searching again.
    expect(bodies[1].tool_choice).toBe('none');
    expect(JSON.parse(bodies[1].messages.at(-1).content).results[0]).toMatchObject({
      number: 2,
      url: 'https://example.com/2',
    });
  });

  it('drops the oldest follow-ups until the request fits', async () => {
    const followUps: FollowUp[] = Array.from({ length: 4 }, (_, index) => ({
      question: `question ${index}`,
      text: 'x'.repeat(50_000),
      cutOff: false,
    }));
    const bodies = mockFetch(stream([text('Answer.', 'stop')]));
    await streamFollowUp('everest', { ...base, followUps }, 'And now?', signal, () => {}, () => {}, vi.fn());

    const sent = JSON.stringify(bodies[0]);
    expect(new TextEncoder().encode(sent).length).toBeLessThanOrEqual(120_000);
    const asked = bodies[0].messages.filter((message: any) => message.role === 'user').map((message: any) => message.content);
    expect(asked.some((content: string) => content.includes('question 0'))).toBe(false);
    expect(asked.some((content: string) => content.includes('question 3'))).toBe(true);
  });

  it('gives up when the request cannot be made to fit', async () => {
    mockFetch();
    const huge: Summary = { ...base, text: 'x'.repeat(130_000) };
    const failure = await streamFollowUp('everest', huge, 'And now?', signal, () => {}, () => {}, vi.fn()).catch(
      (error) => error,
    );
    expect(failure).toBeInstanceOf(SummaryError);
    expect(failure.message).toContain('too long');
  });
});
