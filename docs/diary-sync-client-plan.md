# 日记同步 — 客户端改动计划

本文档是 Electron 客户端侧的落地计划，配套接口文档见 [`docs/diary-sync-api.md`](./diary-sync-api.md)。
目标是：日记**本地保存不变**，新增**手动上传/下载**两个按钮触发远程同步。

> 状态：仅计划文档，尚未改代码。实现前请先依此评审。

---

## 1. 目标与总览

- 本地优先：日记仍保存在本地 JSON 文件（现状不变）。
- 手动触发：`DiaryList` 头部新增 **上传 / 下载** 两个按钮 + 状态区。
- 双向增量：上传=推本地变化；下载=拉远端变化；按 `updatedAt` 后写覆盖；删除走墓碑。

涉及的决策总表：

| 决策 | 结论 |
|------|------|
| 触发 | 手动，两个独立按钮（上传 / 下载） |
| 方向 | 双向，分别触发 |
| 范围 | 仅日记正文+元数据，不含图片附件 |
| 粒度 | 增量（`updatedAt` 游标） |
| 冲突 | 后写覆盖（`updatedAt` 新者胜） |
| 删除 | 墓碑软删 `deletedAt` |
| 首次对齐 | 按 `id` 合并 |
| 鉴权 | `Authorization: Bearer <apiKey>`，apiKey 存本地设置 |
| 上传 | 批量 `POST /entries/sync` |

---

## 2. 数据模型变化

### 2.1 `DiaryEntry` 增加墓碑字段

`src/shared/types/diary.ts`：

```ts
export interface DiaryEntry {
  id: string
  title: string
  content: string
  mood: string | null
  weather: string | null
  tags: string[]
  isFavorite: boolean
  wordCount: number
  createdAt: string
  updatedAt: string
  deletedAt: string | null   // 新增：墓碑，存量文件缺省为 null
}
```

说明：

- `deletedAt` 用于标志软删除；`null` 表示未删除。
- 存量 JSON 文件没有该字段，读取时以 `?? null` 兜底，兼容旧数据。

### 2.2 新增同步状态

`userData/data/syncState.json`：

```json
{ "lastPushAt": null, "lastPullAt": null }
```

- `lastPushAt`：上次成功上传的游标。
- `lastPullAt`：上次成功下载的游标。
- 均为 ISO 8601 UTC；`null` 表示从未同步过（首次视为全量）。

### 2.3 新增同步配置

`userData/data/settings.json`（当前 `settingsStore` 只在内存，需要落盘）：

```json
{ "syncBaseUrl": "", "syncApiKey": "" }
```

- `syncBaseUrl`：远程接口 Base URL，例如 `https://api.example.com`。
- `syncApiKey`：API Key，用于 `Authorization: Bearer <key>`。

---

## 3. 本地存储改动（`src/main/storage/diary.ts`）

### 3.1 删除改为软删

`deleteEntry(id)`：

- 不再 `fs.remove`，改为读条目后写入 `deletedAt = now`、`updatedAt = now`。
- 索引 `index.json` 的对应 meta 增加 `deletedAt` 字段（不删除该条索引项）。
- 文件仍保留在磁盘（供同步读取墓碑），后续可选做定期清理。

### 3.2 可见查询过滤墓碑

- `listEntries` / `getDatesWithEntries` / `searchEntries` / `getEntriesByDate`
  所有"展示给用户"的查询，过滤掉 `deletedAt != null` 的条目。
- 索引 meta 的 `Pick<...>` 类型补上 `deletedAt`。

### 3.3 新增同步读取接口

```ts
export async function listEntriesForSync(since: string): Promise<DiaryEntry[]>
```

- 遍历索引全部条目（**含墓碑**），返回 `updatedAt > since` 的完整条目。
- 供上传时收集增量使用。

### 3.4 索引读写同步 `deletedAt`

`readIndex` / `writeIndex` 的 meta 结构增加 `deletedAt: string | null`，保证软删状态随索引持久化。

---

## 4. 新增同步模块（`src/main/sync/diary.ts`）

使用 Node 内置 `fetch`（Electron 主进程可用，无需新增依赖）。

### 4.1 上传（push）

```
1. 读取 syncState.lastPushAt（null 则视为全量）
2. 取 snapshot 游标：now = new Date().toISOString()
3. dirty = listEntriesForSync(lastPushAt) 中 updatedAt <= now 的条目
4. POST {baseUrl}/entries/sync，body = dirty 数组，header Authorization
5. 成功 → lastPushAt = now；失败 → lastPushAt 不变（下次重推同一批）
```

- 快照游标 `now` 保证"推的过程中被编辑的条目"算入下一批，不丢不多。
- 待上传数量 = `dirty.length`，用于 UI 展示。

### 4.2 下载（pull）

```
1. 读取 syncState.lastPullAt（null → 请求不带 since，即全量）
2. GET {baseUrl}/entries/changes?since=lastPullAt，header Authorization
3. 对返回 entries 逐条合并（见 4.3）
4. 成功 → lastPullAt = max(lastPullAt, ...entries.updatedAt, serverTime)
```

### 4.3 下载合并规则（本地为准的镜像）

对每条返回的远端条目 `r`：

- 本地**没有** `r.id`：
  - `r.deletedAt != null` → 忽略（无内容可删，且规避"复活"）。
  - `r.deletedAt == null` → 写入本地文件 + 索引。
