/**
 * 嵌入能力演示页：同一份子页面分别用 iframe / webview 接入，
 * 用于验证「首帧无闪烁 + 主题变化实时下发」这条链路。
 */
import { useMemo, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { EmbeddedPage } from '../../components/embed/EmbeddedPage'
import { Button } from '../../components/ui/button'
import { useThemeStore } from '../../stores/themeStore'
import { cn } from '../../lib/cn'
import type { EmbedKind } from '../../lib/themeBridge'

/** 子页面地址：开发态由 Vite 伺服，打包后与渲染产物同目录。 */
const DEMO_SRC = './embed-demo.html'

export default function EmbedDemoPage(): JSX.Element {
  const [kind, setKind] = useState<EmbedKind>('iframe')
  const [injectClient, setInjectClient] = useState(true)
  const [reloadKey, setReloadKey] = useState(0)

  const resolved = useThemeStore((s) => s.resolved)
  const palette = useThemeStore((s) => s.palette)
  const setPalette = useThemeStore((s) => s.setPalette)

  const src = useMemo(() => `${DEMO_SRC}?t=${reloadKey}`, [reloadKey])

  return (
    <div className="h-full flex flex-col">
      <header className="shrink-0 border-b border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark px-6 py-4 smooth-theme">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-lg font-semibold text-text-primary-light dark:text-text-primary-dark">
              嵌入页面 · 主题同步
            </h1>
            <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mt-0.5">
              当前：{resolved === 'dark' ? '深色' : '浅色'} / 调色板 {palette}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex rounded-lg border border-border-light dark:border-border-dark overflow-hidden">
              {(['iframe', 'webview'] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setKind(item)}
                  className={cn(
                    'px-3 h-8 text-sm',
                    kind === item
                      ? 'bg-accent/15 text-accent'
                      : 'text-text-secondary-light dark:text-text-secondary-dark'
                  )}
                >
                  {item}
                </button>
              ))}
            </div>

            <Button
              variant="outline"
              className={cn('h-8 text-sm', !injectClient && 'opacity-60')}
              onClick={() => setInjectClient((v) => !v)}
              title="关闭后子页面只能靠自身引入的 theme-client.js 接收主题"
            >
              注入客户端：{injectClient ? '开' : '关'}
            </Button>

            <Button
              variant="outline"
              className="h-8 text-sm"
              onClick={() => setPalette(palette === 'journal' ? 'default' : 'journal')}
            >
              切换调色板
            </Button>

            <Button
              variant="outline"
              className="h-8 gap-1.5 text-sm"
              onClick={() => setReloadKey((k) => k + 1)}
            >
              <RefreshCw size={14} />
              重新加载
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 min-h-0 p-4">
        <div className="h-full rounded-xl overflow-hidden border border-border-light dark:border-border-dark shadow-card dark:shadow-card-dark bg-surface-light dark:bg-surface-dark">
          {/* key 让「重新加载」真正重建元素，而不是复用旧文档 */}
          <EmbeddedPage
            key={`${kind}-${reloadKey}`}
            kind={kind}
            src={src}
            title="嵌入演示页"
            injectClient={injectClient}
          />
        </div>
      </div>
    </div>
  )
}
