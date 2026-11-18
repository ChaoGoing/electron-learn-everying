/**
 * 日记模块的状态。
 *
 * 一次性把本地全部条目读进内存（`list()` 不带过滤），卡片板 / 日历 / 回顾 / 素材库
 * 都从这一份数据派生出各自的口径。日记是本地文件、单人使用，量级在千条以内，
 * 这样换来的是"没有跨页面的过期数据"——保存或同步后只刷新一处。
 *
 * 类型直接引用 `shared/types/diary`，不再在本文件里重复声明一份。
 */
import { create } from 'zustand'
import type {
  DiaryCard,
  DiaryEntry,
  ImageAsset,
  UpdateDiaryEntry
} from '../../../shared/types/diary'
import { insertCardAt } from '../lib/diaryCards'
import { pageForDate, todayKey } from '../lib/diaryStats'

interface DiaryState {
  entries: DiaryEntry[]
  images: ImageAsset[]
  isLoading: boolean
  /** 是否已经装载过一次（用于 `ensureLoaded` 的短路）。 */
  hasLoaded: boolean
  /** 卡片板正在看的那一天（`YYYY-MM-DD`）。 */
  selectedDate: string
  /** 日历 / 回顾的月份游标，month 为 0–11。 */
  year: number
  month: number
  /** 进入日记模块时装载一次；已装载则直接返回。 */
  ensureLoaded: () => Promise<void>
  load: () => Promise<void>
  selectDate: (date: string) => void
  setMonth: (year: number, month: number) => void
  /** 保存后回写单条，避免整表重载。 */
  upsertEntry: (entry: DiaryEntry) => void
  removeEntry: (id: string) => void
  /** 新建某一天的页面（已有则直接返回那一条）。 */
  createPage: (date: string) => Promise<DiaryEntry | null>
  /**
   * 写入某一天的卡片——**卡片落盘的唯一入口**。
   * 主进程返回的是规范化后的条目（字数等都重算过），直接以它为准。
   */
  saveCards: (entryId: string, cards: DiaryCard[]) => Promise<DiaryEntry | null>
  /** 删除一张卡片并重排剩余卡片的顺序。 */
  deleteCard: (entryId: string, cardId: string) => Promise<void>
  /** 复制一张卡片到它后面。 */
  duplicateCard: (entryId: string, cardId: string) => Promise<void>
}

export const useDiaryStore = create<DiaryState>((set, get) => ({
  entries: [],
  images: [],
  isLoading: false,
  hasLoaded: false,
  selectedDate: todayKey(),
  year: new Date().getFullYear(),
  month: new Date().getMonth(),

  ensureLoaded: async (): Promise<void> => {
    if (get().hasLoaded) return
    await get().load()
  },

  load: async (): Promise<void> => {
    set({ isLoading: true })
    try {
      const [entries, images] = await Promise.all([
        window.api.diary.list(),
        window.api.diary.listImages()
      ])
      set({ entries, images, hasLoaded: true })
    } catch (error) {
      console.error('加载日记失败：', error)
    } finally {
      set({ isLoading: false })
    }
  },

  selectDate: (date): void => {
    const current = get().selectedDate
    set({ selectedDate: date })
    // 跨月选日期时（迷你日历翻页）同步月份游标。
    if (current.slice(0, 7) !== date.slice(0, 7)) {
      const [year, month] = date.split('-').map(Number)
      set({ year, month: month - 1 })
    }
  },

  setMonth: (year, month): void => set({ year, month }),

  upsertEntry: (entry): void =>
    set((state) => {
      const index = state.entries.findIndex((current) => current.id === entry.id)
      if (index === -1) return { entries: [entry, ...state.entries] }
      const entries = [...state.entries]
      entries[index] = entry
      return { entries }
    }),

  removeEntry: (id): void =>
    set((state) => ({ entries: state.entries.filter((entry) => entry.id !== id) })),

  createPage: async (date): Promise<DiaryEntry | null> => {
    const existing = pageForDate(get().entries, date)
    if (existing) return existing
    try {
      const created = await window.api.diary.create({})
      // 主进程按"现在"建文件；这里把日期改到用户正在看的那一天（会搬文件）。
      const moved =
        created.createdAt.slice(0, 10) === date
          ? created
          : await window.api.diary.update(created.id, { date })
      if (!moved) return created
      get().upsertEntry(moved)
      return moved
    } catch (error) {
      console.error('新建页面失败：', error)
      return null
    }
  },

  saveCards: async (entryId, cards): Promise<DiaryEntry | null> => {
    try {
      const saved = await window.api.diary.update(entryId, { cards })
      if (saved) get().upsertEntry(saved)
      return saved
    } catch (error) {
      console.error('保存卡片失败：', error)
      return null
    }
  },

  deleteCard: async (entryId, cardId): Promise<void> => {
    const entry = get().entries.find((item) => item.id === entryId)
    if (!entry) return
    const remaining = entry.cards
      .filter((card) => card.id !== cardId)
      .map((card, index) => ({ ...card, order: index }))
    await get().saveCards(entryId, remaining)
  },

  duplicateCard: async (entryId, cardId): Promise<void> => {
    const entry = get().entries.find((item) => item.id === entryId)
    if (!entry) return
    const index = entry.cards.findIndex((card) => card.id === cardId)
    if (index === -1) return
    const clone: DiaryCard = { ...entry.cards[index], id: globalThis.crypto.randomUUID() }
    await get().saveCards(entryId, insertCardAt(entry.cards, clone, index + 1))
  }
}))

/**
 * 保存一条日记并同步进 store。
 * 主进程返回的是规范化后的条目（字数、迁移结果都在里面），直接以它为准。
 */
export async function saveEntry(id: string, patch: UpdateDiaryEntry): Promise<DiaryEntry | null> {
  const saved = await window.api.diary.update(id, patch)
  if (saved) useDiaryStore.getState().upsertEntry(saved)
  return saved
}
