# Windows 11 风格客户端 — 实施计划与进度

## 项目目标

将当前 Electron 项目改造为 Windows 11 风格的桌面客户端，用于管理：
- **日记** — 富文本编辑器，日历视图，心情/天气标签，全文搜索
- **博客** — Markdown 编辑 + 实时预览，Front Matter，草稿/发布，导出
- **开发项目** — 项目看板，任务管理，代码片段，笔记，快捷链接

---

## 技术栈决策

| 领域 | 选型 | 理由 |
|------|------|------|
| 状态管理 | **Zustand** | 轻量、无样板代码、支持组件外调用（适合 IPC 监听） |
| 数据存储 | **本地文件系统 (Markdown/JSON)** | 无需编译原生模块，数据透明可直接用编辑器打开，方便 Git 版本控制 |
| 日记编辑器 | **Tiptap** (基于 ProseMirror) | 富文本所见即所得，支持图片、表情、任务列表 |
| 博客编辑器 | **Milkdown** (基于 ProseMirror) | Markdown 编辑器 + 实时预览，与 Tiptap 共享 ProseMirror 内核 |
| 代码片段编辑器 | **CodeMirror 6** | 轻量、语法高亮、多语言支持 |
| 拖拽 (任务看板) | **@dnd-kit** | 现代、TypeScript 优先、无障碍 |
| 动画 | **framer-motion** | 页面过渡、微交互 |
| 图标 | **lucide-react** | 线条风格，适合 Windows 11 Fluent 设计语言 |
| 窗口方案 | `frame: false` (跨平台无边框) | 替代 macOS-only 的 `titleBarStyle: 'hidden'` |

---

## 当前进度总览

- [x] **阶段 1：基础层** — Windows 11 外壳 + 架构 + 数据层 ✅ 已完成
- [x] **阶段 2：日记模块** — 富文本编辑器 + 日历 + 列表 ✅ 已完成
- [ ] **阶段 3：博客模块** — Markdown 编辑器 + 标签管理 + 导出
- [ ] **阶段 4：开发项目模块** — 项目看板 + 任务 + 代码片段
- [ ] **阶段 5：通用功能 + 打磨** — 全局搜索 + 设置 + 快捷键 + 优化

---

## 阶段 1：基础层 ✅ 已完成

**目标：** 可运行的 Windows 11 风格窗口，包括侧边栏导航、主题系统、文件系统数据层、类型化 IPC 和状态管理。三个模块页面为占位页。

**已完成步骤：**

1. ✅ **重构目录结构** — 创建 `src/main/ipc/`、`src/main/storage/`、`src/shared/`、`src/renderer/src/stores/`、`src/renderer/src/components/ui/`、`src/renderer/src/components/layout/`
2. ✅ **切换为无边框窗口** — `src/main/index.ts` 中 `frame: false`，创建 `src/main/window.ts` 管理窗口控制（最小化/最大化/关闭）
3. ✅ **自定义 TitleBar** — `src/renderer/src/components/layout/TitleBar.tsx`：应用图标 + 标题 + 窗口控制按钮，macOS 上叠加原生红绿灯按钮
4. ✅ **左侧 Sidebar（任务栏风格）** — `src/renderer/src/components/layout/Sidebar.tsx`：垂直导航栏，图标居中，"开始"按钮在顶部，设置按钮在底部，Windows 11 药丸形高亮选中态
5. ✅ **Zustand stores** — `themeStore`、`settingsStore`、`diaryStore`、`blogStore`、`projectStore`、`searchStore`
6. ✅ **文件系统数据层** — 创建 `src/main/storage/` 目录，实现各领域文件读写，使用 `app.getPath('userData')` + `fs-extra` 操作文件
7. ✅ **类型化 IPC 架构** — `src/shared/types/ipc.ts` 定义频道常量和请求/响应类型，`src/main/ipc/index.ts` 注册所有处理器，`src/preload/index.ts` 暴露类型化的 `window.api`
8. ✅ **Windows 11 主题系统** — `src/renderer/src/styles/index.css` 中定义 `@theme` tokens（颜色、圆角、阴影、字体），Acrylic 毛玻璃工具类，Mica 背景渐变
9. ✅ **错误处理** — `electron-log` 主进程日志，`react-error-boundary` 渲染进程错误边界
10. ⬜ **测试基础设施** — Vitest + React Testing Library + jsdom（待配置）
11. ⬜ **Husky + lint-staged** — pre-commit 钩子（待安装）
12. ⬜ **CSP 安全头** — `src/renderer/index.html` 中添加 Content-Security-Policy（待添加）

