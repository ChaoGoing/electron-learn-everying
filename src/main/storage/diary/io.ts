import fs from 'fs-extra'

/* ─────────────────────────────────────────────────────────────
   写入串行化与原子落盘

   卡片是"改一下就存一次"，界面上很容易同时发出两次 update；两次 writeFile
   的截断与写入交错，磁盘上就会留下"一份合法 JSON + 上一版的尾巴"，这个文件
   从此解析不了（`diary:list` 会整体失败，整本日记看起来是空的）。
   这里把写操作排成一条链，任何时刻只有一个写在跑；单次写入再走
   "临时文件 + rename"，进程中途挂掉也不会留下半截文件。
───────────────────────────────────────────────────────────── */

let writeQueue: Promise<unknown> = Promise.resolve()

/** 把写操作排进队列，保证任何时刻只有一个写在跑。任务失败也不会卡住后面的写。 */
export function serializeWrite<T>(task: () => Promise<T>): Promise<T> {
  const run = writeQueue.then(task, task)
  writeQueue = run.then(
    (): void => undefined,
    (): void => undefined
  )
  return run
}

/** 先写 `.tmp` 再 rename：同目录 rename 是原子的，读者要么看到旧版要么看到新版。 */
export async function writeJsonAtomic(filePath: string, data: unknown): Promise<void> {
  const tempPath = `${filePath}.tmp`
  await fs.writeJSON(tempPath, data, { spaces: 2 })
  await fs.rename(tempPath, filePath)
}
