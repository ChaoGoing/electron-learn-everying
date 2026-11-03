import { readFileSync } from 'fs'
import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import type { Plugin } from 'vite'

/**
 * 把 `theme-client.js`（嵌入子页面的主题接收端）以**同一份源码**提供给两条路径：
 * - `?raw` 导入 —— 宿主用它注入 webview / 同源 iframe；
 * - URL `/theme-client.js` —— 子页面自己 `<script src>` 引入，实现首帧无闪烁。
 *
 * 之所以要这个插件，是因为 Vite 禁止从 `public/` 里 `?raw` 导入文件；
 * 把源码放在 `src/` 下再从这里复制一份产物，就能避免维护两份拷贝。
 */
function themeClientPlugin(): Plugin {
  const sourcePath = resolve('src/renderer/src/embedded/theme-client.js')
  const read = (): string => readFileSync(sourcePath, 'utf-8')

  return {
    name: 'embed:theme-client',
    configureServer(server): void {
      server.middlewares.use((req, res, next) => {
        if (!req.url || req.url.split('?')[0] !== '/theme-client.js') return next()
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8')
        res.setHeader('Cache-Control', 'no-cache')
        res.end(read())
      })
    },
    generateBundle(): void {
      this.emitFile({ type: 'asset', fileName: 'theme-client.js', source: read() })
    }
  }
}

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src')
      }
    },
    plugins: [react(), tailwindcss(), themeClientPlugin()]
  }
})
