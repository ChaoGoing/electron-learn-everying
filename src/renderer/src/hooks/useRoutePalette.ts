import { useLayoutEffect } from 'react'
import { useLocation } from 'react-router-dom'
import type { PaletteId } from '../lib/palette'
import { useThemeStore } from '../stores/themeStore'

type PaletteResolver = (pathname: string) => PaletteId

/**
 * Switches the app-wide palette based on the current route, applying the
 * attribute before paint (`useLayoutEffect`) to avoid a one-frame flash.
 *
 * The palette lives in `themeStore` so that `themeBridge` can react to it and
 * forward the change to embedded child pages.
 */
export function useRoutePalette(resolvePalette: PaletteResolver): void {
  const { pathname } = useLocation()
  const setPalette = useThemeStore((s) => s.setPalette)

  useLayoutEffect(() => {
    setPalette(resolvePalette(pathname))
  }, [pathname, resolvePalette, setPalette])
}
