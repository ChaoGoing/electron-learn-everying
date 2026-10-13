import { useLayoutEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { applyPalette, type PaletteId } from '../lib/palette'

type PaletteResolver = (pathname: string) => PaletteId

/**
 * Switches the app-wide palette based on the current route, applying the
 * attribute before paint (`useLayoutEffect`) to avoid a one-frame flash.
 */
export function useRoutePalette(resolvePalette: PaletteResolver): void {
  const { pathname } = useLocation()

  useLayoutEffect(() => {
    applyPalette(resolvePalette(pathname))
  }, [pathname, resolvePalette])
}
