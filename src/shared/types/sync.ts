// Sync-related shared types used by both main and renderer processes.

export interface SyncSettings {
  syncBaseUrl: string
  syncApiKey: string
}

export interface SyncStatus {
  lastPushAt: string | null
  lastPullAt: string | null
  /** Number of local entries (including tombstones) waiting to be pushed. */
  pendingCount: number
  /** Last error message, cleared on a successful push/pull. */
  lastError: string | null
}

export interface PushResult {
  pushedCount: number
  /** Number of entries the server skipped because it already has a newer version (stale). */
  staleCount: number
  lastPushAt: string | null
}

export interface PullResult {
  pulledCount: number
  lastPullAt: string | null
}
