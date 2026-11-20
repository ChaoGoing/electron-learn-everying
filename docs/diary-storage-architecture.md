# 源码架构导读：日记本地存储层

> 面向初级前端的**原理讲解**。不是逐行注释，而是从代码里的具体写法反推它背后的通用概念，
> 每条都挂回源码位置，方便你对着读。
>
> 行号基于 2026-11-19 的版本（当时是单文件 `src/main/storage/diary.ts`，815 行）。
>
> ⚠️ **该文件已按职责拆分到 `src/main/storage/diary/`**：下文所有行号都属于拆分前的单文件，
> 请按**函数名**在新目录里搜，对照关系如下（对外导入路径仍是 `storage/diary`，由 `index.ts` 转出）。
>
> | 下文讲的 | 现在在哪个文件 |
> | --- | --- |
> | 路径解析（`getDataDir` / `getEntryPath` / `getIndexPath` / `entryDate`） | `paths.ts` |
> | 卡片规范化（`normalizeCard` / `normalizeCards`） | `cards.ts` |
> | 旧版 Tiptap HTML → 卡片（`cardsFromLegacyHtml`） | `legacy.ts` |
> | 文本与字数（`cardText` / `countText` / `countCards` / `entrySearchText`） | `text.ts` |
> | 条目规范化与索引摘要（`normalizeEntry` / `entryMeta`） | `normalize.ts` |
> | 写入串行化与原子落盘（`serializeWrite` / `writeJsonAtomic`） | `io.ts` |
> | 单条目文件读写（`readEntryFile` / `writeEntryFile`） | `entryFile.ts` |
> | 索引读写与重建（`readIndex` / `writeIndex` / `rebuildIndex`） | `entryIndex.ts` |
> | 对外 CRUD / 查询（`createEntry` / `updateEntry` / `listEntries` …） | `entries.ts` |
> | 图片素材（`uploadImage` / `listImages`） | `images.ts` |
>
> 想要**可以直接跑**的最小案例（含并发写坏文件的复现实验），见 `learning/diary-storage/`。

---

## 0. 先看清这个文件在系统中的位置

它**不是**一个"工具函数集合"，而是一层的完整实现：**主进程的数据持久层（persistence layer）**。

```
渲染进程 (React)                    主进程 (Node)
─────────────────                  ────────────────────────────────
diaryStore / DiaryComposePage
      │ window.api.diary.update(...)
      ▼
  preload (contextBridge)  ──IPC──►  ipc/diary.ts    ← 只做参数转发，无业务逻辑
                                          │
                                          ▼
                                     storage/diary/    ← 本文讲的这一层
                                          │
                                          ▼
                                     userData/data/diary/**.json
                                          ▲
                                     sync/diary.ts   ← 另一个消费者，同样只调这里的导出函数
```

三条重要的边界事实：

1. **渲染进程永远不碰 `fs`。** 所有磁盘操作都在这个文件里。渲染进程要数据，只能过 IPC。
2. **`ipc/diary.ts` 是薄适配层**（`src/main/ipc/diary.ts:18-62`），每个 handler 就是一行转发，不做判断、不做转换。
3. **同步逻辑也不自己读写文件**，它复用本文件的 `listEntriesForSync` / `upsertSyncedEntry`（`src/main/sync/diary.ts:6`）。也就是说，**写入串行化的约束对同步同样生效**——这是设计上很关键的一点，后面第 5 节会讲。

📌 **通用概念**：分层架构（layered architecture）、关注点分离（separation of concerns）。
判断一个文件是否"分对了层"，看它有没有混入其它层的职责。这个文件里没有一行 React、没有一行 `ipcMain`，就是分对了。

---

## 1. 本地优先与"文件即数据库"

### 代码里长什么样

```ts
// src/main/storage/diary.ts:25-40
function getDataDir(): string {
  return path.join(app.getPath('userData'), 'data', 'diary')
}
function getEntryPath(date: string, id: string): string {
  const [year, month] = date.split('-')
  return path.join(getDataDir(), year, month, `${date}-${id}.json`)
}
```

一天的日记 = `data/diary/2026/11/2026-11-19-<uuid>.json`，一个纯 JSON 文件。

### 为什么这么选

这是 **local-first（本地优先）** 架构：数据的主人是你自己，服务端只是可选的副本。
它带来的直接后果全都能在这个文件里看到：

| 后果 | 代码里的体现 |
| --- | --- |
| 用户能直接看到、备份、手改自己的数据 | 明文 JSON，`{ spaces: 2 }` 缩进（`:470`） |
| 不需要装数据库、不需要起进程 | 零依赖，只用 `fs-extra` |
| 没有事务、没有并发控制、没有索引 | 于是有了第 4、5 节的自己手写的一套 |
| 图片要单独存 | `userData/images/{uuid}.{ext}`（`:769-781`） |

📌 **对比一下 SQLite**：如果换成 SQLite，第 4 节（原子写）和第 5 节（写队列）几乎全部由数据库的事务和锁免费提供，第 3 节（索引重建）也不需要。**代价**是你失去了"用户能拿文本编辑器改日记"这个能力。

