/**
 * 日记的本地持久层：所有日记数据的磁盘读写都在这个目录里，渲染进程只经 IPC 取用。
 *
 * 文件分工（下层不反向依赖上层）：
 * - `paths.ts`      路径解析：数据目录 / 图片目录 / 条目文件 / 索引文件
 * - `cards.ts`      卡片规范化：补默认值、丢弃非法卡片、重排 order
 * - `legacy.ts`     旧版 Tiptap HTML 正文 → 卡片的迁移
 * - `text.ts`       卡片/条目文本提取与中英混排字数
 * - `normalize.ts`  条目规范化（读旧数据时补默认值并顺带迁移）
 * - `io.ts`         写入串行化 `serializeWrite` + 原子落盘 `writeJsonAtomic`
 * - `entryFile.ts`  单个条目文件的读写
 * - `entryIndex.ts` index.json 的读写与重建
 * - `entries.ts`    对外 CRUD / 查询 API（文件与索引在这里组合成一次保存）
 * - `images.ts`     图片素材（选择 / 复制 / 列表）
 *
 * 本文件只做转出，保证 `../storage/diary` 这个导入路径不变。
 */
export {
  createEntry,
  deleteEntry,
  getDatesWithEntries,
  getEntriesByDate,
  getEntry,
  listEntries,
  listEntriesForSync,
  searchEntries,
  updateEntry,
  upsertSyncedEntry
} from './entries'
export { countText } from './text'
export { listImages, uploadImage, uploadImages } from './images'