**已创建的核心文件：**

```
src/main/window.ts                          # 窗口控制函数
src/main/ipc/index.ts                       # IPC 注册入口
src/main/ipc/window.ts                      # 窗口 IPC 处理器
src/shared/types/ipc.ts                     # IPC 频道常量
src/preload/index.ts                        # 类型化预加载 API
src/preload/index.d.ts                      # 全局类型声明
src/renderer/src/App.tsx                    # 应用入口（ErrorBoundary + 主题初始化）
src/renderer/src/stores/themeStore.ts       # 主题状态（light/dark/system）
src/renderer/src/stores/settingsStore.ts    # 应用设置
src/renderer/src/stores/diaryStore.ts       # 日记状态
src/renderer/src/stores/blogStore.ts        # 博客状态
src/renderer/src/stores/projectStore.ts     # 项目状态
src/renderer/src/stores/searchStore.ts      # 搜索状态
src/renderer/src/lib/cn.ts                  # clsx + tailwind-merge 工具
src/renderer/src/components/layout/AppLayout.tsx    # 根布局
src/renderer/src/components/layout/TitleBar.tsx     # 标题栏
src/renderer/src/components/layout/WindowControls.tsx # 窗口控制按钮
src/renderer/src/components/layout/Sidebar.tsx      # 侧边栏导航
src/renderer/src/components/layout/NavItem.tsx      # 导航项
src/renderer/src/components/layout/ContentArea.tsx  # 内容区（页面过渡动画）
src/renderer/src/components/shared/ErrorBoundary.tsx # 全局错误边界
```

---

## 阶段 2：日记模块 ✅ 已完成

**目标：** 完整的日记功能，包含富文本编辑、日历导航、心情/天气标签、图片附件和搜索。

**已完成步骤：**

1. ✅ **文件存储层** — `src/main/storage/diary.ts` 基于文件系统的 CRUD 操作，按年/月目录存储 JSON，`index.json` 索引加速
2. ✅ **IPC 处理器** — `src/main/ipc/diary.ts` 9 个处理器 (create/update/delete/get/list/search/getByDate/getDates/uploadImage)
3. ✅ **Tiptap 编辑器** — `DiaryEditor.tsx`，工具栏 + 气泡菜单 + 自动保存（2s 防抖）+ Ctrl+S 手动保存
4. ✅ **心情/天气选择器** — `MoodPicker.tsx`（8 种 emoji 心情）+ `WeatherPicker.tsx`（7 种天气图标）
5. ✅ **日历视图** — `DiaryCalendar.tsx`，月视图网格，有日记的日期标记点，回到今天按钮
6. ✅ **日记列表** — `DiaryList.tsx` + `DiaryCard.tsx`，卡片展示（标题/心情/天气/字数/收藏）
7. ✅ **图片附件** — 存储到 `userData/images/`，通过 IPC 文件对话框选择
8. ✅ **日记页面** — `DiaryPage.tsx`（左侧栏日历+列表），`DiaryDetailPage.tsx`（详情展示），`DiaryEditorPage.tsx`（全屏编辑）
9. ✅ **路由更新** — 添加 `/diary/:id` 和 `/diary/:id/edit` 嵌套路由

**已创建的核心文件：**

