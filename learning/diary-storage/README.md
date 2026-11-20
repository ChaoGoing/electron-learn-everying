# 日记的文件存储：最小案例

一套**独立**的学习材料：把 `src/main/storage/diary/` 里的文件存储机制拆成 7 个小例子，
每个例子都可以直接跑，亲眼看到「不这么做会坏成什么样」。

- 只用 Node 内置模块，**零依赖**，不需要 Electron，不需要构建。
- 只在系统临时目录里开沙盒，跑完不留垃圾，**碰不到你真实的日记数据**。
- 不属于项目源码：`src/` 不引用它、构建不打包它、ESLint 也跳过它（见 `eslint.config.mjs` 的 ignores）。

## 快速开始

```bash
cd learning/diary-storage
node 03-serialize-write.mjs   # 单跑某一课
node run-all.mjs              # 全部跑一遍
```

真实的数据目录长这样（`app.getPath('userData')`）：

```
data/diary/2026/11/2026-11-19-<uuid>.json   # 一天一个文件
data/diary/index.json                       # 列表/搜索/日历用的索引（缓存）
images/<uuid>.png                           # 图片素材，文件里只存 file:// 地址
```

## 课程表

| 课 | 学什么 | 一句话结论 | 对应源码 |
| --- | --- | --- | --- |
| [01 一天一个文件](01-one-file-per-day.mjs) | 落盘布局决定写入代价与故障范围 | 写入量恒定、爆炸半径 = 一天 | `paths.ts` |
| [02 原子落盘](02-atomic-write.mjs) | 崩溃时磁盘上会留下什么 | 必须 `.tmp` + rename，不能原地写 | `io.ts` `writeJsonAtomic` |
| [03 写入串行化](03-serialize-write.mjs) | 并发写如何吃掉数据（可复现） | 原子 ≠ 互斥，两者都要 | `io.ts` `serializeWrite` |
| [04 索引只是缓存](04-index-cache.mjs) | 索引与文件不一致时怎么办 | 能随时从文件重建，才敢当缓存 | `entryIndex.ts` |
| [05 软删除墓碑](05-tombstone.mjs) | 删除为什么要留痕 | 要传播的删除不能真的删 | `entries.ts` `deleteEntry` |
| [06 坏文件不连坐](06-skip-bad-file.mjs) | 读取侧的容错边界 | 单文件故障按单文件粒度吸收 | `entryFile.ts` `readEntryFile` |
| [07 读取时规范化/迁移](07-normalize-and-migrate.mjs) | 磁盘上是历史累积的形状 | 差距收敛在读入口一处 | `normalize.ts` `legacy.ts` |

`lib/store.mjs` 是 7 课共用的极简版持久层（约 250 行）：去掉 Electron / IPC / 卡片模型，
只留下 `serializeWrite` / `writeJsonAtomic` / 索引 / 软删除这些机制本身，每段都标了对应的真实文件。

## 机制速查

| 机制 | 解决什么 | 不用它会怎样 |
| --- | --- | --- |
| 一天一个文件 | 写入量与库大小解耦 | 改一句话要重写整库；一个坏文件毁掉全部日记 |
| `.tmp` + rename | 崩溃/中断留下半截文件 | 覆盖写先截断，中断时旧数据也一起没了 |
| `serializeWrite` 写队列 | 并发写的互相截断与丢更新 | 文件变坏 JSON；索引被覆盖，条目凭空消失 |
| `index.json` 缓存 | 列表/搜索不必遍历全部文件 | 每次都全目录扫描 + 全量解析 |
| 索引可重建 | 索引与文件不一致 | 索引一坏，列表就报错 |
| 软删除墓碑 | 删除要能传播到远端 | 远端永远留着已删的条目，还可能「复活」它 |
| 读时规范化 + 迁移 | 旧数据/脏数据混在磁盘上 | 缺字段一路传染成 `undefined` 崩溃 |
| 单文件容错 | 一个坏文件放大成整库打不开 | 列表页整体报错，用户以为数据全丢 |

## 和真实源码的差异

简化掉的（因为与「文件存储」无关）：

- **Electron**：真实实现用 `app.getPath('userData')` 取根目录，这里直接把 `root` 传进来。
- **卡片模型**：真实的一个条目是一天 + 一组卡片（判别联合 + 版式），这里简化成 `{id, date, title, body}`。
- **IPC / preload**：渲染进程只能经 `window.api` 调主进程，这里直接调函数。
- **同步**：`src/main/sync/diary.ts` 是存储层的另一个消费者，同样受写队列约束；这里只用
  `listForSync()` 说明墓碑为什么会进推送批次。

刻意保留的（这些才是重点）：

- 写队列的 `then(task, task)` 写法（失败也不能卡住后面的写）；
- 固定名字的 `.tmp`（所以并发时它自己也会成为竞争资源）；
- 索引的「损坏 → 重建」而不是「缺失 → 重建」；
- 读取失败只跳过、不抛错。

## 讨论：真实代码里的一个边界

`readIndex()` 在 `index.json` **不存在**时返回空索引，只有**存在但解析失败**时才重建
（`src/main/storage/diary/entryIndex.ts`）。也就是说索引被手工删掉后，列表会是空的，
直到条目被重新写入。第 4 课会实测这个行为，改与不改都说得通（改的代价是首次启动多一次全目录扫描）。

## 相关文档

- `AGENTS.md` 的「本地存储」一节：数据布局、写入约束、迁移规则的权威说明
- `docs/diary-sync-api.md`：同步语义（增量、`updatedAt` 游标、后写覆盖）
- `docs/diary-storage-architecture.md`：面向初学者的源码逐段导读
