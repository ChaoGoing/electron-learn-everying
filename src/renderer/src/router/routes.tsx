import { lazy } from 'react'
import { RouteObject } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'

// Lazy-loaded page components
const Home = lazy(() => import('../pages/Home'))
const DiaryPage = lazy(() => import('../pages/DiaryPage'))
const DiaryDetailPage = lazy(() => import('../pages/DiaryDetailPage'))
const DiaryEditorPage = lazy(() => import('../pages/DiaryEditorPage'))
const BlogPage = lazy(() => import('../pages/BlogPage'))
const ProjectPage = lazy(() => import('../pages/ProjectPage'))
const SearchPage = lazy(() => import('../pages/SearchPage'))
const Settings = lazy(() => import('../pages/Settings'))

// Extended route configuration type
export interface RouteMeta {
  title?: string
  requiresAuth?: boolean
  permissions?: string[]
}

export interface AppRouteObject extends Omit<RouteObject, 'children'> {
  meta?: RouteMeta
  children?: AppRouteObject[]
}

// Route configuration
export const routes: AppRouteObject[] = [
  {
    path: '/',
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <Home />,
      },
      {
        path: 'diary',
        element: <DiaryPage />,
        children: [
          {
            path: ':id',
            element: <DiaryDetailPage />,
          },
          {
            path: ':id/edit',
            element: <DiaryEditorPage />,
          },
        ],
      },
      {
        path: 'blog',
        element: <BlogPage />,
      },
      {
        path: 'projects',
        element: <ProjectPage />,
      },
      {
        path: 'search',
        element: <SearchPage />,
      },
      {
        path: 'settings',
        element: <Settings />,
      },
    ],
  },
]