import { useEffect } from 'react'
import { RouterProvider } from './router/RouterProvider'
import { ErrorBoundary } from './components/shared/ErrorBoundary'
import { useThemeStore } from './stores/themeStore'

export function App(): JSX.Element {
  const resolved = useThemeStore((s) => s.resolved)

  // Apply theme on mount and when it changes
  useEffect(() => {
    const root = document.documentElement
    if (resolved === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.add('light')
    }
  }, [resolved])

  return (
    <ErrorBoundary>
      <RouterProvider />
    </ErrorBoundary>
  )
}