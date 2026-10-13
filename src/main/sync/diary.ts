import { app } from 'electron'
import path from 'path'
import fs from 'fs-extra'
import type { DiaryEntry } from '../../shared/types/diary'
import type { PushResult, PullResult, SyncStatus } from '../../shared/types/sync'
import { getSyncSettings } from '../storage/settings'
import { getEntry, listEntriesForSync, upsertSyncedEntry } from '../storage/diary'

interface SyncState {
  lastPushAt: string | null
  lastPullAt: string | null
  lastError: string | null
}

function getStatePath(): string {
  return path.join(app.getPath('userData'), 'data', 'syncState.json')
}

async function readState(): Promise<SyncState> {
  const filePath = getStatePath()
  if (await fs.pathExists(filePath)) {
    const raw = (await fs.readJSON(filePath)) as Partial<SyncState>
    return {
      lastPushAt: raw.lastPushAt ?? null,
      lastPullAt: raw.lastPullAt ?? null,
      lastError: raw.lastError ?? null
    }
  }
  return { lastPushAt: null, lastPullAt: null, lastError: null }
}

async function writeState(state: SyncState): Promise<void> {
  const filePath = getStatePath()
  await fs.ensureDir(path.dirname(filePath))
  await fs.writeJSON(filePath, state, { spaces: 2 })
}

function trimTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '')
}

async function requireSettings(): Promise<{ baseUrl: string; apiKey: string }> {
  const settings = await getSyncSettings()
  if (!settings.syncBaseUrl || !settings.syncApiKey) {
    throw new Error('尚未配置同步：请先在设置页填写 Base URL 和 API Key')
  }
  return { baseUrl: settings.syncBaseUrl, apiKey: settings.syncApiKey }
}

// Per-item result returned by POST /entries/sync (see docs/diary-sync-api.md).
interface SyncUploadResult {
  id?: string
  ok?: boolean
  stale?: boolean
}

// Upload locally-changed entries (including tombstones) since the last push cursor.
export async function push(): Promise<PushResult> {
  const { baseUrl, apiKey } = await requireSettings()
  const state = await readState()

  try {
    // Snapshot cursor: any edit that lands after this timestamp rolls into the next batch.
    const now = new Date().toISOString()
    const dirty = (await listEntriesForSync(state.lastPushAt ?? '')).filter(
      (e) => e.updatedAt <= now
    )

    let staleCount = 0

    if (dirty.length > 0) {
      const res = await fetch(`${trimTrailingSlash(baseUrl)}/entries/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify(dirty)
      })
      if (!res.ok) {
        throw new Error(`上传失败：HTTP ${res.status}`)
      }

      // A 200 response can still contain per-item rejections (`ok: false`) or
      // stale skips. If we blindly advance the cursor, those entries — including
      // tombstones — would never be retried and a delete would silently vanish.
      const results = parseSyncUploadResults(safeJsonParse(await res.text()))
      const byId = new Map<string, SyncUploadResult>()
      for (const r of results) {
        if (r.id) byId.set(r.id, r)
      }

      const failedIds = dirty.filter((e) => byId.get(e.id)?.ok === false).map((e) => e.id)

      if (failedIds.length > 0) {
        throw new Error(
          `上传失败：${failedIds.length} 条条目被服务端拒绝（${failedIds.join(', ')}）`
        )
      }

      staleCount = dirty.filter((e) => byId.get(e.id)?.stale === true).length
    }

    state.lastPushAt = now
    state.lastError = null
    await writeState(state)
    return { pushedCount: dirty.length, staleCount, lastPushAt: now }
  } catch (err) {
    state.lastError = err instanceof Error ? err.message : String(err)
    await writeState(state)
    throw err
  }
}

// Tolerate backends that return an empty body or malformed JSON.
function safeJsonParse(text: string): unknown {
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

// Tolerate backends that return an empty body or a different shape.
function parseSyncUploadResults(body: unknown): SyncUploadResult[] {
  if (!body || typeof body !== 'object') return []
  const results = (body as { results?: unknown }).results
  if (!Array.isArray(results)) return []
  return results.filter((r): r is SyncUploadResult => !!r && typeof r === 'object')
}

// Pull remote changes since the last pull cursor and merge them locally.
export async function pull(): Promise<PullResult> {
  const { baseUrl, apiKey } = await requireSettings()
  const state = await readState()

  try {
    let url = `${trimTrailingSlash(baseUrl)}/entries/changes`
    if (state.lastPullAt) {
      url += `?since=${encodeURIComponent(state.lastPullAt)}`
    }

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}` }
    })
    if (!res.ok) {
      throw new Error(`下载失败：HTTP ${res.status}`)
    }

    const data = (await res.json()) as { entries?: DiaryEntry[]; serverTime?: string }
    const entries = Array.isArray(data.entries) ? data.entries : []

    let cursor = state.lastPullAt ?? ''
    for (const remote of entries) {
      await mergeRemote(remote)
      const remoteTime = remote.updatedAt ?? remote.deletedAt ?? ''
      if (remoteTime > cursor) cursor = remoteTime
    }
    if (data.serverTime && data.serverTime > cursor) cursor = data.serverTime

    state.lastPullAt = cursor
    state.lastError = null
    await writeState(state)
    return { pulledCount: entries.length, lastPullAt: cursor }
  } catch (err) {
    state.lastError = err instanceof Error ? err.message : String(err)
    await writeState(state)
    throw err
  }
}

// Merge one remote entry into local storage using last-write-wins on `updatedAt`.
async function mergeRemote(remote: DiaryEntry): Promise<void> {
  const local = await getEntry(remote.id)
  const remoteTime = remote.updatedAt ?? remote.deletedAt ?? ''

  if (!local) {
    // Unknown tombstone: nothing to delete locally, and do not "resurrect" it.
    if (remote.deletedAt) return
    await upsertSyncedEntry(remote)
    return
  }

  const localTime = local.updatedAt ?? ''
  if (remoteTime <= localTime) {
    // Local is newer (or equal): keep it. A later push will overwrite the remote.
    return
  }

  if (remote.deletedAt) {
    // Remote is a newer tombstone: mark the local entry deleted.
    await upsertSyncedEntry({
      ...local,
      deletedAt: remote.deletedAt,
      updatedAt: remote.deletedAt
    })
  } else {
    await upsertSyncedEntry(remote)
  }
}

export async function getSyncStatus(): Promise<SyncStatus> {
  const state = await readState()
  const pending = await listEntriesForSync(state.lastPushAt ?? '')
  return {
    lastPushAt: state.lastPushAt,
    lastPullAt: state.lastPullAt,
    pendingCount: pending.length,
    lastError: state.lastError
  }
}
