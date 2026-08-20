// IPC channel name constants — domain:action naming convention
export const IPC_CHANNELS = {
  // Window controls
  WINDOW_MINIMIZE: 'window:minimize',
  WINDOW_MAXIMIZE: 'window:maximize',
  WINDOW_CLOSE: 'window:close',
  WINDOW_IS_MAXIMIZED: 'window:isMaximized',

  // App
  APP_GET_VERSION: 'app:getVersion',
  APP_GET_PATH: 'app:getPath',
  APP_CHECK_UPDATE: 'app:checkUpdate',
  APP_QUIT_AND_INSTALL: 'app:quitAndInstall',

  // File system
  FILE_OPEN_DIALOG: 'file:openDialog',
  FILE_SAVE_DIALOG: 'file:saveDialog',
  FILE_READ: 'file:read',
  FILE_WRITE: 'file:write',

  // Shell
  SHELL_OPEN_EXTERNAL: 'shell:openExternal',
  SHELL_OPEN_PATH: 'shell:openPath',
  SHELL_OPEN_TERMINAL: 'shell:openTerminal',
  SHELL_OPEN_VSCODE: 'shell:openVscode',
} as const

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS]