import { TitleBar } from './TitleBar'
import { Sidebar } from './Sidebar'
import { ContentArea } from './ContentArea'
import { useRoutePalette } from '../../hooks/useRoutePalette'
import type { PaletteId } from '../../lib/palette'

/** Map a route to the app-wide palette it should activate. */
const resolvePalette = (pathname: string): PaletteId =>
  pathname.startsWith('/diary') ? 'journal' : 'default'

export function AppLayout(): JSX.Element {
  useRoutePalette(resolvePalette)

  return (
    <div className="h-screen flex flex-col bg-surface-light dark:bg-surface-dark smooth-theme">
      <TitleBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <ContentArea />
      </div>
    </div>
  )
}