> 架构选型没有免费的午餐。这个文件里一多半的复杂度，本质上是为"用 JSON 文件存数据"这个决定付的账。**看懂这笔账，比记住任何设计模式都值钱。**

### 顺带一个细节：为什么 `getDataDir()` 是函数而不是常量

```ts
// 不是这样：
const DATA_DIR = path.join(app.getPath('userData'), 'data', 'diary')  // ❌

// 而是这样：
function getDataDir(): string { ... }  // ✅
```

`app.getPath('userData')` 在 Electron 的 `app.ready` 事件之前调用会抛错。模块顶层代码在 `import` 的那一刻就执行，时机不可控；**推迟到真正需要路径的那一刻再求值**，就绕开了这个问题。

📌 **通用概念**：延迟初始化 / 惰性求值（lazy initialization）。同类场景还有数据库连接、昂贵对象、单例。

---

## 2. 单一事实源（SSOT）与"索引只是缓存"

### 代码里长什么样

```ts
/** 按磁盘上的文件重建索引；索引只是缓存，文件才是事实源。 */
async function rebuildIndex(): Promise<Record<string, DiaryEntryMeta[]>> { ... }
// :492-516

async function readIndex(): Promise<Record<string, DiaryEntryMeta[]>> {
  try {
    return await fs.readJSON(indexPath) as Record<string, DiaryEntryMeta[]>
  } catch (error) {
    console.error('日记索引损坏，改为按磁盘文件重建：', error)
    return await rebuildIndex()          // ← 关键：坏了就重算，不报错
  }
}
// :519-528
```

`index.json` 的结构是一张按日期分桶的元数据表：

```jsonc
{ "2026-11-19": [ { "id": "...", "title": "...", "wordCount": 412, "deletedAt": null, ... } ] }
```

它只存 `DiaryEntryMeta`（`Pick<DiaryEntry, 'id' | 'title' | ... >`，`:20-23`），**不存卡片正文**。

### 为什么这么选

问自己一个问题：**如果索引和文件不一致，以谁为准？**

答案必须是文件——因为文件才承载用户的正文。一旦承认这一点，索引就降级成了**缓存**，于是：

- 索引读坏 → 从文件全部重扫一遍重建（`:492-516`），用户无感；
- 索引丢了 → 一样重建，数据不丢。

反过来，如果索引是事实源，那么它损坏就等于**用户日记丢失**。这个区别是致命的。

📌 **通用概念**：单一事实源（Single Source of Truth, SSOT）、派生数据（derived data）、缓存失效策略（这里是"坏了就全量重算"这么朴素的一种，但对本地几千条数据完全够用）。

### 这个设计撑起了哪些性能优化

索引存在的意义是**把"要读文件"的查询变成"只读索引"**：

```ts
// :726-732 —— 日历高亮「这个月哪几天有日记」
// 只需读 index.json 一次，完全不碰任何日记文件
export async function getDatesWithEntries(year: number, month: number): Promise<string[]> {
  const index = await readIndex()
  return Object.keys(index)
    .filter((d) => d.startsWith(prefix) && index[d].some((e) => !e.deletedAt))
    .sort()
}
```

注意 `index[d].some((e) => !e.deletedAt)`——因为元数据里**预先存了** `deletedAt`，墓碑过滤也不必读文件。

📌 **通用概念**：预聚合 / 反范式化（denormalization）。用写入时的冗余，换读取时的速度。**每次写入都要多维护一份索引，这就是它的成本**（见 `writeEntryFile`，`:552-568`）。

---

## 3. 原子写：先写临时文件，再 rename

### 代码里长什么样

```ts
// :467-472
/** 先写 `.tmp` 再 rename：同目录 rename 是原子的，读者要么看到旧版要么看到新版。 */
async function writeJsonAtomic(filePath: string, data: unknown): Promise<void> {
  const tempPath = `${filePath}.tmp`
  await fs.writeJSON(tempPath, data, { spaces: 2 })
  await fs.rename(tempPath, filePath)
}
```

### 为什么不能直接 `writeJSON(filePath, data)`

`fs.writeFile` **不是原子操作**。假设进程在写到一半时被强杀（用户关窗口、系统休眠、断电），磁盘上就留下一个**半截 JSON**。下次读取 `JSON.parse` 直接抛错。

这个项目**真出过这个事故**。文件头部注释写得很直白（`:448-452`）：

> 磁盘上就会留下"一份合法 JSON + 上一版的尾巴"，这个文件从此解析不了（`diary:list` 会整体失败，整本日记看起来是空的）。

注意故障链条：**一次写入中断 → 一个文件损坏 → 列表接口整体失败 → 用户体验上"日记全没了"**。数据只坏了一个文件，观感是全线崩塌。

### rename 为什么是原子的

在同一个文件系统内，`rename(2)` 系统调用只修改目录项（directory entry）的指针，不搬运数据；操作系统保证它对其它进程是**瞬时**生效的。所以：

```
写入前:  entry.json = [完整旧数据]
写临时:  entry.json = [完整旧数据]   entry.json.tmp = [写到一半...]
rename:  entry.json = [完整新数据]   （.tmp 消失）
```

任何时刻读者打开 `entry.json`，看到的都是**某一份完整的版本**——旧版或新版，不存在"半截"。

