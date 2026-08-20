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
  setQuery: (query) => set({ query }),
  setResults: (results) => set({ results }),
  setLoading: (isLoading) => set({ isLoading }),
}))