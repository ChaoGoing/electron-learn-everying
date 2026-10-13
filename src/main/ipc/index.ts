import { registerWindowHandlers } from './window'
import { registerDiaryHandlers } from './diary'
import { registerSyncHandlers } from './sync'

export function registerAllHandlers(): void {
  registerWindowHandlers()
  registerDiaryHandlers()
  registerSyncHandlers()
}
