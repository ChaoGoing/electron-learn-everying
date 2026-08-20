import { create } from 'zustand'

export interface Project {
  id: string
  name: string
  description: string
  icon: string
  color: string
  path: string | null
  createdAt: string
  updatedAt: string
}

export interface ProjectTask {
  id: string
  projectId: string
  title: string
  description: string
  status: 'todo' | 'in_progress' | 'done'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  sortOrder: number
  dueDate: string | null
  createdAt: string
  updatedAt: string
}

interface ProjectState {
  projects: Project[]
  selectedProjectId: string | null
  isLoading: boolean
  setProjects: (projects: Project[]) => void
  setSelectedProjectId: (id: string | null) => void
  setLoading: (loading: boolean) => void
}

export const useProjectStore = create<ProjectState>((set) => ({
  projects: [],
  selectedProjectId: null,
  isLoading: false,
  setProjects: (projects) => set({ projects }),
  setSelectedProjectId: (selectedProjectId) => set({ selectedProjectId }),
  setLoading: (isLoading) => set({ isLoading }),
}))