import { lazy } from 'react'
import { RouteObject } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'

// Lazy-loaded page components
const Home = lazy(() => import('../pages/Home'))
const DiaryLayout = lazy(() => import('../pages/diary/DiaryLayout'))
const DiaryBoardPage = lazy(() => import('../pages/diary/DiaryBoardPage'))
const DiaryCalendarPage = lazy(() => import('../pages/diary/DiaryCalendarPage'))
const DiaryRecapPage = lazy(() => import('../pages/diary/DiaryRecapPage'))
const DiaryLibraryPage = lazy(() => import('../pages/diary/DiaryLibraryPage'))
const DiaryReadPage = lazy(() => import('../pages/diary/DiaryReadPage'))
const DiaryComposePage = lazy(() => import('../pages/diary/DiaryComposePage'))
const BlogPage = lazy(() => import('../pages/blog/BlogPage'))
const ProjectPage = lazy(() => import('../pages/project/ProjectPage'))
const SearchPage = lazy(() => import('../pages/search/SearchPage'))
const Settings = lazy(() => import('../pages/settings/Settings'))
const EmbedDemoPage = lazy(() => import('../pages/lab/EmbedDemoPage'))

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
        element: <Home />
      },
      {
        path: 'diary',
        element: <DiaryLayout />,
        children: [
          {
            index: true,
            element: <DiaryBoardPage />
          },
          {
            path: 'calendar',
            element: <DiaryCalendarPage />
          },
          {
            path: 'recap',
            element: <DiaryRecapPage />
          },
          {
            path: 'library',
            element: <DiaryLibraryPage />
          },
          {
            path: ':id',
            element: <DiaryReadPage />
          },
          {
            path: ':id/edit',
            element: <DiaryComposePage />
          }
        ]
      },
      {
        path: 'blog',
        element: <BlogPage />
      },
      {
        path: 'projects',
        element: <ProjectPage />
      },
      {
        path: 'search',
        element: <SearchPage />
      },
      {
        path: 'settings',
        element: <Settings />
      },
      {
        path: 'lab/embed',
        element: <EmbedDemoPage />
      }
    ]
  }
]
