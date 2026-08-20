import { registerWindowHandlers } from './window'
import { registerDiaryHandlers } from './diary'

export function registerAllHandlers(): void {
  registerWindowHandlers()
  registerDiaryHandlers()
}