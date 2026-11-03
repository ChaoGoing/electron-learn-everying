import { useEffect } from 'react'
import { RouterProvider } from './router/RouterProvider'
import { ErrorBoundary } from './components/shared/ErrorBoundary'
import { initTheme } from './stores/themeStore'
import { initThemeBridge } from './lib/themeBridge'

export function App(): JSX.Element {
  // 主题落地（含系统偏好订阅）与子页面下发总线，各启动一次。
  useEffect(() => {
    const disposeTheme = initTheme()
    const disposeBridge = initThemeBridge()
    return () => {
      disposeBridge()
      disposeTheme()
    }
  }, [])

  return (
    <ErrorBoundary>
      <RouterProvider />
    </ErrorBoundary>
  )
}
