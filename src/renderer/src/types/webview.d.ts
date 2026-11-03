/**
 * `<webview>` 的 JSX 类型声明。
 *
 * 这里刻意不 `import type { WebviewTag } from 'electron'`：渲染进程的 tsconfig
 * 不引入 electron 的 Node 类型，直接引会污染整份 web 类型图。只声明我们实际用到
 * 的那几个成员，够用且无副作用。
 */
import type { DetailedHTMLProps, HTMLAttributes } from 'react'

/** `<webview>` 上我们用到的事件与命令子集。 */
export interface WebviewElement extends HTMLElement {
  src: string
  reload: () => void
  stop: () => void
  executeJavaScript: <T = unknown>(code: string, userGesture?: boolean) => Promise<T>
  getURL: () => string
  isLoading: () => boolean
  addEventListener: (type: string, listener: (event: Event) => void) => void
  removeEventListener: (type: string, listener: (event: Event) => void) => void
}

export interface WebviewAttributes
  extends DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> {
  src?: string
  partition?: string
  allowpopups?: string
  webpreferences?: string
  useragent?: string
  ref?: React.Ref<WebviewElement>
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      webview: WebviewAttributes
    }
  }
}
