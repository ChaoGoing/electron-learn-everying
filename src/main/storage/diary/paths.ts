import { app } from 'electron'
import path from 'path'
import type { DiaryEntry } from '../../../shared/types/diary'

/** 日记数据根目录：`userData/data/diary`。 */
export function getDataDir(): string {
  return path.join(app.getPath('userData'), 'data', 'diary')
}

/** 图片素材目录：`userData/images`。 */
export function getImagesDir(): string {
  return path.join(app.getPath('userData'), 'images')
}

/** 一条日记的落盘路径：`{year}/{month}/{date}-{id}.json`。 */
export function getEntryPath(date: string, id: string): string {
  const [year, month] = date.split('-')
  return path.join(getDataDir(), year, month, `${date}-${id}.json`)
}

/** 日记索引文件：`data/diary/index.json`。 */
export function getIndexPath(): string {
  return path.join(getDataDir(), 'index.json')
}

/** 条目所属日期，取 ISO 时间戳的前 10 位。 */
export function entryDate(entry: DiaryEntry): string {
  return entry.createdAt.slice(0, 10)
}