- 本地**有** `r.id`（取本地 `l`）：
  - `r.updatedAt > l.updatedAt` → 用 `r` 覆盖本地（含 `deletedAt` 墓碑）。
  - `r.updatedAt <= l.updatedAt` → 保留本地（本地更新，下次上传会覆盖远端）。

### 4.4 提交说明（可不实现）

- `POST /entries/sync` 返回的 `results[].stale` 可用于提示，不作为错误。

---

## 5. 新增配置存储（`src/main/storage/settings.ts`）

```ts
export interface SyncSettings { syncBaseUrl: string; syncApiKey: string }
export async function getSyncSettings(): Promise<SyncSettings>
export async function setSyncSettings(s: SyncSettings): Promise<void>
```

- 读写 `userData/data/settings.json`。
- `getSyncSettings` 缺文件时返回空字符串默认值。

---

## 6. IPC 与 preload 改动

### 6.1 新增 IPC 频道（沿用现有字符串常量风格）

`src/main/ipc/sync.ts`（新）：

```
diary:push           -> push()
diary:pull           -> pull()
diary:getSyncStatus  -> { lastPushAt, lastPullAt, pendingCount }
settings:getSync     -> SyncSettings
settings:setSync     -> (s) => void
```

`src/main/ipc/index.ts` 注册新增 handler。

### 6.2 preload 暴露

`src/preload/index.ts` 与 `src/preload/index.d.ts`：

```ts
diary: {
  // ...现有
  push(): Promise<PushResult>
  pull(): Promise<PullResult>
  getSyncStatus(): Promise<SyncStatus>
}
settings: {
  getSync(): Promise<SyncSettings>
  setSync(s: SyncSettings): Promise<void>
}
```

### 6.3 新增共享类型（`src/shared/types/diary.ts` 或 sync.ts）

```ts
export interface SyncStatus {
  lastPushAt: string | null
  lastPullAt: string | null
  pendingCount: number   // 待上传条数
  lastError: string | null
}
```

---

## 7. 渲染层改动

### 7.1 状态管理（`src/renderer/src/stores/syncStore.ts`，新）

Zustand store，持有 `SyncStatus` + `isPushing` / `isPulling` 两个 loading 标志，
提供 `refresh()` / `push()` / `pull()` 动作，内部调用 `window.api.diary.*`。

### 7.2 同步工具栏（`src/renderer/src/components/diary/SyncToolbar.tsx`，新）

放在 `DiaryList` 头部（"+"旁边）或 `DiaryPage` 列表区间。包含：

- **上传** 按钮：触发 push，忙碌态禁用。
- **下载** 按钮：触发 pull，忙碌态禁用。
- **状态区**：待上传 `N` 篇、上次上传/下载时间、错误信息（失败可重试）。
- 首次未配置 Base URL / API Key 时，提示去设置页配置。

### 7.3 设置页（`src/renderer/src/pages/settings/Settings.tsx`）

新增「同步」section：

- 输入框：Base URL、API Key。
- 保存按钮：调用 `window.api.settings.setSync(...)`。
- 加载时回填 `window.api.settings.getSync()`。

---

## 8. 改动文件清单

| 文件 | 改动 |
|------|------|
| `src/shared/types/diary.ts` | `DiaryEntry` 加 `deletedAt`；新增 `SyncStatus` |
| `src/main/storage/diary.ts` | 软删、过滤墓碑、`listEntriesForSync`、索引含 `deletedAt` |
| `src/main/storage/settings.ts` | **新**：`getSyncSettings` / `setSyncSettings` |
| `src/main/sync/diary.ts` | **新**：push / pull / 游标推进 |
| `src/main/ipc/sync.ts` | **新**：注册 sync/settings handler |
| `src/main/ipc/index.ts` | 注册新 handler |
| `src/preload/index.ts` | 暴露 `diary.push/pull/getSyncStatus` + `settings` |
| `src/preload/index.d.ts` | 补齐类型 |
| `src/renderer/src/stores/syncStore.ts` | **新**：同步状态 |
| `src/renderer/src/components/diary/SyncToolbar.tsx` | **新**：上传/下载按钮 + 状态 |
| `src/renderer/src/components/diary/DiaryList.tsx` | 头部接入 SyncToolbar |
| `src/renderer/src/pages/settings/Settings.tsx` | 新增同步设置 section |

---

## 9. 边界与风险

| 场景 | 处理 |
|------|------|
| 首次同步（两端各有数据） | 先 **下载**（无 since 全量，按 id 合并），再 **上传**（补齐另一端） |
| 上传期间有新编辑 | 快照游标，新编辑留到下一批 |
| 下载收到未知 id 的墓碑 | 忽略，不创建内容 |
| 请求失败 / 离线 | 游标不变，状态区报错，按钮可重试 |
| 时钟偏差 | 信任各设备 `updatedAt`（NTP 已基本保证） |
| API Key 泄露风险 | key 明文存本地设置；正式环境建议后端启用 HTTPS |
| 本地存量 JSON 无 `deletedAt` | 读取时 `?? null` 兜底 |
| 墓碑文件长期堆积 | 后续可选：定期把久远墓碑物理清理 |

---

## 10. 后续可扩展（不在本版）

- 图片附件上传 + 正文 `file://` 替换为远程 URL。
- 自动同步（定时 / 启动时）。
- 多账户 / JWT 鉴权。
- 冲突手动合并 UI（当"后写覆盖"不够用）。
