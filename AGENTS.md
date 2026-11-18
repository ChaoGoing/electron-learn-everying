# AGENTS.md

本文件是 Codex（及其他编码代理）在本仓库工作时的说明：命令、架构、数据模型与约定。以简练、可直接执行的事实为主，详细设计以文中链接指向的文档为准。

# 语言

中文

## 项目概览

- 一个 **Electron 桌面应用**，外观分两套：整体是 Windows 11 风格（无边框 `frame: false` + 自定义标题栏 + 左侧导航），**日记模块内是设计稿 `paper-journal` 的纸感卡片风**（页内顶栏 + 卡片板）。**本地优先**，用于记录日记、博客、历史开发项目。
- 技术栈：Electron 34 · electron-vite 3 · React 18 · TypeScript 5 · Tailwind CSS v4 · shadcn/ui（new-york）· Zustand · Tiptap（仍在依赖里，但日记已不再用它）。
- 日记是**卡片式**的：一天 = 一个页面，页面由若干张卡片组成（文字/照片/摘录/清单/心情/音乐/天气/位置），可拖拽编排、套用模板。原来的 Tiptap 富文本编辑页已被「编排模式」取代。
- 数据保存在**本地文件系统**（`app.getPath('userData')/data/...`），同步为**手动触发**的本地优先增量同步。

## 常用命令

| 命令                                              | 作用                                            |
| ------------------------------------------------- | ----------------------------------------------- |
| `npm run dev`                                     | 启动开发（electron-vite dev，渲染进程 HMR）     |
| `npm start`                                       | 预览已构建产物（electron-vite preview）         |
| `npm run build`                                   | 类型检查 + electron-vite build（产物在 `out/`） |
| `npm run build:mac` / `build:win` / `build:linux` | 打平台安装包（electron-builder）                |
| `npm run typecheck`                               | `typecheck:node` + `typecheck:web`              |
| `npm run lint`                                    | ESLint                                          |
| `npm run format`                                  | Prettier 全量格式化                             |

- **提交 / 收工前必须 `npm run typecheck` 与 `npm run lint` 通过。**
- `format` 只管排版（Prettier），不修 lint 规则。`lint` 基于 `@electron-toolkit/eslint-config-ts`，其中 `explicit-function-return-type`、`no-explicit-any` 均为 **error**：所有函数（含箭头函数、store 的 setter）必须显式写返回类型（`void` / `Promise<T>` / `JSX.Element`），不得用 `any`。
- 仅两处**有意豁免**（改动时勿顺手删掉）：`ui/button.tsx` 的 `buttonVariants` 同文件导出（`react-refresh/only-export-components`），以及 `router/RouterProvider.tsx` 剔除 `meta` 时的解构变量（`no-unused-vars`）。
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
│       ├── components/   # ui/（shadcn 基础件）、layout/、diary/（纸感卡片板）、shared/
│       ├── pages/        # 路由页面（Home/About/Blog/Diary/Project/Search/Settings）
│       ├── router/       # routes.tsx + RouterProvider
│       ├── stores/       # Zustand stores（diary/blog/project/search/settings/sync/theme）
│       ├── hooks/        # useRouteGuard、useRoutePalette 等
│       └── lib/          # cn.ts、utils.ts、diaryCards/diaryStats/diaryMeta（日记领域逻辑）
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

**现状**：`window/app/file/shell/diary/settings/sync` 频道已全部统一到共享 `IPC_CHANNELS`；`preload/index.ts` 也用常量调用，不再有硬编码字符串。新增频道请沿用同一模式。

## 本地存储

所有数据在 `app.getPath('userData')` 下：

```
data/
├── diary/{year}/{month}/{date}-{id}.json   # 每一「天」一个页面文件（内含卡片数组）
│   └── index.json                          # 按日期的元数据索引（列表/搜索/日历用）
├── settings.json                           # 应用设置（含同步 Base URL / API Key）
└── syncState.json                          # 同步游标与状态（lastPushAt/lastPullAt/lastError）
images/{uuid}.{ext}                         # 日记图片附件（返回 file:// 地址）
```

- 日记**删除走墓碑软删**：写入 `deletedAt` 时间戳而非删除文件，供同步传播。
- 读取旧数据时用 `normalizeEntry()` 补默认值，并**顺带迁移**：没有 `cards` 的旧条目会把 `content`（Tiptap HTML）拆成 文字 / 摘录 / 清单 / 照片 卡片。迁移结果在下次写入时落盘，无需单独的迁移脚本。
- 字数按**中英混排**统计（CJK 逐字 + 其余按空白切词），主进程的 `countText` 与渲染进程 `lib/diaryCards.ts` 各有一份同实现。
- 「页面设置」改日期会**移动文件**到新的 `{year}/{month}/` 并重写索引（`updateEntry` 收到 `date` 时走 `moveEntryDate`）。
- 同步语义（增量、`updatedAt` 游标、后写覆盖、首次按 `id` 合并）权威来源见 `docs/diary-sync-api.md`。

