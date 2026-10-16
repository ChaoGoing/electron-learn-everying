# AGENTS.md

本文件是 Codex（及其他编码代理）在本仓库工作时的说明：命令、架构、数据模型与约定。以简练、可直接执行的事实为主，详细设计以文中链接指向的文档为准。

# 语言
中文

## 项目概览

- 一个 **Electron 桌面应用**，Windows 11 风格（无边框 `frame: false` + 自定义标题栏 + 左侧导航），**本地优先**，用于记录日记、博客、历史开发项目。
- 技术栈：Electron 34 · electron-vite 3 · React 18 · TypeScript 5 · Tailwind CSS v4 · shadcn/ui（new-york）· Zustand · Tiptap（日记富文本）。
- 数据保存在**本地文件系统**（`app.getPath('userData')/data/...`），同步为**手动触发**的本地优先增量同步。

## 常用命令

| 命令 | 作用 |
|------|------|
| `npm run dev` | 启动开发（electron-vite dev，渲染进程 HMR） |
| `npm start` | 预览已构建产物（electron-vite preview） |
| `npm run build` | 类型检查 + electron-vite build（产物在 `out/`） |
| `npm run build:mac` / `build:win` / `build:linux` | 打平台安装包（electron-builder） |
| `npm run typecheck` | `typecheck:node` + `typecheck:web` |
| `npm run lint` | ESLint |
| `npm run format` | Prettier 全量格式化 |

- **提交 / 收工前必须 `npm run typecheck` 与 `npm run lint` 通过。**
- 本项目**暂无测试基础设施**（Vitest / React Testing Library 未配置）。不要声称"跑过测试"，也无需写入测试代码。

## 目录结构

```
src/
├── main/            # 主进程（Electron）
│   ├── index.ts     # 入口：创建无边框窗口、注册 IPC
│   ├── window.ts    # 窗口控制（最小化/最大化/关闭/是否最大化）
│   ├── ipc/         # IPC handler，按领域拆分；index.ts 聚合注册
│   ├── storage/     # 本地文件读写，按领域拆分
│   └── sync/        # 同步逻辑（推送/拉取/状态）
├── preload/         # contextBridge 暴露 window.api（index.ts + index.d.ts）
├── renderer/        # React SPA
│   ├── index.html
│   └── src/
│       ├── components/   # ui/（shadcn 基础件）、layout/、diary/、shared/
│       ├── pages/        # 路由页面（Home/About/Blog/Diary/Project/Search/Settings）
│       ├── router/       # routes.tsx + RouterProvider
│       ├── stores/       # Zustand stores（diary/blog/project/search/settings/sync/theme）
│       ├── hooks/        # useRouteGuard 等
│       └── lib/          # cn.ts、utils.ts 等
└── shared/types/    # 跨进程共享类型（diary/sync/ipc…），只放类型不写逻辑
```

- 渲染进程别名：`@renderer/*` → `src/renderer/src/*`（`electron.vite.config.ts` 与 `tsconfig.web.json` 均配置）。
- 主进程 / preload / shared 由 `tsconfig.node.json` 覆盖；`tsconfig.json` 只是 references。

## 三进程架构与数据流

- 渲染进程**不直接碰 Node/文件系统**：所有本地 IO 经主进程。窗口参数 `contextIsolation: true`、`nodeIntegration: false`、`sandbox: false`，preload 用 `contextBridge` 暴露 `window.api`。
- 调用链：`renderer(stores) → window.api.* → ipcRenderer.invoke/频道 → ipcMain.handle → main/storage 或 main/sync`。

## 类型化 IPC 约定

新增 IPC 频道必须走三步（缺一不可）：

1. 在 `src/shared/types/ipc.ts` 的 `IPC_CHANNELS` 增加频道常量；
2. 在 `src/preload/index.ts` 的 `api` 对象增加方法（频道用常量），并在 `src/preload/index.d.ts` 的 `WindowAPI` 增加类型；
3. 在 `src/main/ipc/<领域>.ts` 注册 `ipcMain.handle(...)`，并在 `src/main/ipc/index.ts` 的 `registerAllHandlers()` 调用注册函数。

