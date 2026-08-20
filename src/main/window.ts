import { BrowserWindow } from 'electron'

/**
 * Get the focused window, or the first available window.
 */
export function getWindow(): BrowserWindow | null {
  const win = BrowserWindow.getFocusedWindow()
  if (win) return win
  const all = BrowserWindow.getAllWindows()
  return all.length > 0 ? all[0] : null
}

export function minimizeWindow(): void {
  const win = getWindow()
  if (win) win.minimize()
}

export function maximizeWindow(): void {
  const win = getWindow()
  if (win) {
    if (win.isMaximized()) {
      win.unmaximize()
    } else {
      win.maximize()
    }
  }
}

export function closeWindow(): void {
  const win = getWindow()
  if (win) win.close()
}

export function isMaximized(): boolean {
  const win = getWindow()
  return win ? win.isMaximized() : false
}