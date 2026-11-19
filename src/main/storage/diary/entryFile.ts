import path from 'path'
import fs from 'fs-extra'
import type { DiaryEntry } from '../../../shared/types/diary'
import { writeJsonAtomic } from './io'
import { normalizeEntry } from './normalize'
import { entryDate, getEntryPath } from './paths'

/* ─────────────────────────────────────────────────────────────
   单条日记文件的读写

   只负责「一个 .json 文件 ↔ 一条 DiaryEntry」，不碰索引；索引由 entryIndex.ts
   维护，两者在 entries.ts 里组合成一次完整的保存。
───────────────────────────────────────────────────────────── */

/**
 * 读一条日记文件。
 * 单个文件坏了（半截 JSON、被手工改坏）只记日志并跳过，不让整本日记跟着打不开。
 */
export async function readEntryFile(filePath: string): Promise<DiaryEntry | null> {
  try {
    return normalizeEntry(await fs.readJSON(filePath))
  } catch (error) {
    console.error(`日记文件读取失败，已跳过：${filePath}`, error)
    return null
  }
}

/** 按日期 + id 读一条日记；文件不存在或损坏时返回 null。 */
export async function readEntry(date: string, id: string): Promise<DiaryEntry | null> {
  const filePath = getEntryPath(date, id)
  if (!(await fs.pathExists(filePath))) return null
  return await readEntryFile(filePath)
}

/** 条目文件是否还在磁盘上（索引可能指向已经被搬走/删掉的文件）。 */
export async function entryFileExists(date: string, id: string): Promise<boolean> {
  return await fs.pathExists(getEntryPath(date, id))
}

/** 落盘一条日记（只写文件，不动索引）。 */
export async function writeEntryFile(entry: DiaryEntry): Promise<void> {
  const filePath = getEntryPath(entryDate(entry), entry.id)
  await fs.ensureDir(path.dirname(filePath))
  await writeJsonAtomic(filePath, entry)
}

/** 删掉条目文件本身（迁移日期后清理旧位置）。 */
export async function removeEntryFile(date: string, id: string): Promise<void> {
  const filePath = getEntryPath(date, id)
  if (await fs.pathExists(filePath)) await fs.remove(filePath)
}