```
src/shared/types/diary.ts                          # 日记类型定义
src/main/storage/diary.ts                          # 文件系统 CRUD
src/main/ipc/diary.ts                              # 日记 IPC 处理器
src/renderer/src/components/diary/DiaryEditor.tsx   # Tiptap 富文本编辑器
src/renderer/src/components/diary/DiaryCalendar.tsx # 月视图日历
src/renderer/src/components/diary/DiaryList.tsx     # 日记列表
src/renderer/src/components/diary/DiaryCard.tsx     # 日记卡片
src/renderer/src/components/diary/MoodPicker.tsx    # 心情选择器
src/renderer/src/components/diary/WeatherPicker.tsx # 天气选择器
src/renderer/src/pages/DiaryPage.tsx               # 日记主页
src/renderer/src/pages/DiaryDetailPage.tsx          # 日记详情页
src/renderer/src/pages/DiaryEditorPage.tsx          # 日记编辑页
```

---

## 阶段 3：博客模块（待实施）

**目标：** 完整的博客功能，包含 Markdown 编辑、分屏预览、Front Matter、草稿/发布、导出和标签管理。

**关键步骤：**

1. **文件存储层** — `src/main/storage/blog.ts`，标签管理，`src/main/ipc/blog.ts` 处理器
2. **Milkdown 编辑器** — `BlogEditor.tsx`，分屏（Markdown 编辑 + 实时预览）
3. **Front Matter 编辑器** — `FrontMatterEditor.tsx`，标题/slug/标签/描述/状态切换
4. **博客列表** — `BlogList.tsx`，按状态/标签筛选
5. **标签管理** — `TagManager.tsx`，创建/编辑/删除标签，颜色选择
6. **导出功能** — 单篇 Markdown/HTML，全部导出为 ZIP

**新增路由：**

```
/blog              BlogPage        (侧边栏：文章列表，内容区：空状态或选中项)
/blog/new          BlogEditorPage  (新建文章)
/blog/:slug        BlogDetailPage  (渲染的文章)
/blog/:slug/edit   BlogEditorPage  (编辑已有文章)
```

---

## 阶段 4：开发项目模块（待实施）

**目标：** 项目仪表板、任务管理、代码片段、笔记和快速链接。

**关键步骤：**

1. **文件存储层** — `src/main/storage/project.ts`，项目/任务/笔记/代码片段/链接
2. **项目面板** — `ProjectDashboard.tsx`，项目卡片网格，进度条
3. **任务管理** — `TaskList.tsx`，看板三列（待办/进行中/已完成），`@dnd-kit` 拖拽
4. **代码片段** — `CodeEditor.tsx`，CodeMirror 6 语法高亮，多语言支持
5. **笔记** — 复用 Tiptap 编辑器
6. **快捷链接** — 一键在终端/VSCode/浏览器中打开

**新增路由：**

```
/projects          ProjectPage        (项目仪表板网格)
/projects/:id      ProjectDetailPage  (标签页：任务、笔记、片段、链接)
```

---

## 阶段 5：通用功能 + 打磨（待实施）

1. **全局搜索** — 主进程遍历数据目录，读取所有文件内容进行文本匹配，支持按模块过滤
2. **设置页面** — 通用/外观/编辑器/数据/关于
3. **数据导入/导出/备份** — JSON 备份恢复
4. **键盘快捷键** — `Ctrl+N`新建、`Ctrl+S`保存、`Ctrl+Shift+F`全局搜索等
5. **自动更新** — 配置 `electron-updater`
6. **安全加固** — `contextIsolation: true`、`nodeIntegration: false`、IPC 输入校验
7. **性能优化** — 编辑器组件懒加载、虚拟滚动、图片压缩
8. **动画打磨** — 页面过渡、侧边栏微交互、Toast 通知

---

## 组件树

