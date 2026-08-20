import { BookOpen, PenLine, FolderKanban, Sparkles } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { cn } from '../lib/cn'

const QUICK_ACTIONS = [
  { path: '/diary', icon: BookOpen, label: '写日记', color: 'text-blue-500' },
  { path: '/blog', icon: PenLine, label: '写博客', color: 'text-green-500' },
  { path: '/projects', icon: FolderKanban, label: '项目管理', color: 'text-purple-500' },
]

export default function Home(): JSX.Element {
  const navigate = useNavigate()

  return (
    <div className="h-full p-8 overflow-auto">
      <div className="max-w-4xl mx-auto">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-primary-light dark:text-text-primary-dark">
            <Sparkles size={28} className="inline mr-2 text-accent" />
            Learn Everything
          </h1>
          <p className="mt-2 text-text-secondary-light dark:text-text-secondary-dark">
            你的日记、博客和项目管理客户端
          </p>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.path}
              onClick={() => navigate(action.path)}
              className={cn(
                'flex items-center gap-3 p-4 rounded-xl border border-border-light dark:border-border-dark',
                'bg-surface-light dark:bg-surface-dark',
                'hover:bg-acrylic-light dark:hover:bg-acrylic-dark',
                'shadow-card dark:shadow-card-dark',
                'transition-all duration-200 hover:scale-[1.02]',
                'smooth-theme'
              )}
            >
              <action.icon size={24} className={action.color} />
              <span className="font-medium text-text-primary-light dark:text-text-primary-dark">
                {action.label}
              </span>
            </button>
          ))}
        </div>

        {/* Recent activity placeholder */}
        <div className="rounded-xl border border-border-light dark:border-border-dark p-6 bg-surface-light dark:bg-surface-dark shadow-card dark:shadow-card-dark smooth-theme">
          <h2 className="text-lg font-semibold text-text-primary-light dark:text-text-primary-dark mb-4">
            最近动态
          </h2>
          <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
            还没有任何内容，开始写日记或博客吧 ✨
          </p>
        </div>
      </div>
    </div>
  )
}