📌 **通用概念**：原子替换（atomic replace）、写时复制思想、崩溃一致性（crash consistency）。
这个模式几乎到处在用：Git 写对象、SQLite 的 journal/WAL、文本编辑器保存文件、配置管理工具。**背下来，以后任何"覆盖写一个文件"的场合都该这么干。**

---

## 4. 从"原子"到"串行"：为什么还需要一个写队列

原子写解决的是**单个写操作被打断**。它解决不了**两个写操作互相交错**。

### 事故场景

界面上"改一个字就存一次"，很容易同时飞出两个 `update`。两次写入都是原子的，但：

```
时刻 1: 写 A.tmp = [版本1]
时刻 2: 写 B.tmp = [版本2]        ← 两次调用各自写自己的 .tmp…… 
```

等等，这里连 `.tmp` 路径都一样，所以真实情况更糟：两次写**共用同一个 `.tmp` 文件**，一个在写、一个在 rename，或者两个 `writeJSON` 的写入字节互相穿插，最终 rename 走的是一份混合体。加上索引的"读-改-写"（`:558-567`：先 `readIndex`，改数组，再 `writeIndex`），两个并发会**后写的吃掉先写的**——注释里明确指出了（`:550-551`）。

### 解法：把写操作串成一条链

```ts
// :455-465
let writeQueue: Promise<unknown> = Promise.resolve()

/** 把写操作排进队列，保证任何时刻只有一个写在跑。任务失败也不会卡住后面的写。 */
function serializeWrite<T>(task: () => Promise<T>): Promise<T> {
  const run = writeQueue.then(task, task)
  writeQueue = run.then(
    (): void => undefined,
    (): void => undefined
  )
  return run
}
```

这是全文最值得逐字读的 8 行。拆开看：

**① `writeQueue.then(task, task)` —— 两个参数都是 `task`**

`Promise.prototype.then(onFulfilled, onRejected)`。这里**成功和失败都用同一个 `task`**，意思是"不管前一个写是成功还是失败，都接着执行我这一个"。

如果只写 `writeQueue.then(task)`（省略第二个参数），前一个任务失败会让队列变成 rejected 状态，**后面所有写都被跳过**——一次失败，后续全部静默丢失。这是新手最容易踩的坑。

**② `writeQueue = run.then(() => undefined, () => undefined)`**

把 `run` 的拒绝"消毒"成永远 resolve 的 Promise 再挂回队列。否则队列持有 rejected Promise，会触发 **unhandled promise rejection** 警告（Node 里未来会直接终止进程）。

**③ 返回的是 `run` 而不是 `writeQueue`**

调用方 `await serializeWrite(...)` 拿到的是**自己那个任务的结果**（或它自己的错误），而不是队列的状态。队列只负责排序，不吞掉错误。

📌 **通用概念**：串行化 / 互斥（mutual exclusion）、Promise 链式排队、背压（back-pressure）的雏形。

### 为什么这是"约定式"而不是"强制式"

```ts
// :550-551
// Write an entry file and upsert its index meta (used by create, update, delete, and sync-merge).
// 调用方必须在 `serializeWrite` 里跑：这里读索引、改索引、写索引，并发时后写的会吃掉先写的。
async function writeEntryFile(entry: DiaryEntry): Promise<void> { ... }
```

`writeEntryFile` 自己不加锁，靠**注释要求调用方**把整段包进 `serializeWrite`。检查一遍所有调用点，确实都包住了：

| 导出函数 | 是否包住 | 行号 |
| --- | --- | --- |
| `createEntry` | ✅ | `:594` |
| `updateEntry` | ✅ | `:620` |
| `deleteEntry` | ✅ | `:643` |
| `upsertSyncedEntry` | ✅ | `:758` |
| `moveEntryDate` | ⚠️ 无锁，但只被 `updateEntry` 调用（已在锁内） | `:574` |

📌 **这是"脆弱的设计"的典型案例**：约束只存在于注释里，编译器不检查，新人加一个调用点就破了。
更稳的写法是让 `writeEntryFile` 私有化（不 export）+ 提供一个永远加锁的公共包装，或者用真正的锁对象。**读到这种注释时，把它当成"这里有技术债"的信号。**

---

## 5. 故障隔离：一个坏文件不该拖垮整本日记

### 代码里长什么样

```ts
// :474-485
/**
 * 读一条日记文件。
 * 单个文件坏了（半截 JSON、被手工改坏）只记日志并跳过，不让整本日记跟着打不开。
 */
async function readEntryFile(filePath: string): Promise<DiaryEntry | null> {
  try {
    return normalizeEntry(await fs.readJSON(filePath))
  } catch (error) {
    console.error(`日记文件读取失败，已跳过：${filePath}`, error)
    return null
  }
}
```

调用方一律处理 `null`，继续下一个：

```ts
// :689-690
const entry = await readEntryFile(filePath)
if (!entry) continue          // ← 跳过，不影响其它条目
```

### 原理

这是**故障隔离（fault isolation）**，也叫**舱壁模式（bulkhead）**——船的隔舱进水不会让整条船沉没。

关键决策是**"跳过"还是"抛出"**：