```
App
└── AppProviders (ErrorBoundary > ThemeProvider > RouterProvider)
    └── AppLayout
        ├── TitleBar (AppIcon + WindowTitle + WindowControls)
        ├── Sidebar (StartButton + NavItems + SettingsButton)
        └── ContentArea (animated page transitions)
            ├── / → HomePage
            ├── /diary → DiaryPage
            │   ├── DiarySidebar (Calendar + search)
            │   └── <Outlet> (DiaryList | DiaryDetailPage | DiaryEditorPage)
            ├── /blog → BlogPage
            │   ├── BlogSidebar (BlogList + filters)
            │   └── <Outlet> (BlogDetailPage | BlogEditorPage)
            ├── /projects → ProjectPage (Dashboard)
            ├── /projects/:id → ProjectDetailPage (Tabs: Tasks/Notes/Snippets/Links)
            ├── /search → SearchPage
            └── /settings → SettingsPage
```

---

## IPC 频道设计

采用 `domain:action` 命名约定，每个频道在主进程有对应的类型化处理器：

- **窗口控制：** `window:minimize`、`window:maximize`、`window:close`、`window:isMaximized` ✅
- **日记：** `diary:create/update/delete/get/list/search/getByDate/getDates/uploadImage` ✅
- **博客：** `blog:create/update/delete/get/getBySlug/list/search/exportMarkdown/exportHtml/exportAll`
- **标签：** `tag:create/update/delete/list`
- **项目：** `project:create/update/delete/get/list`
- **任务：** `task:create/update/delete/list/reorder`
- **笔记：** `note:create/update/delete/list`
- **代码片段：** `snippet:create/update/delete/list`
- **链接：** `link:create/update/delete/list`
- **搜索：** `search:global`
- **设置：** `settings:get/set/getAll/exportAll/importAll/backup/restore`
- **应用：** `app:getVersion/getPath/checkUpdate/quitAndInstall`
- **Shell：** `shell:openExternal/openPath/openTerminal/openVscode`
- **文件：** `file:openDialog/saveDialog/read/write`

---

## 文件系统数据结构

所有数据存储在 `app.getPath('userData')/data/` 目录下，无需数据库，直接可读可编辑。

```
{userData}/
├── data/
│   ├── diary/
│   │   ├── 2026/
│   │   │   ├── 08/
│   │   │   │   ├── 2026-08-20-{id}.json  # 单篇日记 JSON
│   │   │   │   └── 2026-08-19-{id}.json
│   │   │   └── 07/
│   │   └── index.json                     # 日记元数据索引
│   ├── blog/
│   │   ├── posts/
│   │   │   ├── hello-world.md             # Markdown 文件 + YAML front matter
│   │   │   └── my-second-post.md
│   │   ├── drafts/
│   │   │   └── draft-post.md
│   │   └── tags.json                      # 全局标签列表 [{name, slug, color}]
│   ├── projects/
│   │   ├── index.json                     # 项目列表
│   │   ├── {project-id}/
│   │   │   ├── project.json               # 项目配置
│   │   │   ├── tasks.json                 # 任务列表
│   │   │   ├── notes/
│   │   │   │   ├── note-1.md
│   │   │   │   └── note-2.md
│   │   │   ├── snippets/
│   │   │   │   ├── snippet-1.js
│   │   │   │   └── snippet-2.py
│   │   │   └── links.json                # 快捷链接
│   └── settings.json                      # 应用设置
├── images/                                # 图片附件（日记用）
│   └── {uuid}.png
└── backups/                               # 自动备份
    └── backup-2026-08-20.zip
```

**日记条目格式 (JSON):**
```json
{
  "id": "uuid",
  "title": "今天天气真好",
  "content": "<p>HTML content from Tiptap...</p>",
  "mood": "happy",
  "weather": "sunny",
  "tags": ["日常", "生活"],
  "isFavorite": false,
  "wordCount": 150,
  "createdAt": "2026-08-20T10:00:00Z",
  "updatedAt": "2026-08-20T10:30:00Z"
}
```

**博客文章格式 (Markdown + YAML front matter):**
```markdown
---
id: uuid
title: Hello World
slug: hello-world
tags: [tech, javascript]
status: published
createdAt: 2026-08-15T08:00:00Z
updatedAt: 2026-08-16T09:00:00Z
publishedAt: 2026-08-15T08:00:00Z
excerpt: 这是我的第一篇博客文章
---

# Hello World

博客正文内容...
```

