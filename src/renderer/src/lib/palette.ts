/**
 * Scoped color-palette architecture.
 *
 * The app's visual tokens are defined in `styles/index.css` and consumed by
 * Tailwind utilities through `var(--color-…)`. A "palette" is simply a named
 * override block keyed off `:root[data-palette='<id>']`. Switching a palette
 * therefore re-themes the entire app (sidebar, titlebar, cards …) without
 * touching individual components.
 */
export type PaletteId = 'default' | 'journal'

const PALETTE_ATTRIBUTE = 'data-palette'

/** Apply a palette to the document root, or restore the default one. */
export function applyPalette(palette: PaletteId): void {
  const root = document.documentElement
  if (palette === 'default') {
    root.removeAttribute(PALETTE_ATTRIBUTE)
  } else {
    root.setAttribute(PALETTE_ATTRIBUTE, palette)
  }
}
