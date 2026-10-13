import { create } from 'zustand'
import type { SyncStatus, PushResult, PullResult } from '../../../shared/types/sync'

interface SyncState {
  status: SyncStatus
  isPushing: boolean
  isPulling: boolean
  refresh: () => Promise<void>
  push: () => Promise<PushResult>
  pull: () => Promise<PullResult>
}

export const useSyncStore = create<SyncState>((set, get) => ({
  status: { lastPushAt: null, lastPullAt: null, pendingCount: 0, lastError: null },
  isPushing: false,
  isPulling: false,

  refresh: async (): Promise<void> => {
    try {
      const status = await window.api.diary.getSyncStatus()
      set({ status })
    } catch {
      // Keep the previous status if refresh fails.
    }
  },

  push: async (): Promise<PushResult> => {
    set({ isPushing: true })
    try {
      const result = await window.api.diary.push()
      await get().refresh()
      return result
    } catch (err) {
      await get().refresh()
      throw err
    } finally {
      set({ isPushing: false })
    }
  },

  pull: async (): Promise<PullResult> => {
    set({ isPulling: true })
    try {
      const result = await window.api.diary.pull()
      await get().refresh()
      return result
    } catch (err) {
      await get().refresh()
      throw err
    } finally {
      set({ isPulling: false })
    }
  }
}))
