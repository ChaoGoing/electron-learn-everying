export interface DiaryEntry {
  id: string
  title: string
  content: string // HTML from Tiptap
  mood: string | null
  weather: string | null
  tags: string[]
  isFavorite: boolean
  wordCount: number
  createdAt: string
  updatedAt: string
  /** Soft-delete tombstone. Non-null means the entry has been deleted. */
  deletedAt: string | null
}

export interface CreateDiaryEntry {
  title?: string
  content?: string
  mood?: string | null
  weather?: string | null
  tags?: string[]
}

export interface UpdateDiaryEntry {
  title?: string
  content?: string
  mood?: string | null
  weather?: string | null
  tags?: string[]
  isFavorite?: boolean
  wordCount?: number
}

export interface DiaryFilters {
  date?: string // ISO date string YYYY-MM-DD
  year?: number
  month?: number
  mood?: string
  tag?: string
  search?: string
  limit?: number
  offset?: number
}
