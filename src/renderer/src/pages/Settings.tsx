import { Sun, Moon, Monitor } from 'lucide-react'
import { useThemeStore } from '../stores/themeStore'
import { cn } from '../lib/cn'

export default function Settings(): JSX.Element {
  const { mode, setMode } = useThemeStore()

  return (
    <div className="h-full p-8 overflow-auto">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-text-primary-light dark:text-text-primary-dark mb-8">
          设置
        </h1>

        {/* Appearance */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-text-primary-light dark:text-text-primary-dark mb-4">
            外观
          </h2>
          <div className="rounded-xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark shadow-card dark:shadow-card-dark smooth-theme">
            <div className="p-4">
              <label className="text-sm font-medium text-text-primary-light dark:text-text-primary-dark mb-3 block">
                主题
              </label>
              <div className="flex gap-2">
                {([
                  { value: 'light', icon: Sun, label: '浅色' },
                  { value: 'dark', icon: Moon, label: '深色' },
                  { value: 'system', icon: Monitor, label: '跟随系统' },
                ] as const).map((item) => (
                  <button
                    key={item.value}
                    onClick={() => setMode(item.value as 'light' | 'dark')}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                      'border border-border-light dark:border-border-dark',
                      mode === item.value
                        ? 'bg-accent/15 text-accent border-accent/30'
                        : 'hover:bg-black/5 dark:hover:bg-white/10 text-text-secondary-light dark:text-text-secondary-dark'
                    )}
                  >
                    <item.icon size={16} />
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* About */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-text-primary-light dark:text-text-primary-dark mb-4">
            关于
          </h2>
          <div className="rounded-xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark shadow-card dark:shadow-card-dark smooth-theme p-4">
            <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
              Learn Everything v1.0.0
            </p>
            <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mt-1">
              Windows 11 风格的日记、博客和项目管理客户端
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}