- **抛出**：一个文件坏了，`listEntries` 整个 reject，前端收到错误，用户看到"日记列表加载失败"，几百条正常的日记也看不见了。
- **跳过 + 记日志**：用户正常看到 299 条，第 300 条静默消失，日志里有一行线索。

对**面向用户的批量读**，后者几乎总是对的。📌 判断标准：**这个错误的影响范围该有多大？** 让错误的爆炸半径（blast radius）等于出问题的那一份数据。

⚠️ 代价也要认清：**静默跳过意味着用户可能永远不知道自己丢了一条**。所以 `console.error` 里的路径必须是**可操作的**（这里给了完整路径，用户可以自己去 `userData` 目录捞）。如果连日志都没有，那就是在掩盖问题。

---

## 6. 数据迁移：读时规范化（normalize-on-read）

### 背景

这个项目早期用 Tiptap 富文本，`DiaryEntry.content` 存的是 HTML。后来改成了卡片模型，`cards` 是唯一事实源。**老的 JSON 文件还躺在用户硬盘上。**

### 解法：不是写迁移脚本，而是在读取路径上迁移

```ts
// :375-380
// Legacy JSON files may predate `cards` / `deletedAt`; normalize (and migrate) on read.
function normalizeEntry(raw: Partial<DiaryEntry> | null | undefined): DiaryEntry {
  const createdAt = raw?.createdAt ?? ''
  const cards = normalizeCards(raw?.cards)
  const legacyContent = typeof raw?.content === 'string' ? raw.content : ''
  const resolvedCards = cards.length > 0 ? cards : cardsFromLegacyHtml(legacyContent)
  //                                                  ↑ 有 cards 就用，没有才去拆 HTML
```

`cardsFromLegacyHtml`（`:257-369`）干的事：把 HTML 里的 `<blockquote>` 抽成摘录卡、`data-type="taskList"` 的列表抽成清单卡、`<img>` 抽成照片卡、剩下的纯文本抽成文字卡。

三个设计细节值得学：

**① 幂等性靠 `content: ''` 保证**

```ts
// :385
content: '',        // ← 迁移后强制清空
```

迁移结果**下次写入时自然落盘**（因为写的是 normalize 过的对象）。就算一直没写，每次读都重新迁移一遍也不会重复——因为旧 `content` 被读成 `''` 了，`cardsFromLegacyHtml('')` 返回空数组，`cards.length > 0` 也不会误判。

⚠️ 边界思考：用户**合法地删光了所有卡片**，此时 `cards.length === 0`，会不会把 `content` 又拆回来一次？不会——因为 `content` 早已被写成 `''`。**这就是为什么"迁移后必须抹掉旧字段"是迁移的标配动作**，否则会产生"删不掉的幽灵数据"。

**② 没有单独的迁移脚本**

不需要"v1→v2 迁移程序"、不需要版本号字段、不需要"迁移前请备份"的弹窗。

📌 **通用概念**：渐进式迁移 / 惰性迁移（lazy migration）、前向兼容（forward compatibility）。
代价是**迁移逻辑永远留在代码里**（`cardsFromLegacyHtml` 这 110 行会一直跟着项目）。什么时候可以删？当你能确认所有用户都写过一次盘之后——对本地应用来说这很难确认，所以通常就一直留着。

**③ 手写 HTML 解析而不是引 DOM 库**

用正则处理 HTML 通常被视为反模式（HTML 不是正则语言）。但这里**输入是可控的**：它是 Tiptap 生成的、结构规整的 HTML，不是互联网上任意网页。所以正则够用，且省掉了一个依赖。

📌 **权衡思维**：规则不是"永远别用正则解析 HTML"，而是"你要清楚自己的输入有多野"。

---

## 7. 边界处的运行时校验：类型系统管不到磁盘

### 问题

`DiaryEntry` 是 TypeScript 类型。但 `fs.readJSON` 返回的是 `any`——**类型系统在运行时完全不存在**。用户手改了 JSON，文件里 `cards` 是字符串、`padding` 是 `NaN`、`type` 是拼错的 `"txt"`，TS 全都拦不住。

### 解法：手写的 schema 校验 + 默认值填充

```ts
// :131-135
function normalizeCard(raw: unknown, fallbackOrder: number): DiaryCard | null {
  if (!raw || typeof raw !== 'object') return null
  const card = raw as Record<string, unknown>
  const type = toCardType(card.type)
  if (!type) return null                    // ← 类型不认识，整张卡丢弃
  ...
}
```

配套的是一组**小守卫函数**，每个字段都有自己的降级策略：

```ts
// :108-111  数值范围钳制
function toPadding(raw: unknown): number {
  if (typeof raw !== 'number' || Number.isNaN(raw)) return CARD_DEFAULT_PADDING
  return Math.min(32, Math.max(8, Math.round(raw)))     // clamp 到 8..32
}

// :89-91   类型守卫（type predicate），给 TS 用
function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}
```

