import { app } from 'electron'
import path from 'path'
import fs from 'fs-extra'
import type { SyncSettings } from '../../shared/types/sync'

function getSettingsPath(): string {
  return path.join(app.getPath('userData'), 'data', 'settings.json')
}

export async function getSyncSettings(): Promise<SyncSettings> {
  const filePath = getSettingsPath()
  if (await fs.pathExists(filePath)) {
    const raw = (await fs.readJSON(filePath)) as Partial<SyncSettings>
    return {
      syncBaseUrl: raw.syncBaseUrl ?? '',
      syncApiKey: raw.syncApiKey ?? ''
    }
  }
  return { syncBaseUrl: '', syncApiKey: '' }
}

export async function setSyncSettings(settings: SyncSettings): Promise<void> {
  const filePath = getSettingsPath()
  const existing = (await fs.pathExists(filePath))
    ? ((await fs.readJSON(filePath)) as Record<string, unknown>)
    : {}

  await fs.ensureDir(path.dirname(filePath))
  await fs.writeJSON(
    filePath,
    { ...existing, syncBaseUrl: settings.syncBaseUrl, syncApiKey: settings.syncApiKey },
    { spaces: 2 }
  )
}
