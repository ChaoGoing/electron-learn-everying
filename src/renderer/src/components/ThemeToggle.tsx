import { Moon, Sun } from 'lucide-react'
import { Button } from './ui/button'
import { useThemeStore } from '../stores/themeStore'

/**
 * 明暗快捷切换。状态一律走 `themeStore`——组件自身不再读写 `localStorage`，
 * 否则会绕过主进程 `nativeTheme` 同步与子页面下发。
 */
const ThemeToggle = (): JSX.Element => {
  const resolved = useThemeStore((s) => s.resolved)
  const toggle = useThemeStore((s) => s.toggle)
  const isDark = resolved === 'dark'

  return (
    <Button
      variant="secondary"
      onClick={toggle}
      className="bg-gray-200 dark:bg-gray-700"
      aria-label={isDark ? '切换到浅色' : '切换到深色'}
      title={isDark ? '切换到浅色' : '切换到深色'}
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
      {isDark ? '浅色' : '深色'}
    </Button>
  )
}

export default ThemeToggle
