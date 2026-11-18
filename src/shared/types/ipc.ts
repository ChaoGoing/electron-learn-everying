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

  // Theme (native chrome + embedded pages)
  THEME_SET_NATIVE_THEME: 'theme:setNativeTheme',
  THEME_GET_NATIVE_THEME: 'theme:getNativeTheme',
  /** 主进程 → 渲染进程：系统明暗偏好变化（`nativeTheme` 事件转发）。 */
  THEME_SYSTEM_CHANGED: 'theme:systemChanged',

  // Diary
  DIARY_CREATE: 'diary:create',
  DIARY_UPDATE: 'diary:update',
  DIARY_DELETE: 'diary:delete',
  DIARY_GET: 'diary:get',
  DIARY_LIST: 'diary:list',
  DIARY_SEARCH: 'diary:search',
  DIARY_GET_BY_DATE: 'diary:getByDate',
  DIARY_GET_DATES: 'diary:getDates',
  DIARY_UPLOAD_IMAGE: 'diary:uploadImage',
  DIARY_UPLOAD_IMAGES: 'diary:uploadImages',
  DIARY_LIST_IMAGES: 'diary:listImages',
  DIARY_PUSH: 'diary:push',
  DIARY_PULL: 'diary:pull',
  DIARY_GET_SYNC_STATUS: 'diary:getSyncStatus',

  // Settings
  SETTINGS_GET_SYNC: 'settings:getSync',
  SETTINGS_SET_SYNC: 'settings:setSync'
} as const

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS]
