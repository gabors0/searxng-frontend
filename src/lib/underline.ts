import type { Action } from 'svelte/action';

const SELECTED = '[aria-current]:not([aria-current="false"]), [aria-selected="true"], label:has(:checked)';

// One accent bar slides to the selected item, instead of each item drawing its own border.
// The container needs the slide-underline class and a position. The parameter only signals a change of selection.
export const underline: Action<HTMLElement, unknown> = (container) => {
  const style = container.style;

  // Custom properties go through the CSSOM, which the CSP allows, unlike style attributes.
  function place() {
    const selected = container.querySelector<HTMLElement>(SELECTED);
    if (!selected) {
      style.setProperty('--bar-opacity', '0');
      return;
    }
    style.setProperty('--bar-x', `${selected.offsetLeft}px`);
    style.setProperty('--bar-y', `${selected.offsetTop + selected.offsetHeight - 2}px`);
    style.setProperty('--bar-w', `${selected.offsetWidth}px`);
    style.removeProperty('--bar-opacity');
  }

  // Fonts loading, weight changes and wrapping all move the items without a new selection.
  const observer = new ResizeObserver(place);
  function observe() {
    observer.observe(container);
    for (const child of container.children) observer.observe(child);
  }

  observe();
  place();

  // The first position is drawn in place; sliding starts once it has been painted.
  let frame = requestAnimationFrame(() => {
    frame = requestAnimationFrame(() => (container.dataset.sliding = ''));
  });

  return {
    update() {
      observe();
      place();
    },
    destroy() {
      cancelAnimationFrame(frame);
      observer.disconnect();
    },
  };
};
