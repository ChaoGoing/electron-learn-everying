/**
 * theme-client.js — 嵌入子页面的主题接收端（零依赖、可直接内联注入）。
 *
 * 这是唯一一个需要被复制到「子页面」仓库的文件。它做三件事：
 *   1. 解析 URL 查询参数（`?theme=dark&palette=journal`）——首帧立即生效，无闪烁；
 *   2. 监听宿主下发的 `theme:update` 消息，把 token 写成一条 `:root{…}` 规则；
 *   3. 主动向宿主 `theme:request`，补齐「宿主先推送、子页面后加载」的时序。
 *
 * 宿主有两种投递方式，本文件对二者都兼容：
 *   - iframe（同源）：宿主注入本脚本 + `postMessage`；
 *   - webview：宿主 `executeJavaScript` 注入本脚本并直接调用 `window.__APP_THEME__.apply()`。
 *
 * 子页面只读接口：
 *   window.__APP_THEME__.state        → 当前快照（未收到前为 null）
 *   window.__APP_THEME__.apply(p)     → 手动应用一份快照
 *   window.__APP_THEME__.subscribe(fn)→ 订阅变化，返回取消订阅函数
 *   window.addEventListener('app:theme-change', …) 也会收到同一次通知
 *
 * 注意：本文件必须保持 ES5 级语法与零依赖，才能被安全地注入任意子页面。
 */
;(function () {
  'use strict'

  var SOURCE = 'electron-learn-everying'
  var TYPE_UPDATE = 'theme:update'
  var TYPE_REQUEST = 'theme:request'
  var VERSION = 1
  var STYLE_ID = '__app-theme-tokens__'
  var EVENT_NAME = 'app:theme-change'

  if (window.__APP_THEME__ && window.__APP_THEME__.version === VERSION) return

  var state = null
  var listeners = []

  function root() {
    return document.documentElement
  }

  function readQuery() {
    var out = { theme: null, palette: null }
    try {
      var params = new URLSearchParams(window.location.search)
      var theme = params.get('theme')
      var palette = params.get('palette')
      if (theme === 'dark' || theme === 'light') out.theme = theme
      if (palette) out.palette = palette
    } catch (err) {
      /* 老引擎不支持 URLSearchParams 时忽略，等待宿主推送即可 */
    }
    return out
  }

  function paintMode(resolved) {
    if (resolved !== 'dark' && resolved !== 'light') return
    var el = root()
    el.setAttribute('data-theme', resolved)
    el.classList.toggle('dark', resolved === 'dark')
    el.classList.toggle('light', resolved === 'light')
    el.style.colorScheme = resolved
  }

  function paintPalette(palette) {
    if (!palette) return
    if (palette === 'default') root().removeAttribute('data-palette')
    else root().setAttribute('data-palette', palette)
  }

  function paintTokens(tokens) {
    if (!tokens) return
    var names = Object.keys(tokens)
    if (!names.length) return
    var body = names
      .map(function (name) {
        return name + ':' + tokens[name]
      })
      .join(';')
    var el = document.getElementById(STYLE_ID)
    if (!el) {
      el = document.createElement('style')
      el.id = STYLE_ID
    }
    el.textContent = ':root{' + body + '}'
    // 始终追加到 head 末尾，保证优先级高于子页面自身的样式表。
    ;(document.head || root()).appendChild(el)
  }

  function notify() {
    for (var i = 0; i < listeners.length; i += 1) {
      try {
        listeners[i](state)
      } catch (err) {
        /* 单个订阅者出错不影响其它订阅者 */
      }
    }
    try {
      window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: state }))
    } catch (err) {
      /* 老引擎不支持 CustomEvent 构造器时忽略 */
    }
  }

  function apply(payload) {
    if (!payload || typeof payload !== 'object') return false
    state = payload
    paintMode(payload.resolved)
    paintPalette(payload.palette)
    paintTokens(payload.tokens)
    notify()
    return true
  }

  function request() {
    if (window.parent === window) return
    try {
      window.parent.postMessage({ source: SOURCE, type: TYPE_REQUEST }, '*')
    } catch (err) {
      /* 跨源父窗口不可达时忽略 */
    }
  }

  function onMessage(event) {
    var data = event && event.data
    if (!data || data.source !== SOURCE || data.type !== TYPE_UPDATE) return
    apply(data.payload)
  }

  /** 首帧：查询参数里的明暗/调色板先落地，不等宿主消息。 */
  function paintFromQuery() {
    var query = readQuery()
    if (query.theme) paintMode(query.theme)
    if (query.palette) paintPalette(query.palette)
  }

  window.__APP_THEME__ = {
    version: VERSION,
    apply: apply,
    request: request,
    subscribe: function (fn) {
      listeners.push(fn)
      if (state) fn(state)
      return function () {
        var i = listeners.indexOf(fn)
        if (i >= 0) listeners.splice(i, 1)
      }
    },
    get state() {
      return state
    }
  }

  window.addEventListener('message', onMessage)
  paintFromQuery()
  request()
  // 宿主可能在文档解析完之前就推送（本脚本被提前注入时），再补一次请求。
  document.addEventListener('DOMContentLoaded', request)
})()
