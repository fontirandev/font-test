import { useSyncExternalStore } from 'react';

/** grid: a labelled cell per glyph; row: the glyphs set side by side in one box. */
export type GlyphView = 'row' | 'grid';

/**
 * The glyph tab's open view. It outlives the tab (switching tabs unmounts the list)
 * but not a reload, so it is kept in memory rather than in browser storage. The
 * sidebar reads it too: font size and display apply to the row view only.
 */
let current: GlyphView = 'row';
const listeners = new Set<() => void>();

export function setGlyphView(next: GlyphView) {
  current = next;
  listeners.forEach((listener) => listener());
}

export function useGlyphView(): GlyphView {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => current,
  );
}
