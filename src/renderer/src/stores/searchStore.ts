import { create } from 'zustand'

export interface SearchResult {
  id: string
  type: 'diary' | 'blog' | 'project'
  title: string
  snippet: string
  path: string
}

interface SearchState {
  query: string
  results: SearchResult[]
  isLoading: boolean
  setQuery: (query: string) => void
  setResults: (results: SearchResult[]) => void
  setLoading: (loading: boolean) => void
}

export const useSearchStore = create<SearchState>((set) => ({
  query: '',
  results: [],
  isLoading: false,
  setQuery: (query): void => set({ query }),
  setResults: (results): void => set({ results }),
  setLoading: (isLoading): void => set({ isLoading })
}))
