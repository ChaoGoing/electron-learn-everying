/**
 * 极简版「日记存储」：把 `src/main/storage/diary/` 的核心机制抽出来，
 * 去掉 Electron / IPC / 卡片模型，只留**文件存储本身**。
 *
 * 每一段都能和真实源码对上：
 *   writeJsonAtomic / writeJsonNaive  ←→  src/main/storage/diary/io.ts
 *   createWriteQueue                  ←→  src/main/storage/diary/io.ts 的 serializeWrite
 *   entryPath / indexPath             ←→  src/main/storage/diary/paths.ts
 *   readEntryFile（坏文件跳过）        ←→  src/main/storage/diary/entryFile.ts
 *   readIndex / rebuildIndex          ←→  src/main/storage/diary/entryIndex.ts
 *   save / softDelete                 ←→  src/main/storage/diary/entries.ts
 *
 * 真实实现里一个条目是「一天 + 一组卡片」，这里简化成「一天 + 一段正文」，
 * 因为我们要学的是**怎么把数据安全地放到磁盘上**，不是日记的数据模型。
 */
import fs from 'node:fs/promises'
import path from 'node:path'

/* ─────────────────────────────────────────────────────────────
   1. 路径布局：一天一个文件，按年月分目录
───────────────────────────────────────────────────────────── */

/** `{root}/{year}/{month}/{date}-{id}.json` */
export function entryPath(root, entry) {
  const [year, month] = entry.date.split('-')
  return path.join(root, year, month, `${entry.date}-${entry.id}.json`)
}

/** 索引文件：`{root}/index.json`，列表/搜索/日历读它，不必遍历全部正文。 */
export function indexPath(root) {
  return path.join(root, 'index.json')
}

/* ─────────────────────────────────────────────────────────────
   2. 两种落盘方式
───────────────────────────────────────────────────────────── */

/**
 * ❌ 反面教材：直接覆盖目标文件。
 * 写入过程中崩溃（或两次写交错）→ 磁盘上留下「半截 JSON」。
 */
export async function writeJsonNaive(filePath, data) {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2))
}

/**
 * ✅ 临时文件 + rename。
 * 同目录内的 rename 是原子操作：读者要么看到完整的旧版，要么看到完整的新版，
 * 不会看到写了一半的中间状态；进程在任何时刻崩掉，目标文件也还是好的。
 */
export async function writeJsonAtomic(filePath, data) {
  const tempPath = `${filePath}.tmp`
  await fs.writeFile(tempPath, JSON.stringify(data, null, 2))
  await fs.rename(tempPath, filePath)
}

/* ─────────────────────────────────────────────────────────────
   3. 写入串行化：任何时刻只允许一个写在跑
───────────────────────────────────────────────────────────── */

/**
 * 返回一个 `serializeWrite(task)`：把写操作排成一条链。
 * 任务失败也不会卡住后面的写（所以是 `then(task, task)` 而不是 `then(task)`）。
 */
export function createWriteQueue() {
  let tail = Promise.resolve()
  return function serializeWrite(task) {
    const run = tail.then(task, task)
    tail = run.then(
      () => undefined,
      () => undefined
    )
    return run
  }
}

/* ─────────────────────────────────────────────────────────────
   4. 存储实例
───────────────────────────────────────────────────────────── */

function meta(entry) {
  // 索引里只存列表需要的字段，正文留在各自的文件里
  return {
    id: entry.id,
    date: entry.date,
    title: entry.title,
    updatedAt: entry.updatedAt,
    deletedAt: entry.deletedAt ?? null
  }
}

/**
 * @param {string} root  数据根目录（真实应用里是 `app.getPath('userData')/data/diary`）
 * @param {{ serialize?: boolean, atomic?: boolean }} options
 *        两个开关是给课程用的：关掉就能亲眼看到「不这么做会坏成什么样」。
 */