## 前端 UI 约定

- 基础组件用 shadcn/ui（`src/renderer/src/components/ui/`），不要重复手写 Button / Input / Textarea / Label 等。
- **日记模块例外**：它走设计稿 `paper-journal` 自成一套的纸感控件规格（圆角 11/16px、高度 40px），用 `components/diary/JournalPrimitives.tsx` 里的 `Panel` / `JournalButton` / `JournalIconButton` / `Chip` / `SegmentedControl` / `ProgressBar` / `StatNumber` / `AutoTextarea` 与类名常量 `PANEL_FOOT` / `JOURNAL_INPUT`；颜色一律用 `paper-*` / `ink-*` / `terra` / `moss` 等 token，不要再手抄色值。
- 合并类名统一用 `cn()`（`src/renderer/src/lib/cn.ts`，clsx + tailwind-merge）。
- Tailwind v4：主题 token 定义在 `src/renderer/src/styles/index.css` 的 `@theme`，颜色/圆角/阴影用 token，不要硬编码色值。
- **调色板**：进入 `/diary` 时 `useRoutePalette` 会挂 `data-palette="journal"`，把全局语义 token 换成纸感暖色，并额外提供 `paper-*`/`ink-*`/`terra`/`heat-1..5` 等日记专用 token（暗色变体在 `:root[data-palette='journal'].dark`）。日记之外的页面仍是 Windows 11 token。
- 展示字体 `font-display`（EB Garamond，本地打包在 `src/renderer/public/fonts/`，SIL OFL），只覆盖拉丁字母与数字，中文回落系统宋体系；正文用 `font-serif`，UI 用默认 sans。
- 主题切换：light / dark / system，走 `themeStore`。
- 按钮圆角不要使用rounded-full，使用小尺寸圆角

## 数据模型

- 领域类型集中在 `src/shared/types/`，**进程间共享的类型只放这里，不要在主进程/渲染进程重复定义**。
- 日记是**卡片式**的：`DiaryEntry` = 一天一个「页面」，`cards: DiaryCard[]` 是正文的唯一事实源。卡片是判别联合（`text`/`photo`/`quote`/`checklist`/`mood`/`music`/`weather`/`location`），每张卡片带自己的版式（`width` 通栏/半栏/双栏、`background` 底色、`padding`、`order`）与 `time`。页面级还有 `background`（页面底色）、`location`、`mood`、`weather`、`tags`。类型与标签常量见 `src/shared/types/diary.ts`；同步相关见 `shared/types/sync.ts`。
- 渲染层把日记拆成三块工具：`lib/diaryCards.ts`（卡片工厂、版式映射、字数、编排模板）、`lib/diaryStats.ts`（按天聚合、连续记录、标签/心情/时段/热度口径，纯函数）、`lib/diaryMeta.ts`（图标映射）。统计口径只在这一处，卡片板与回顾页共用。
- 博客（Markdown + Front Matter）与开发项目（看板/任务/代码片段）的规划见 `plan.md` 的最终目录结构与数据布局。

## 当前进度与文档可信度

- **主实施计划 = `plan.md`**。阶段 1（基础层）与阶段 2（日记）已完成——阶段 2 的实现已从「Tiptap 富文本 + 日历 + 列表」升级为「卡片式页面 + 卡片板 + 编排模式 + 回顾」，依据设计稿 `paper-journal`（`Main` 卡片板 / `Editor` 编排 / `Recap` 回顾 三块已落地，设计稿里的 `Phone` 移动端板未做）。阶段 3（博客）、4（开发项目）、5（通用功能/打磨）未做。
- 日记路由：`/diary`（卡片板·时间轴）、`/diary/calendar`、`/diary/recap`、`/diary/library`（素材库）、`/diary/:id`（阅读）、`/diary/:id/edit`（编排）。已删除的旧文件：`pages/diary/{DiaryPage,DiaryDetailPage,DiaryEditorPage}.tsx`、`components/diary/{DiaryList,DiaryCard,DiaryEditor,MoodPicker,WeatherPicker}.tsx`——它们被卡片模型取代；`DiaryCalendar.tsx` 与 `SyncToolbar.tsx` 仍在用。
- 以下文档**已过期或与实际代码不符**，引用前先核对源码：
  - `方案.md`：描述"日记模板底座（图文卡片）"改造，所列 `src/renderer/src/lib/diaryHtml.ts`、`components/diary/templates.ts`、`components/diary/PhotoNoteEditor.tsx` 及 `DiaryEntry.type/blocks` 字段**当前都不在源码中**。其**意图已在卡片模型里落地**（模板 → `lib/diaryCards.ts` 的 `COMPOSE_TEMPLATES`），但文件名与字段名与本文档不同。
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
