/**
 * 第 5 课：软删除（墓碑 / tombstone）
 *
 * 学什么：为什么「删除」不能真的删文件 —— 因为这个库要和远端同步。
 * 跑法：  node 05-tombstone.mjs
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import { createStore, entryPath } from './lib/store.mjs'
import { conclusion, makeSandbox, ok, run, step, title, tryReadJson } from './lib/demo.mjs'

run(async () => {
  const root = await makeSandbox('05')
  const store = createStore(root)

  await store.save({ id: 'keep', date: '2026-11-18', title: '保留的这天', body: '留着' })
  await store.save({ id: 'gone', date: '2026-11-19', title: '要删的这天', body: '删掉' })

  title('一、软删除：写墓碑，不删文件')

  const tombstone = await store.softDelete('gone')
  ok(`返回值里带上了时间戳：deletedAt = ${tombstone.deletedAt}`)
  ok(`文件仍在磁盘上：${(await tryReadJson(entryPath(root, tombstone))) !== null}`)
  step('文件内容变成 { …, deletedAt: "2026-…", updatedAt: "2026-…" }')

  const visible = await store.list()
  ok(`列表隐藏了墓碑：剩 ${visible.length} 条（${visible.map((e) => e.title).join('、')}）`)
  step('所有面向用户的查询都要过滤 deletedAt —— 删掉的东西不该出现在界面上。')

  title('二、如果直接删文件会怎样')

  const beforeSync = await store.listForSync('')
  step(`删之前，同步批次里有 ${beforeSync.length} 条（含墓碑）`)
  step('同步的语义是「把本地变更推给远端」，判断依据是 updatedAt > 上次游标。')
  step('')
  step('硬删除的话：本地文件没了、索引也没了 → 推送批次里根本没有这条记录，')
  step('远端于是永远留着它，下次拉取还可能把它「复活」回本地。')
  step('软删除的话：墓碑带着新的 updatedAt 进入推送批次，远端收到后同样标记删除 —— 删除传播出去了。')

  title('三、墓碑的代价')

  await store.hardDelete('keep')
  step('对比一下两种删法留下的痕迹：')

  const listed = await store.list({ includeDeleted: true })
  const tombstoneLeft = listed.find((entry) => entry.id === 'gone')
  step(
    `· 软删的「要删的这天」：文件还在磁盘上 = ${(await tryReadJson(entryPath(root, tombstoneLeft))) !== null}，` +
      `列表（含墓碑）里看得到，deletedAt = ${tombstoneLeft?.deletedAt}`
  )
  const hardDeletedFile = path.join(root, '2026', '11', '2026-11-18-keep.json')
  step(
    `· 硬删的「保留的这天」：文件还在磁盘上 = ${await fs
      .stat(hardDeletedFile)
      .then(() => true)
      .catch(() => false)}，` +
      `列表里还找得到吗 = ${listed.some((entry) => entry.id === 'keep')}`
  )
  step('')
  step('墓碑要长期保留 → 文件会越攒越多 → 同步/列表时要靠过滤和清理策略兜住。')
  step('真实实现里，所有用户可见的查询都显式跳过 `entry.deletedAt`。')

  conclusion('删除是不是「删数据」，取决于这份数据要不要传播给别人。')
})
