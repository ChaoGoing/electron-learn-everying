import { useEffect, useState } from 'react'
import { Sun, Moon, Monitor, Save, Eye, EyeOff } from 'lucide-react'
import { useThemeStore } from '../../stores/themeStore'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { cn } from '../../lib/cn'

export default function Settings(): JSX.Element {
  const { mode, setMode } = useThemeStore()

  const [syncBaseUrl, setSyncBaseUrl] = useState('')
  const [syncApiKey, setSyncApiKey] = useState('')
  const [syncSaved, setSyncSaved] = useState(false)
  const [syncLoading, setSyncLoading] = useState(true)
  const [showApiKey, setShowApiKey] = useState(false)

  useEffect(() => {
    window.api.settings
      .getSync()
      .then((s) => {
        setSyncBaseUrl(s.syncBaseUrl)
        setSyncApiKey(s.syncApiKey)
      })
      .catch(() => {
        // Ignore load failures; the user can still type and save.
      })
      .finally(() => setSyncLoading(false))
  }, [])

  const handleSaveSync = async (): Promise<void> => {
    await window.api.settings.setSync({
      syncBaseUrl: syncBaseUrl.trim(),
      syncApiKey: syncApiKey.trim()
    })
    setSyncSaved(true)
    window.setTimeout(() => setSyncSaved(false), 2000)
  }

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
              <Label className="mb-3 block text-text-primary-light dark:text-text-primary-dark">
                主题
              </Label>
              <div className="flex gap-2">
                {(
                  [
                    { value: 'light', icon: Sun, label: '浅色' },
                    { value: 'dark', icon: Moon, label: '深色' },
                    { value: 'system', icon: Monitor, label: '跟随系统' }
                  ] as const
                ).map((item) => (
                  <Button
                    key={item.value}
                    variant="outline"
                    onClick={() => setMode(item.value as 'light' | 'dark')}
                    className={cn(
                      'h-9 gap-2 rounded-lg px-4 text-sm font-medium',
                      mode === item.value
                        ? 'bg-accent/15 text-accent border-accent/30 hover:bg-accent/15 hover:text-accent'
                        : 'text-text-secondary-light dark:text-text-secondary-dark'
                    )}
                  >
                    <item.icon size={16} />
                    {item.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Sync */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-text-primary-light dark:text-text-primary-dark mb-4">
            同步
          </h2>
          <div className="rounded-xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark shadow-card dark:shadow-card-dark smooth-theme">
            <div className="p-4 space-y-4">
              <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
                日记默认保存在本地。点击日记列表中的「上传 /
                下载」按钮时，才按这里配置的地址同步到远程数据库。
              </p>

              <div>
                <Label htmlFor="sync-base-url" className="mb-1.5 block">
                  Base URL
                </Label>
                <Input
                  id="sync-base-url"
                  type="text"
                  value={syncBaseUrl}
                  onChange={(e) => setSyncBaseUrl(e.target.value)}
                  placeholder="https://api.example.com"
                  disabled={syncLoading}
                />
              </div>

              <div>
                <Label htmlFor="sync-api-key" className="mb-1.5 block">
                  API Key
                </Label>
                <div className="relative">
                  <Input
                    id="sync-api-key"
                    type={showApiKey ? 'text' : 'password'}
                    value={syncApiKey}
                    onChange={(e) => setSyncApiKey(e.target.value)}
                    placeholder="sk-..."
                    disabled={syncLoading}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 size-7 -translate-y-1/2"
                    onClick={() => setShowApiKey((v) => !v)}
                    disabled={syncLoading}
                    aria-label={showApiKey ? '隐藏 API Key' : '显示 API Key'}
                  >
                    {showApiKey ? <EyeOff size={15} /> : <Eye size={15} />}
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button onClick={handleSaveSync} disabled={syncLoading}>
                  <Save size={15} />
                  保存
                </Button>
                {syncSaved && <span className="text-sm text-accent">已保存</span>}
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