📌 **通用概念**：
- **解析，而非校验**（parse, don't validate）：不只是说"这个数据行不行"，而是**产出一个保证合法的对象**，让下游代码可以完全信任类型。
- **类型守卫 / 类型谓词**（type guard，`value is string`）：这是 TS 里把运行时检查的结果"告诉"编译器的唯一方式。
- **不可信边界**（trust boundary）：**磁盘、网络、用户输入、IPC 入参**都是边界，边界内侧的数据才能信类型。这个文件正好在磁盘边界上，所以它必须做这件事。

### 类型定义本身也讲了一个故事

```ts
// src/shared/types/diary.ts:126-134 —— 判别联合
export type DiaryCard =
  | DiaryTextCard | DiaryPhotoCard | DiaryQuoteCard | DiaryChecklistCard
  | DiaryMoodCard | DiaryMusicCard | DiaryWeatherCard | DiaryLocationCard
```

每种卡片有独一无二的 `type` 字面量字段。于是 `switch (card.type)` 时 **TS 能自动收窄**到具体类型，`card.items`、`card.song` 这些字段才合法。

而 `cardText` 这个函数（`:403-422`）是**穷尽 switch 的最佳示范**：

```ts
function cardText(card: DiaryCard): string {
  switch (card.type) {
    case 'text':    return [card.title, card.text, ...card.tags].filter(Boolean).join(' ')
    // ... 8 个 case，一个不漏，且都没有 default
  }
}
```

**没有 `default` 分支**是有意的：将来新增第 9 种卡片，TS 会因为函数可能返回 `undefined` 而报错，**强制你回来补这一处**。
（注意 `normalizeCard`，`:147-209`，也是同样的 8 个 case 穷尽。如果加了 `default`，这个保护就消失了。）

📌 **通用概念**：判别联合（discriminated union）、穷尽性检查（exhaustiveness check）、"让编译器帮你找全所有需要改的地方"。这是 TS 相对 JS 最大的收益之一。

---

## 8. 软删除（墓碑）与分布式删除难题

### 代码里长什么样

```ts
// :641-656
// Soft delete: write a tombstone instead of removing the file, so the deletion can propagate.
export async function deleteEntry(id: string): Promise<void> {
  await serializeWrite(async (): Promise<void> => {
    const entry = await getEntry(id)
    if (!entry) return
    const now = new Date().toISOString()
    const updated: DiaryEntry = { ...entry, deletedAt: now, updatedAt: now }
    await writeEntryFile(updated)      // ← 文件还在，只是打了个标记
  })
}
```

删除后**文件不删**，只写 `deletedAt` 时间戳。然后在所有**面向用户**的查询里过滤掉（`:692-693`）：

```ts
// Hide tombstones from user-facing queries.
if (entry.deletedAt) continue
```

### 为什么不直接 `fs.remove()`

因为要**同步**。考虑这个时序：

```
设备 A: 删除日记 X  →  直接删文件
设备 B: 从未听说过这次删除，本地还有 X
同步:   A 上传"我的变更" —— A 本地已经没有 X 了，什么都不会上传
        B 拉取"服务端变更" —— 服务端没有关于 X 的新记录
结果:   X 在 B 上永远活着，甚至会被 B 推回服务端复活
```

**删除必须成为一条"可传播的数据"，而不是"数据的缺席"。** 墓碑就是这条数据。

📌 **通用概念**：墓碑（tombstone）、软删除（soft delete）、最终一致性。
这是分布式系统的经典问题——**"没有消息"和"消息说没有"是两回事**。CRDT、Git、Cassandra 都用了同一个招。

### 一个设计差异很有教学价值

```ts
// :692-693  listEntries —— 面向用户，过滤墓碑
if (entry.deletedAt) continue

// :734-735  listEntriesForSync —— 面向同步，保留墓碑
// Return every entry (including tombstones) whose `updatedAt` is after `since`.
```

**同一个数据，两个消费者，两种过滤策略。** 这不是重复代码，是**面向不同用途的视图**。
📌 通用概念：CQRS 的朴素形态（读写模型分离）、按消费者定制的查询契约。

### 代价

墓碑文件永远留在磁盘上。本地几千条日记无所谓（一个几十字节的 JSON），但数据量大了就需要"墓碑回收"策略。这个项目**没有实现回收**——作为练习，你可以想想：什么时候才能安全地删掉一个墓碑？

> 提示：需要在确认**所有设备**都已经同步过这条删除之后。而对一个手动同步的应用，"所有设备"是无法确认的——这就是为什么很多本地优先应用干脆永久保留墓碑。

---

## 9. 增量同步：游标与"后写覆盖"

这个文件里有三个函数是专门给同步用的：`listEntriesForSync`（`:736`）、`upsertSyncedEntry`（`:757`），加上上游的 `getEntry`。

### 游标式增量

```ts
// :736-754
export async function listEntriesForSync(since: string): Promise<DiaryEntry[]> {
  ...
  if (!since || entry.updatedAt > since) {
    entries.push(entry)
  }
  ...
  entries.sort((a, b) => a.updatedAt.localeCompare(b.updatedAt))   // ← 升序
}
```

- `since` 为空串 → 返回全部（首次全量同步）；
- 否则只返回 `updatedAt > since` 的（注意是**严格大于**，否则会重复传上一次的边界条目）；
- **按 `updatedAt` 升序**返回，让服务端能顺序推进游标。

