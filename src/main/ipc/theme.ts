import { BrowserWindow, ipcMain, nativeTheme } from 'electron'
import { IPC_CHANNELS } from '../../shared/types/ipc'
import type { ThemeMode } from '../../shared/types/theme'

/**
 * 主题相关的 IPC。
 *
 * `nativeTheme.themeSource` 是让「跟随系统」与嵌入子页面真正一致的关键：
 * 把应用内的选择同步给主进程后，webview / iframe 里的 `prefers-color-scheme`
 * 媒体查询也会返回应用选择的明暗，而不是操作系统的。
 */

const VALID_MODES: readonly ThemeMode[] = ['light', 'dark', 'system']

export function registerThemeHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.THEME_SET_NATIVE_THEME, (_event, mode: ThemeMode) => {
    if (!VALID_MODES.includes(mode)) return nativeTheme.themeSource
    nativeTheme.themeSource = mode
    return nativeTheme.themeSource
  })

  ipcMain.handle(IPC_CHANNELS.THEME_GET_NATIVE_THEME, () => ({
    source: nativeTheme.themeSource,
    shouldUseDarkColors: nativeTheme.shouldUseDarkColors
  }))

  // 系统偏好变化时广播给所有窗口，渲染进程据此重算「跟随系统」的实际明暗。
  nativeTheme.on('updated', () => {
    BrowserWindow.getAllWindows().forEach((win) => {
      if (!win.isDestroyed()) {
        win.webContents.send(IPC_CHANNELS.THEME_SYSTEM_CHANGED, nativeTheme.shouldUseDarkColors)
      }
    })
  })
}
