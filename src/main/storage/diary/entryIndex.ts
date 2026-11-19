import path from 'path'
import fs from 'fs-extra'
import type { DiaryEntry } from '../../../shared/types/diary'
import { readEntryFile } from './entryFile'
import { writeJsonAtomic } from './io'
import { entryMeta, type DiaryEntryMeta } from './normalize'
import { entryDate, getDataDir, getIndexPath } from './paths'

/* ─────────────────────────────────────────────────────────────
   索引读写（data/diary/index.json）

   结构：{ [dateStr]: DiaryEntryMeta[] }，供列表 / 搜索 / 日历直接读取，
   不必遍历所有正文文件。索引只是缓存，**文件才是事实源**，读坏就按磁盘重建。
───────────────────────────────────────────────────────────── */

type DiaryIndex = Record<string, DiaryEntryMeta[]>

/** 按磁盘上的文件重建索引。 */
async function rebuildIndex(): Promise<DiaryIndex> {
  const rebuilt: DiaryIndex = {}
  const root = getDataDir()
  if (!(await fs.pathExists(root))) return rebuilt

  for (const year of await fs.readdir(root)) {
    const yearDir = path.join(root, year)
    if (!(await fs.stat(yearDir)).isDirectory()) continue
    for (const month of await fs.readdir(yearDir)) {
      const monthDir = path.join(yearDir, month)
      if (!(await fs.stat(monthDir)).isDirectory()) continue
      for (const file of await fs.readdir(monthDir)) {
        if (!file.endsWith('.json')) continue
        const entry = await readEntryFile(path.join(monthDir, file))
        if (!entry) continue
        const date = entryDate(entry)
        if (!rebuilt[date]) rebuilt[date] = []
        rebuilt[date].push(entryMeta(entry))
      }
    }
  }

  await writeIndex(rebuilt)
  return rebuilt
}

async function writeIndex(index: DiaryIndex): Promise<void> {
  const indexPath = getIndexPath()
  await fs.ensureDir(path.dirname(indexPath))
  await writeJsonAtomic(indexPath, index)
}

/** 读索引；文件缺失返回空索引，损坏则按磁盘文件重建。 */
export async function readIndex(): Promise<DiaryIndex> {
  const indexPath = getIndexPath()
  if (!(await fs.pathExists(indexPath))) return {}
  try {
    return (await fs.readJSON(indexPath)) as DiaryIndex
  } catch (error) {
    console.error('日记索引损坏，改为按磁盘文件重建：', error)
    return await rebuildIndex()
  }
}

/**
 * 把一条日记的摘要写进索引（没有则新增）。
 *
 * 调用方必须在 `serializeWrite` 里跑：这里读索引、改索引、写索引，并发时后写的会吃掉先写的。
 */
export async function upsertIndexMeta(entry: DiaryEntry): Promise<void> {
  const date = entryDate(entry)
  const index = await readIndex()
  if (!index[date]) index[date] = []
  const meta = entryMeta(entry)
  const i = index[date].findIndex((e) => e.id === entry.id)
  if (i === -1) {
    index[date].push(meta)
  } else {
    index[date][i] = meta
  }
  await writeIndex(index)
}

/** 从索引里移除某一天的某条记录；该天清空后整个键删掉。 */
export async function removeIndexMeta(date: string, id: string): Promise<void> {
  const index = await readIndex()
  const bucket = index[date]
  if (!bucket) return
  const remaining = bucket.filter((meta) => meta.id !== id)
  if (remaining.length > 0) {
    index[date] = remaining
  } else {
    delete index[date]
  }
  await writeIndex(index)
}
