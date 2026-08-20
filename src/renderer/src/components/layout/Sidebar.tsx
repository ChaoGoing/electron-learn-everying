import { useLocation, useNavigate } from 'react-router-dom'
import {
  BookOpen,
  PenLine,
  FolderKanban,
  Search,
  Settings,
  Sparkles,
  ChevronRight
} from 'lucide-react'
import { useState } from 'react'
import { NavItem } from './NavItem'
import { cn } from '../../lib/cn'

interface NavEntry {
  path: string
  icon: typeof BookOpen
  label: string
}

const NAV_ITEMS: NavEntry[] = [
  { path: '/diary', icon: BookOpen, label: '日记' },
  { path: '/blog', icon: PenLine, label: '博客' },
  { path: '/projects', icon: FolderKanban, label: '项目' },
  { path: '/search', icon: Search, label: '搜索' },
]

export function Sidebar(): JSX.Element {
  const location = useLocation()
  const navigate = useNavigate()
  const [startOpen, setStartOpen] = useState(false)

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  return (
    <aside
      className={cn(
        'w-13 flex flex-col items-center py-2 gap-1 shrink-0 h-full',
        'bg-mica-light dark:bg-mica-dark',
        'border-r border-border-light dark:border-border-dark',
        'smooth-theme'
      )}
    >
      {/* "Start" button at top */}
      <div className="relative">
        <button
          onClick={() => setStartOpen(!startOpen)}
          className={cn(
            'w-10 h-10 flex items-center justify-center rounded-lg transition-all duration-200',
            'hover:bg-black/5 dark:hover:bg-white/10',
            startOpen && 'bg-accent/15 text-accent'
          )}
          title="开始"
          aria-label="Start menu"
        >
          <Sparkles size={20} />
        </button>

        {/* Start menu flyout */}
        {startOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setStartOpen(false)} />
            <div
              className={cn(
                'absolute left-14 top-0 z-50 w-48 py-2 rounded-xl',
                'bg-surface-light dark:bg-surface-dark',
                'border border-border-light dark:border-border-dark',
                'shadow-elevated dark:shadow-elevated-dark',
                'animate-in fade-in slide-in-from-left-2 duration-200'
              )}
            >
              <button
                onClick={() => {
                  navigate('/')
                  setStartOpen(false)
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/10
                           text-text-primary-light dark:text-text-primary-dark"
              >
                <Sparkles size={16} />
                <span>首页</span>
              </button>
              <button
                onClick={() => {
                  navigate('/settings')
                  setStartOpen(false)
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/10
                           text-text-primary-light dark:text-text-primary-dark"
              >
                <ChevronRight size={16} />
                <span>关于</span>
              </button>
            </div>
          </>
        )}
      </div>

      {/* Separator */}
      <div className="w-8 h-px bg-border-light dark:bg-border-dark my-1" />

      {/* Navigation items — centered */}
      <nav className="flex-1 flex flex-col items-center justify-center gap-1">
        {NAV_ITEMS.map((item) => (
          <NavItem
            key={item.path}
            icon={item.icon}
            label={item.label}
            isActive={isActive(item.path)}
            onClick={() => navigate(item.path)}
          />
        ))}
      </nav>

      {/* Settings at bottom */}
      <NavItem
        icon={Settings}
        label="设置"
        isActive={isActive('/settings')}
        onClick={() => navigate('/settings')}
      />
    </aside>
  )
}