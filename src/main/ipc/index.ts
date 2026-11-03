import { registerWindowHandlers } from './window'
import { registerDiaryHandlers } from './diary'
import { registerSyncHandlers } from './sync'
import { registerThemeHandlers } from './theme'

export function registerAllHandlers(): void {
  registerWindowHandlers()
  registerDiaryHandlers()
  registerSyncHandlers()
  registerThemeHandlers()
}