📌 **通用概念**：游标分页 / 增量同步（delta sync）、基于时间戳的水位线（watermark）。

### 时间戳排序为什么可以直接用字符串比较

```ts
entries.sort((a, b) => a.updatedAt.localeCompare(b.updatedAt))
```

因为时间格式是 ISO 8601 UTC（`2026-11-19T08:30:00.000Z`，见 `:595` `new Date().toISOString()`）。
**ISO 8601 的字典序 == 时间序**——定长、高位在前、时区统一。这个性质被全项目依赖（`:707`、`:752`、`sync/diary.ts` 里的游标比较都是字符串比较）。

📌 **通用概念**：可排序的序列化格式。如果这里用的是 `"2026/11/19"` 或本地时区时间，排序会全错。**选时间格式时，"能不能字符串比较"是一个硬指标。**

### 冲突解决：后写覆盖（LWW）

本地这侧的策略在 `sync/diary.ts:174`（`mergeRemote`）：比较 `local.updatedAt` 和 `remote.updatedAt`，谁新用谁；远端是更新的墓碑就本地标记删除。

📌 **通用概念**：Last-Write-Wins（LWW）冲突解决。
它的优点：**极简、无冲突态、永远能收敛**。
它的缺点：**会静默丢数据**——两台设备同时改同一条，后写的直接覆盖先写的，用户不会收到任何提示。
对"个人日记"这个场景，LWW 是合理的取舍；对"多人协作文档"，就必须上 OT 或 CRDT。

### 上传侧的"快照游标"技巧

```ts
// src/main/sync/diary.ts:63-65
// Snapshot cursor: any edit that lands after this timestamp rolls into the next batch.
const now = new Date().toISOString()
const dirty = (await listEntriesForSync(state.lastPushAt ?? '')).filter((e) => e.updatedAt <= now)
```

如果直接把 `lastPushAt` 设成"推送完成时的时刻"，那么在推送过程中用户新改的条目会被**误判为已推送**，永久丢失。做法是**在开始推之前先取时间快照**，只提交快照之前的条目，之后的自然滚进下一批。

📌 这是个很实用的经验：**任何"读取一批 → 处理 → 推进游标"的流程，游标都必须取自"读取之前"，不能取自"处理之后"。**

---

## 10. 派生数据：`wordCount` 与 `entryDate`

### 代码里长什么样

```ts
// :42-44
function entryDate(entry: DiaryEntry): string {
  return entry.createdAt.slice(0, 10)     // "2026-11-19T..." → "2026-11-19"
}

// :395
wordCount: countCards(resolvedCards),      // 每次 normalize 都重算
```

`createdAt` 是时间戳，日期是**从它派生**的——而不是再存一个 `date` 字段。

📌 **通用概念**：规范化（normalization）/ 消除冗余状态。
存两份就可能不一致（`date` 和 `createdAt` 打架，谁说了算？），派生则**永远一致**。

**但代价在别处**：这个派生值同时决定了**三个东西**——文件名（`:35`）、目录结构（`year/month`）、索引的 key（`:507`）。
所以"改日期"不是改个字段，而是**搬家**：

```ts
// :574-587
async function moveEntryDate(entry: DiaryEntry, nextDate: string): Promise<DiaryEntry> {
  const previousDate = entryDate(entry)
  if (previousDate === nextDate) return entry
  const timePart = entry.createdAt.slice(10)          // 保留时刻，只换日期
  const moved: DiaryEntry = { ...entry, createdAt: `${nextDate}${timePart}` }
  await writeEntryFile(moved)                          // 1. 写新位置（+ 索引加新日期）
  const oldPath = getEntryPath(previousDate, entry.id)
  if (await fs.pathExists(oldPath)) await fs.remove(oldPath)   // 2. 删旧文件
  await removeFromIndex(previousDate, entry.id)                // 3. 索引删旧日期
  return moved
}
```

⚠️ **注意这不是原子操作**。如果进程在步骤 1 之后、步骤 2 之前挂掉，磁盘上就有**两份**（新旧各一），索引里两个日期都指向它。因为都在 `serializeWrite` 内（由 `updateEntry` 调用），并发导致的交错不会发生，但**崩溃**仍会留下残影。

📌 如果你想练习"发现架构缺陷"，这就是一个：**跨资源的移动需要补偿逻辑（compensating action）或者一个"孤儿清理"步骤**。目前的代码两者都没有。实际影响很小（用户可以手动删掉那条重复），但知道它在那里，是架构意识的体现。

### 顺带说 `wordCount` 的口径

```ts
// :424-435
/**
 * 中英混排的「字数」：CJK 逐字计数，其余按空白切词。
 * （旧实现按空白切分，中文整段会被算成 1，与界面上的「412 字」不符。）
 */
export function countText(text: string): number {
  const cjk = text.match(/[㐀-䶿一-鿿豈-﫿぀-ヿ]/g)
  const words = text.replace(/[㐀-䶿一-鿿豈-﫿぀-ヿ]/g, ' ')
    .split(/\s+/)
    .filter((token) => /[\p{L}\p{N}]/u.test(token))
  return (cjk ? cjk.length : 0) + words.length
}
```