export function createStore(root, { serialize = true, atomic = true } = {}) {
  const enqueue = createWriteQueue()

  /** 写操作统一入口：需要时就排进队列（串行化开关在这里生效）。 */
  function runWrite(task) {
    return serialize ? enqueue(task) : task()
  }

  async function writeJson(filePath, data) {
    await fs.mkdir(path.dirname(filePath), { recursive: true })
    return atomic ? writeJsonAtomic(filePath, data) : writeJsonNaive(filePath, data)
  }

  /* ── 读：坏文件只跳过，不连坐 ── */

  /** 读一条日记文件；单个文件坏了（半截 JSON、被手工改坏）只记日志并返回 null。 */
  async function readEntryFile(filePath) {
    try {
      return JSON.parse(await fs.readFile(filePath, 'utf8'))
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error(`  [跳过] 文件读取失败：${path.basename(filePath)}（${error.message}）`)
      }
      return null
    }
  }

  /** 遍历磁盘上的所有条目文件（重建索引、全量扫描时用）。 */
  async function readAllEntryFiles() {
    const entries = []
    const years = await fs.readdir(root, { withFileTypes: true }).catch(() => [])
    for (const year of years) {
      if (!year.isDirectory()) continue
      const yearDir = path.join(root, year.name)
      for (const month of await fs.readdir(yearDir, { withFileTypes: true })) {
        if (!month.isDirectory()) continue
        const monthDir = path.join(yearDir, month.name)
        for (const file of await fs.readdir(monthDir)) {
          if (!file.endsWith('.json')) continue
          const entry = await readEntryFile(path.join(monthDir, file))
          if (entry) entries.push(entry)
        }
      }
    }
    return entries
  }

  /* ── 索引：只是缓存，坏了就按磁盘文件重建 ── */

  async function writeIndex(index) {
    await writeJson(indexPath(root), index)
  }

  /** 按磁盘上的文件重建索引；文件才是事实源。 */
  async function rebuildIndex() {
    const rebuilt = {}
    for (const entry of await readAllEntryFiles()) {
      if (!rebuilt[entry.date]) rebuilt[entry.date] = []
      rebuilt[entry.date].push(meta(entry))
    }
    await writeIndex(rebuilt)
    return rebuilt
  }

  async function readIndex() {
    try {
      return JSON.parse(await fs.readFile(indexPath(root), 'utf8'))
    } catch (error) {
      if (error.code === 'ENOENT') return {}
      console.error('  [索引损坏] 改为按磁盘文件重建')
      return await rebuildIndex()
    }
  }

  /* ── 写：条目文件 + 索引一起改（必须在 runWrite 里跑）── */

  /** 不排队的写：调用方负责保证它跑在写队列里。 */
  async function saveUnsafe(entry) {
    const full = { tags: [], deletedAt: null, ...entry }
    await writeJson(entryPath(root, full), full)

    const index = await readIndex()
    if (!index[full.date]) index[full.date] = []
    const at = index[full.date].findIndex((m) => m.id === full.id)
    if (at === -1) index[full.date].push(meta(full))
    else index[full.date][at] = meta(full)
    await writeIndex(index)

    return full
  }

  return {
    root,

    /** 保存（新增或覆盖）一天的日记。 */
    async save(entry) {
      return await runWrite(async () => {
        const full = { updatedAt: new Date().toISOString(), ...entry }
        return await saveUnsafe(full)
      })
    },

    /** 软删除：写 `deletedAt` 墓碑，而不是把文件删掉。 */
    async softDelete(id) {
      return await runWrite(async () => {
        const entry = await this.get(id)
        if (!entry) return null
        const now = new Date().toISOString()
        return await saveUnsafe({ ...entry, deletedAt: now, updatedAt: now })
      })
    },

    /** 硬删除：直接删文件。本地看着干净，但远端永远不知道这条被删了。 */
    async hardDelete(id) {
      return await runWrite(async () => {
        const entry = await this.get(id)
        if (!entry) return false
        await fs.rm(entryPath(root, entry), { force: true })
        const index = await readIndex()
        if (index[entry.date]) {
          index[entry.date] = index[entry.date].filter((m) => m.id !== id)
          await writeIndex(index)
        }
        return true
      })
    },

    /** 按 id 取一条（含墓碑）。 */
    async get(id, { includeDeleted = true } = {}) {
      const index = await readIndex()
      for (const date of Object.keys(index)) {
        const found = index[date].find((e) => e.id === id)
        if (!found) continue
        const entry = await readEntryFile(entryPath(root, found))
        if (!entry) continue
        if (!includeDeleted && entry.deletedAt) continue
        return entry
      }
      return null
    },

    /** 列表：走索引，按日期倒序；默认隐藏墓碑。 */
    async list({ includeDeleted = false } = {}) {
      const index = await readIndex()
      const entries = []
      for (const date of Object.keys(index).sort().reverse()) {
        for (const m of index[date] || []) {
          const entry = await readEntryFile(entryPath(root, m))
          if (!entry) continue
          if (!includeDeleted && entry.deletedAt) continue
          entries.push(entry)
        }
      }
      entries.sort((a, b) => b.date.localeCompare(a.date))
      return entries
    },

    /**
     * 同步用的增量列表：返回 `updatedAt > since` 的条目，**包含墓碑**。
     * `since` 传空字符串就是首次全量同步。
     * 真实实现见 `src/main/storage/diary/entries.ts` 的 `listEntriesForSync`。
     */
    async listForSync(since = '') {
      const index = await readIndex()
      const entries = []
      for (const date of Object.keys(index)) {
        for (const m of index[date] || []) {
          const entry = await readEntryFile(entryPath(root, m))
          if (!entry) continue
          if (!since || entry.updatedAt > since) entries.push(entry)
        }
      }
      entries.sort((a, b) => a.updatedAt.localeCompare(b.updatedAt))
      return entries
    },

    /* 课程用得到的内部件 */
    readIndex,
    rebuildIndex,
    readEntryFile,
    writeJson,
    entryPath: (entry) => entryPath(root, entry)
  }
}
