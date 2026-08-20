import { create } from 'zustand'

export interface DiaryEntry {
  id: string
  title: string
  content: string
  mood: string | null
  weather: string | null
  tags: string[]
  isFavorite: boolean
  wordCount: number
  createdAt: string
  updatedAt: string
}

interface DiaryState {
  entries: DiaryEntry[]
  selectedDate: string | null
  isLoading: boolean
  setEntries: (entries: DiaryEntry[]) => void
  setSelectedDate: (date: string | null) => void
  setLoading: (loading: boolean) => void
}

export const useDiaryStore = create<DiaryState>((set) => ({
  entries: [],
  selectedDate: null,
  isLoading: false,
  setEntries: (entries) => set({ entries }),
  setSelectedDate: (selectedDate) => set({ selectedDate }),
  setLoading: (isLoading) => set({ isLoading }),
}))