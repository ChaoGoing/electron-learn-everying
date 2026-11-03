/**
 * Scoped color-palette architecture.
 *
 * The app's visual tokens are defined in `styles/index.css` and consumed by
 * Tailwind utilities through `var(--color-…)`. A "palette" is simply a named
 * override block keyed off `:root[data-palette='<id>']`. Switching a palette
 * therefore re-themes the entire app (sidebar, titlebar, cards …) without
 * touching individual components.
 *
 * The palette is part of the theme state and lives in `themeStore`; this module
 * keeps the id type and the DOM writer so non-React callers stay framework-free.
 */
import type { PaletteId } from '../../../shared/types/theme'

export type { PaletteId }

export { applyPaletteToDocument as applyPalette } from './theme'
