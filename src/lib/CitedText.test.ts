import { flushSync, mount, unmount } from 'svelte';
import { afterEach, describe, expect, it } from 'vitest';
import CitedText from './CitedText.svelte';

const sources = [
  { title: 'Everest', url: 'https://www.example.com/everest', snippet: 'The tallest mountain.' },
  { title: 'K2', url: 'https://k2.test/', snippet: 'The second tallest.', image: 'https://img.test/k2.png' },
];

let component: ReturnType<typeof mount> | undefined;
// Whether the last click was left to follow its link. jsdom can't navigate, so the click stops here either way.
// It listens on the window, past the root where Svelte handles its delegated events.
let followed: boolean | undefined;

function render(text: string) {
  addEventListener('click', onClick);
  component = mount(CitedText, { target: document.body, props: { text, sources } });
  flushSync();
  return [...document.querySelectorAll('a')];
}

function onClick(event: MouseEvent) {
  followed = !event.defaultPrevented;
  event.preventDefault();
}

function pointerDown(target: Element, pointerType: string) {
  target.dispatchEvent(new PointerEvent('pointerdown', { pointerType, bubbles: true }));
}

function click(target: Element) {
  target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  flushSync();
  return followed;
}

function card() {
  return document.querySelector('[role="tooltip"]');
}

afterEach(() => {
  if (component) unmount(component);
  component = undefined;
  removeEventListener('click', onClick);
  document.body.innerHTML = '';
});

describe('CitedText', () => {
  it('links only the citations that have a source', () => {
    const links = render('Tall [1], taller [2], unknown [3].');
    expect(links.map((link) => link.getAttribute('href'))).toEqual(['https://www.example.com/everest', 'https://k2.test/']);
    expect(document.body.textContent).toContain('unknown [3].');
    expect(card()).toBeNull();
  });

  it('previews the source on hover, with the site icon when it has no picture', () => {
    const [first] = render('Tall [1], taller [2].');
    first!.dispatchEvent(new MouseEvent('mouseenter'));
    flushSync();

    expect(card()!.textContent).toContain('example.com');
    expect(card()!.textContent).toContain('Everest');
    expect(card()!.textContent).toContain('The tallest mountain.');
    expect(card()!.querySelector('img')!.getAttribute('src')).toBe('https://www.example.com/favicon.ico');
    expect(first!.getAttribute('aria-describedby')).toBe(card()!.id);

    first!.dispatchEvent(new MouseEvent('mouseleave'));
    flushSync();
    expect(card()).toBeNull();
  });

  it('shows the picture instead of the icon, and falls back when it fails', () => {
    const [, second] = render('Tall [1], taller [2].');
    second!.dispatchEvent(new FocusEvent('focus'));
    flushSync();
    expect(card()!.querySelector('img')!.getAttribute('src')).toBe('https://img.test/k2.png');

    card()!.querySelector('img')!.dispatchEvent(new Event('error'));
    flushSync();
    expect(card()!.querySelector('img')!.getAttribute('src')).toBe('https://k2.test/favicon.ico');
  });

  it('follows the link straight away for a mouse click', () => {
    const [first] = render('Tall [1].');
    pointerDown(first!, 'mouse');
    expect(click(first!)).toBe(true);
  });

  it('opens the preview on the first tap and follows the link on the second', () => {
    const [first] = render('Tall [1].');
    pointerDown(first!, 'touch');
    expect(click(first!)).toBe(false);
    expect(card()!.textContent).toContain('Everest');

    pointerDown(first!, 'touch');
    expect(click(first!)).toBe(true);
  });

  it('closes the preview on a tap elsewhere, so the next tap opens it again', () => {
    const [first, second] = render('Tall [1], taller [2].');
    pointerDown(first!, 'touch');
    click(first!);

    pointerDown(document.body, 'touch');
    flushSync();
    expect(card()).toBeNull();

    pointerDown(second!, 'touch');
    expect(click(second!)).toBe(false);
    expect(card()!.textContent).toContain('K2');
    pointerDown(first!, 'touch');
    flushSync();
    expect(click(first!)).toBe(false);
    expect(card()!.textContent).toContain('Everest');
  });

  it('follows the link from the keyboard even after a tap', () => {
    const [first, second] = render('Tall [1], taller [2].');
    pointerDown(first!, 'touch');
    click(first!);
    second!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(click(second!)).toBe(true);
  });
});