思路：先用正则数出所有 CJK 字符（逐字算一个），把它们替换成空格，剩下的按空白切词，两边相加。

三个值得注意的点：

1. **口径必须有唯一定义处。** 注释里说"主进程与 `lib/diaryCards.ts` 各有一份同实现"——这是**重复实现**，是潜在的不一致源。正确做法是把 `countText` 提到 `src/shared/`（那里约定"只放类型"，但纯函数也可以放）。
2. **正则的覆盖范围要清楚。** 这个字符类覆盖 CJK 扩展A、基本区、兼容区、日文假名，都在 BMP 内；**不包含扩展B区（U+20000 以上）**，所以少数生僻字和 emoji 会被当作"非 CJK"走英文那条分支（emoji 会被空白的切分逻辑过滤掉，不计入——对"字数"来说反而是对的）。
3. **`\p{L}` 需要 `u` 标志**（`/[\p{L}\p{N}]/u`）。这是 Unicode 属性转义，没有 `u` 标志只会匹配字面的 `p`、`L`、`{`…… 是个容易写错的地方。

---

## 11. 性能特征：诚实地看待 O(n)

这个文件里几乎每个读操作都是**全量扫描 + 逐个读文件**：

```ts
// :658-670  getEntry：遍历整个索引找 id，最坏 O(条目总数)
export async function getEntry(id: string): Promise<DiaryEntry | null> {
  const index = await readIndex()
  for (const date of Object.keys(index)) {
    const found = index[date].find((e) => e.id === id)
    if (found) { ... }
  }
}

// :678-703  listEntries：对每条元数据都 readEntryFile 一次
for (const date of datesToRead) {
  for (const meta of dateEntries) {
    const entry = await readEntryFile(filePath)   // ← N 次磁盘 IO
```

### 该怎么评价

**在这个场景下，这是对的选择。** 理由：

- 个人日记的数据量级是**千条**，不是百万条；
- 本地 SSD 上一次小文件读是**微秒级**；
- 换来的是**零依赖、零 schema、数据可读、随时可手改**。

如果换成服务端百万级数据，同样的写法就是灾难（N+1 查询问题）。**性能决策必须绑定量级来谈**，脱离量级说"O(n) 就是慢"是外行话。

### 但确实存在的可优化点

| 现象 | 位置 | 优化方向 |
| --- | --- | --- |
| `getEntry` 全表扫 id | `:658` | 索引里加一张 `id → date` 的反查表 |
| `listEntries` N+1 次读文件 | `:689` | 列表页只读元数据；正文懒加载 |
| `writeEntryFile` 每次重写**整个** `index.json` | `:558-567` | 按月/按年分片索引 |
| 每次 `update` 都重写**整天**的文件 | `:552-556` | 卡片粒度拆分文件（但会失去"一天一个文件"的备份友好性）|

📌 **通用概念**：写放大（write amplification）、N+1 问题、读写权衡。
注意最后一行——**优化是有代价的**，它和"一天一个文件方便备份/迁移"直接冲突。**这就是架构：没有最优解，只有权衡。**

---

## 12. 值得再想一想的几个点

读代码时养成习惯：**看到注释在解释"为什么"的时候，那里通常藏着一个约束或一个妥协。**

### ① `uploadImages` 的动态 `import('electron')`

```ts
// :790-791
export async function uploadImages(multiple = true): Promise<string[]> {
  const { dialog } = await import('electron')     // ← 动态导入
```

但同一文件第 1 行已经 `import { app } from 'electron'` 了。既然模块已经加载了 electron，这个动态导入**不带来任何收益**（不会延迟加载、也不会解决循环依赖）。
📌 这类"看起来有深意其实没有"的写法，往往是从别处复制来的模板（常见于需要按需加载 `dialog` 以避免在非 GUI 环境报错的库代码）。**读代码时遇到它，别默认它一定有理由——但也别急着删，先弄明白它的来历。**

### ② `listEntries` 分页逻辑的隐式默认值

```ts
// :709-714
if (filters.offset) {
  return entries.slice(filters.offset, filters.offset + (filters.limit || 20))   // 有 offset：limit 默认 20
}
if (filters.limit) {
  return entries.slice(0, filters.limit)                                          // 无 offset：limit 必填才有意义
}
return entries
```

`if (filters.offset)` 用的是 **truthy 判断**，所以 `offset: 0` 会走第二个分支。行为差异在"传了 `offset: 0` 但没传 `limit`"时显现：返回全部而不是前 20 条。

📌 **通用概念**：分页参数的隐式契约。更好的写法是显式判断 `filters.offset !== undefined`，并给 `limit` 一个明确的默认值常量。**"0 是 falsy"是 JS 里最常见的 bug 来源之一，判断"是否提供"要用 `!== undefined`，判断"是否为空"才用 truthy。**

### ③ `updateEntry` 里 `wordCount` 字段是"假的可写"

```ts
// :626-632
const updated: DiaryEntry = {
  ...entry,
  ...patch,                                      // ← patch 里的 wordCount 先展开进来
  cards,
  wordCount: patch.cards !== undefined ? countCards(cards) : entry.wordCount
  //         ↑ 然后被无条件覆盖
}
```

