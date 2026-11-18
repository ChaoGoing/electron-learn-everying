import { create } from 'zustand'

export interface BlogPost {
  id: string
  title: string
  slug: string
  content: string
  excerpt: string
  status: 'draft' | 'published'
  tags: string[]
  createdAt: string
  updatedAt: string
  publishedAt: string | null
}

export interface BlogTag {
  id: string
  name: string
  slug: string
  color: string
}

interface BlogState {
  posts: BlogPost[]
  tags: BlogTag[]
  filterStatus: 'all' | 'draft' | 'published'
  isLoading: boolean
  setPosts: (posts: BlogPost[]) => void
  setTags: (tags: BlogTag[]) => void
  setFilterStatus: (status: 'all' | 'draft' | 'published') => void
  setLoading: (loading: boolean) => void
}

export const useBlogStore = create<BlogState>((set) => ({
  posts: [],
  tags: [],
  filterStatus: 'all',
  isLoading: false,
  setPosts: (posts): void => set({ posts }),
  setTags: (tags): void => set({ tags }),
  setFilterStatus: (filterStatus): void => set({ filterStatus }),
  setLoading: (isLoading): void => set({ isLoading })
}))
