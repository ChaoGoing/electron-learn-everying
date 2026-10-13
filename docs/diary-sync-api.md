# 日记同步接口文档

Electron 日记应用的后端同步接口契约。客户端为**本地优先**：日记先存本地（JSON 文件），
用户手动点击 **上传** / **下载** 两个按钮时，才按本文档调用远程接口同步。

客户端只负责"正文 + 元数据"的同步；图片附件不在本版同步范围内。

---

## 1. 通用约定

- **Base URL**：可在客户端设置页配置，例如 `https://api.example.com`。
  下文所有路径都相对 Base URL。
- **鉴权**：所有请求必须携带请求头
  `Authorization: Bearer <apiKey>`
  API Key 由服务端分配，客户端在设置页填写并本地保存。
- **时间格式**：一律使用 ISO 8601 UTC 字符串，例如 `2026-10-12T08:30:00.000Z`。
- **内容格式**：请求与响应均为 `application/json`。
- **比较规则**：增量同步一律用条目的 `updatedAt` 字段与 `since` 游标比较（`>` 不含等号）。

---

## 2. 数据模型：Entry

同步的基本单位是一条日记条目。字段与客户端本地结构一一对应：

```json
{
  "id": "9f2c4c9a-...-uuid",
  "title": "今天天气真好",
  "content": "<p>HTML 正文</p>",
  "mood": "happy",
  "weather": "sunny",
  "tags": ["日常", "生活"],
  "isFavorite": false,
  "wordCount": 128,
  "createdAt": "2026-10-12T08:00:00.000Z",
  "updatedAt": "2026-10-12T08:30:00.000Z",
  "deletedAt": null
}
```

字段说明：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string (UUID) | 是 | 条目唯一标识，客户端生成，跨设备唯一 |
| `title` | string | 是 | 标题，可为空字符串 |
| `content` | string | 是 | HTML 正文（富文本） |
| `mood` | string \| null | 否 | 心情 |
| `weather` | string \| null | 否 | 天气 |
| `tags` | string[] | 是 | 标签数组 |
| `isFavorite` | boolean | 是 | 是否收藏 |
| `wordCount` | number | 是 | 正文字数 |
| `createdAt` | string (ISO) | 是 | 创建时间 |
| `updatedAt` | string (ISO) | 是 | 最后修改时间，同步裁决关键 |
| `deletedAt` | string (ISO) \| null | 是 | 墓碑：非空表示已（软）删除 |

> **墓碑规则（重要）**：`deletedAt` 非空表示该条目已删除。
> 普通查询不返回墓碑，但 **同步接口必须返回墓碑**，否则删除无法在两端传播。

---

## 3. 同步语义

### 3.1 后写覆盖（Last-Write-Wins）

两端（客户端与服务端）都依据 `updatedAt` 裁决：**时间新的一方胜出**。

- 上传时：若 incoming 的 `updatedAt` >= 已存条目，则覆盖写入；否则跳过，保留服务端较新版本。
- 下载时同理，由客户端在本地合并。
- 时间来源：信任各设备客户端的 `updatedAt`（设备时钟需大致同步，通常 NTP 已保证）。

### 3.2 墓碑（软删除）

- 删除不真正物理删除，而是写 `deletedAt`（并同步更新 `updatedAt`）。
- 上传：客户端把 `deletedAt` 非空的条目一并推送，服务端必须把这些条目的
  `deleted_at` **持久化到数据库**（不是只更新正文），否则删除无法传播。
- 下载：客户端收到 `deletedAt` 非空的条目，在本地也标记删除。
- 服务端在普通查询（列表/详情）里不应返回 `deleted_at` 非空的条目；
  但 `GET /entries/changes` 必须返回墓碑行。

> **服务端删除传播清单**：只要满足下面三点，删除就会正确同步——
> 1. `POST /entries/sync` 收到 `deletedAt != null` 时，写入/覆写 `deleted_at` 和 `updated_at`。
> 2. `GET /entries/changes` 查询 `updated_at > since` 时**不要过滤 `deleted_at` 非空的行**。
> 3. 普通列表接口过滤 `deleted_at` 非空的行（避免已删条目重新显示）。

### 3.3 首次同步

首次同步前两端各自已有独立数据。对齐策略为**按 `id` 合并**：

- 同 `id` → 按 3.1 的 `updatedAt` 后写覆盖。
- 各自独有 → 互相补齐。

---

## 4. 接口

### 4.1 `GET /health`

校验连通性与 API Key。

**请求**：无参数。

**响应** `200`：

```json
{ "ok": true }
```

- `401`：API Key 无效。

---

### 4.2 `GET /entries/changes?since=<ISO8601>`

拉取自某时间点以来的所有变化。用于**下载**；`since` 缺省时返回全部（首次同步）。

**请求**：

| 参数 | 必填 | 说明 |
|------|------|------|
| `since` | 否 | 游标时间；返回所有 `updatedAt > since` 的条目。缺省返回全部。 |