`UpdateDiaryEntry` 类型里**允许**传 `wordCount`（`shared/types/diary.ts:182`），但主进程会**无视它**、自己重算。
📌 这是**接口设计的不一致**：类型表面上允许，实际被忽略。要么把 `wordCount` 从 `UpdateDiaryEntry` 里删掉（因为它是派生数据，渲染进程不该有资格设置），要么在注释里说明。**"类型里能传"和"实际生效"是两回事，这是 API 设计里很容易埋雷的地方。**

### ④ 同步状态文件的写入绕过了本文件的护栏

`src/main/sync/diary.ts:32` 的 `writeState` 直接 `fs.writeJSON`——**既没有原子写，也没有进 `serializeWrite` 队列**。
而"上传"和"下载"是两个独立按钮，用户可以连点，两次 `writeState` 会互相覆盖 `lastPushAt` / `lastPullAt`（拉取的游标可能被推送的快照覆盖掉）。

📌 这说明一件事：**护栏必须建立在一层公共设施里，而不是靠每个调用方自觉。** 如果 `writeJsonAtomic` + `serializeWrite` 被提到一个共享的 `storage/atomic.ts`，让所有写路径都必须经过它，这个问题就不会出现。
👉 **这是本文最值得你动手改进的一处**：把 `serializeWrite` / `writeJsonAtomic` 抽到 `src/main/storage/atomicWrite.ts`，然后让 `sync/diary.ts` 也用它。

---

## 13. 一页速查表

| 概念 | 在本文件中的位置 | 一句话解释 |
| --- | --- | --- |
| 分层架构 | 全文件无 React / 无 ipcMain | 一层只干一件事 |
| 本地优先 | `:25-40` | 数据主人是用户，服务端只是副本 |
| SSOT / 索引即缓存 | `:491-528` | 文件是事实源，索引坏了能重建 |
| 预聚合 | `:507`、`:726` | 写入时冗余存元数据，读取时省 IO |
| 原子替换 | `writeJsonAtomic` `:468` | 写 `.tmp` 再 rename，读者永不见半截 |
| 串行化 / 互斥 | `serializeWrite` `:458` | Promise 链排队，任何时刻只有一个写在跑 |
| 错误不吞队列 | `writeQueue.then(task, task)` `:459` | then 的第二个参数让失败不阻断后续 |
| 故障隔离 | `readEntryFile` `:478` | 单个坏文件跳过，不拖垮整批读 |
| 解析而非校验 | `normalizeEntry` `:376` | 产出保证合法的对象，下游可信类型 |
| 惰性迁移 | `cardsFromLegacyHtml` `:257` | 读时迁移 + 抹掉旧字段保证幂等 |
| 类型守卫 | `isNonEmptyString` `:89` | 运行时检查 + 告诉编译器 |
| 判别联合 | `DiaryCard` `shared/types/diary.ts:126` | 用 `type` 字面量做标签，自动收窄 |
| 穷尽检查 | `cardText` `:403`（无 default） | 漏了分支编译器会报错 |
| 墓碑 / 软删除 | `deleteEntry` `:642` | 删除要成为可传播的数据 |
| 增量同步水印 | `listEntriesForSync` `:736` | `updatedAt > since` 取增量 |
| 可排序时间格式 | `toISOString` `:595` | ISO 8601 字典序 == 时间序 |
| LWW 冲突解决 | `sync/diary.ts:174` | 谁新用谁，简单但会静默丢数据 |
| 快照游标 | `sync/diary.ts:64` | 游标取自读取之前，不取自处理之后 |
| 写放大 / N+1 | `:558`、`:689` | 知道自己的复杂度，并知道为何可接受 |
| 脆弱约束 | `:550` 的注释 | 只靠注释维持的约束 = 技术债 |

---

## 14. 建议的下一步

如果想真正内化这些概念，按难度递进：

1. **读**：把 `serializeWrite`（`:458-465`）默写一遍，包括 `then(task, task)` 和那个"消毒"的 `then`。想清楚省略任何一个会发生什么。
2. **改（低风险）**：把 `listEntries` 的 `if (filters.offset)` 改成 `!== undefined`，给 `limit` 定一个默认常量。
3. **改（中风险）**：把 `serializeWrite` + `writeJsonAtomic` 抽到 `src/main/storage/atomicWrite.ts`，让 `sync/diary.ts` 的 `writeState` 也走它（即第 12 节 ④）。
4. **设计**：给 `moveEntryDate` 的崩溃残影写一个"孤儿清理"方案——启动时扫描索引里指向不存在文件的记录并修正。想清楚它应该在哪一步执行、会不会和同步冲突。
5. **思考**：如果日记涨到 10 万条，这个文件里**第一个**撑不住的是哪个函数？你会怎么改？（提示：先算 `listEntries` 无筛选时的磁盘读次数。）

---

## 附：相关文档

- `AGENTS.md` —— 项目总览、IPC 三步走约定、存储布局
- `docs/diary-sync-api.md` —— 同步接口契约（增量语义的权威来源）
- `src/shared/types/diary.ts` —— 领域模型定义与注释
- `plan.md` —— 分阶段实施计划