---

## 关键第三方包

| 阶段 | 包 | 用途 |
|------|------|------|
| 1 | zustand, fs-extra, electron-log, framer-motion, lucide-react, clsx, tailwind-merge, react-error-boundary | 状态管理、文件操作、日志、动画、图标、工具 ✅ |
| 2 | @tiptap/react + 扩展包, date-fns | 日记编辑器 ✅ |
| 3 | @milkdown/crepe + 插件, react-markdown, remark-gfm, rehype-highlight, gray-matter | 博客编辑器 |
| 4 | @dnd-kit/core + sortable, @codemirror/* 系列 | 拖拽 + 代码编辑 |
| 5 | react-hot-toast, react-virtuoso | 通知 + 虚拟滚动 |

---

## 最终目录结构

```
src/
├── main/           # 主进程
│   ├── index.ts, window.ts
│   ├── ipc/        # 类型化 IPC 处理器（按领域拆分）
│   ├── storage/     # 文件系统读写（按领域拆分）
│   └── utils/      # paths.ts, logger.ts
├── preload/        # contextBridge 暴露 window.api
│   ├── index.ts, index.d.ts
├── renderer/       # React SPA
│   ├── index.html
│   └── src/
│       ├── main.tsx, App.tsx
│       ├── styles/        # Tailwind + @theme tokens
│       ├── stores/        # Zustand stores
│       ├── hooks/         # useKeyboard, useTheme
│       ├── components/
│       │   ├── ui/        # Button, Input, Modal, Card, Tooltip, Badge, Tabs...
│       │   ├── layout/    # TitleBar, Sidebar, NavItem, ContentArea
│       │   ├── diary/     # DiaryEditor, DiaryCalendar, DiaryList, MoodPicker...
│       │   ├── blog/      # BlogEditor, BlogPreview, FrontMatterEditor, TagManager...
│       │   ├── project/   # ProjectDashboard, TaskList, CodeEditor, NoteEditor, QuickLinks
│       │   └── shared/    # ErrorBoundary, Loading, EmptyState, ConfirmDialog
│       ├── pages/         # 所有页面组件
│       ├── router/        # routes.tsx, RouterProvider.tsx
│       └── lib/           # cn.ts, constants.ts, types.ts
└── shared/         # 跨进程共享类型
    └── types/      # diary.ts, blog.ts, project.ts, settings.ts, ipc.ts
```

---

## 潜在风险与应对

| 风险 | 应对 |
|------|------|
| 文件数量增长后搜索变慢 | 维护 `index.json` 内存索引缓存，增量更新；数据量超千条时再考虑迁移到 SQLite |
| 无边框窗口跨平台不一致 | 在 window.ts 中抽象平台检查，Windows/macOS/Linux 分别测试 |
| Tiptap/Milkdown 打包体积大 | React.lazy 代码分割，编辑器组件懒加载 |
| CSP 限制 Tiptap 动态样式 | 允许 `'unsafe-inline'` styles（必要妥协） |
| 大日记含大量图片 | 主进程用 sharp 压缩图片（最大 1920px 宽） |
| 文件并发写入冲突 | 主进程单线程处理所有 IPC，天然串行化；使用 `writeFile` 原子操作 |

---

## 验证方式

1. **阶段 1：** `npm run dev` 启动，确认无边框窗口 + 侧边栏导航 + 主题切换正常，DevTools 中检查 `window.api` 可用 ✅
2. **阶段 2：** 创建/编辑/删除日记，日历正确标记，图片插入正常，搜索返回结果 ✅
3. **阶段 3：** Markdown 编辑 + 预览同步，Front Matter 编辑，导出文件正确
4. **阶段 4：** 项目 CRUD，任务拖拽，代码片段语法高亮，快捷链接打开
5. **阶段 5：** `npm run build:mac` / `build:win` 打包成功，安装运行正常，全局搜索覆盖所有模块