**响应** `200`：

```json
{
  "entries": [
    {
      "id": "9f2c4c9a-...",
      "title": "标题",
      "content": "<p>...</p>",
      "mood": null,
      "weather": null,
      "tags": [],
      "isFavorite": false,
      "wordCount": 10,
      "createdAt": "2026-10-12T08:00:00.000Z",
      "updatedAt": "2026-10-12T08:30:00.000Z",
      "deletedAt": null
    },
    {
      "id": "aaaaaaaa-bbbb-...-uuid",
      "title": "",
      "content": "",
      "mood": null,
      "weather": null,
      "tags": [],
      "isFavorite": false,
      "wordCount": 0,
      "createdAt": "2026-10-12T08:00:00.000Z",
      "updatedAt": "2026-10-12T09:00:00.000Z",
      "deletedAt": "2026-10-12T09:00:00.000Z"
    }
  ],
  "serverTime": "2026-10-12T09:30:00.000Z"
}
```

- `entries`：所有 `updatedAt > since` 的条目，**必须包含墓碑**。
- `serverTime`：服务端当前时间。客户端用它的最大值推进游标，
  即使本次没有新条目也要用 `serverTime` 更新游标，避免反复拉取同批数据。

---

### 4.3 `POST /entries/sync`

批量上传 upsert 与墓碑。用于**上传**。

**请求体**：条目数组。

```json
[
  {
    "id": "9f2c4c9a-...",
    "title": "标题",
    "content": "<p>...</p>",
    "mood": "happy",
    "weather": null,
    "tags": ["日常"],
    "isFavorite": false,
    "wordCount": 20,
    "createdAt": "2026-10-12T08:00:00.000Z",
    "updatedAt": "2026-10-12T10:00:00.000Z",
    "deletedAt": null
  },
  {
    "id": "aaaaaaaa-bbbb-...-uuid",
    "title": "",
    "content": "",
    "mood": null,
    "weather": null,
    "tags": [],
    "isFavorite": false,
    "wordCount": 0,
    "createdAt": "2026-10-12T08:00:00.000Z",
    "updatedAt": "2026-10-12T09:00:00.000Z",
    "deletedAt": "2026-10-12T09:00:00.000Z"
  }
]
```

**处理规则**：服务端按 `id` upsert。

- 不存在 → 插入。
- 已存在且 incoming `updatedAt` >= 现有 `updatedAt` → 覆盖写入。
- 已存在且 incoming `updatedAt` < 现有 `updatedAt` → 跳过（`stale`）。

**响应** `200`：

```json
{
  "results": [
    { "id": "9f2c4c9a-...", "ok": true, "stale": false },
    { "id": "aaaaaaaa-bbbb-...", "ok": true, "stale": true }
  ]
}
```

| 字段 | 说明 |
|------|------|
| `id` | 对应请求条目 id |
| `ok` | 是否成功 |
| `stale` | 是否因服务端已有更新版本而跳过（true = 被跳过） |

> 本接口不需要硬删除端点：删除一律走墓碑（`deletedAt` 置值）。

---

## 5. 错误码

| 状态码 | 含义 |
|--------|------|
| `400` | 请求参数 / schema 错误 |
| `401` | API Key 无效 |
| `422` | 请求体字段非法 |
| `500` | 服务端内部错误 |

---

## 6. 参考表结构（Postgres）

MySQL 等其他数据库可相应调整类型。

```sql
CREATE TABLE diary_entries (
  id          text PRIMARY KEY,
  title       text NOT NULL DEFAULT '',
  content     text NOT NULL DEFAULT '',
  mood        text,
  weather     text,
  tags        jsonb NOT NULL DEFAULT '[]',
  is_favorite boolean NOT NULL DEFAULT false,
  word_count  integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL,
  updated_at  timestamptz NOT NULL,
  deleted_at  timestamptz
);

CREATE INDEX idx_entries_updated_at ON diary_entries (updated_at);
```

---

## 7. 端到端流程示例

### 7.1 首次同步（两端都空或有独立数据）

1. 客户端点 **下载**：`GET /entries/changes`（无 `since`）→ 取回全部，按 `id` 合并进本地。
2. 客户端点 **上传**：把本地全部条目 `POST /entries/sync` 推上去，同 `id` 后写覆盖。

### 7.2 日常新增 / 修改

1. 本地编辑后（`updatedAt` 已刷新）。
2. 点 **上传**：`POST /entries/sync` 只推 `updatedAt > lastPushAt` 的条目。
3. 另一台设备点 **下载**：`GET /entries/changes?since=lastPullAt` 取回变化并合并。

### 7.3 删除

1. 本地删除某条：客户端写 `deletedAt` 并刷新 `updatedAt`。
2. 点 **上传**：墓碑随 `POST /entries/sync` 推上去。
3. 另一端点 **下载**：收到墓碑，本地标记删除。