**现状缺口**：`window/app/file/shell` 频道已统一到共享 `IPC_CHANNELS`；但 `diary/settings/sync` 的频道常量目前分散在 `main/ipc/diary.ts`、`main/ipc/sync.ts` 的本地 `CHANNELS` 里，且 `preload/index.ts` 中这些频道仍是**硬编码字符串**，尚未统一。新增或改造这些领域时应顺手迁移到 `IPC_CHANNELS`。

## 本地存储

所有数据在 `app.getPath('userData')` 下：

```
data/
├── diary/{year}/{month}/{date}-{id}.json   # 每条日记一个 JSON 文件
│   └── index.json                          # 按日期的元数据索引（列表/搜索/日历用）
├── settings.json                           # 应用设置（含同步 Base URL / API Key）
└── syncState.json                          # 同步游标与状态（lastPushAt/lastPullAt/lastError）
images/{uuid}.{ext}                         # 日记图片附件（返回 file:// 地址）
```

- 日记**删除走墓碑软删**：写入 `deletedAt` 时间戳而非删除文件，供同步传播。
- 读取旧数据时用 `normalizeEntry()` 补默认值，向前兼容。
- 同步语义（增量、`updatedAt` 游标、后写覆盖、首次按 `id` 合并）权威来源见 `docs/diary-sync-api.md`。

## 前端 UI 约定

- 基础组件用 shadcn/ui（`src/renderer/src/components/ui/`），不要重复手写 Button / Input / Textarea / Label 等。
- 合并类名统一用 `cn()`（`src/renderer/src/lib/cn.ts`，clsx + tailwind-merge）。
- Tailwind v4：主题 token 定义在 `src/renderer/src/styles/index.css` 的 `@theme`，颜色/圆角/阴影用 token，不要硬编码色值。
- 主题切换：light / dark / system，走 `themeStore`。
- 按钮圆角不要使用rounded-full，使用小尺寸圆角

## 数据模型

- 领域类型集中在 `src/shared/types/`，**进程间共享的类型只放这里，不要在主进程/渲染进程重复定义**。
- 日记 `DiaryEntry`（富文本 `content` 为 HTML）见 `src/shared/types/diary.ts`；同步相关见 `shared/types/sync.ts`。
- 博客（Markdown + Front Matter）与开发项目（看板/任务/代码片段）的规划见 `plan.md` 的最终目录结构与数据布局。

## 当前进度与文档可信度

- **主实施计划 = `plan.md`**。阶段 1（基础层）与阶段 2（日记：富文本编辑器 + 日历 + 列表）已完成；阶段 3（博客）、4（开发项目）、5（通用功能/打磨）未做。
- 以下文档**已过期或与实际代码不符**，引用前先核对源码：
  - `方案.md`：描述"日记模板底座（图文卡片）"改造，其所列 `src/renderer/src/lib/diaryHtml.ts`、`components/diary/templates.ts`、`components/diary/PhotoNoteEditor.tsx` 及 `DiaryEntry.type/blocks` 字段**当前都不在源码中**，属"设计了但尚未落地"。
  - `docs/diary-sync-client-plan.md`：开头写"尚未改代码"，但 `src/main/sync/diary.ts`、`src/renderer/src/stores/syncStore.ts`、`src/renderer/src/components/diary/SyncToolbar.tsx` 等**实际已实现**。
- 根目录的 `vite.cal-preview.config.mts`、`.cal-preview-main.tsx`、`.cal-preview.html` 是**临时草稿**，非正式入口；正式 Vite 配置是 `electron.vite.config.ts`。

# 代码提交
使用中文

## 文档自维护

本文件是仓库的活文档。每次完成一个动作后，先根据本次对话内容判断是否需要更新本文件：

- **需要更新的情况**：命令/构建流程变化、目录结构变化、架构或数据流变化、代码约定新增或变更、数据模型或存储布局变化、某文档的"过期/可信度"状态发生变化。
- **不需要更新**：一次性微调、纯 Bug 修复，以及与仓库事实无关或纯询问性的对话。
- **如何更新**：就地编辑对应小节即可，保持精炼；优先修改已有表述，避免粘贴大段代码或重复 `plan.md` / `docs/*` 里的细节。
- 若判断无需更新，保持本文件原样。
