/**
 * 第 4 课：索引只是缓存（index.json）
 *
 * 学什么：有了「一天一个文件」，列表/搜索就不能每次遍历全部文件 —— 于是有了索引。
 *        但索引一旦成为「第二份事实」，就会和文件不一致；这课看它怎么兜底。
 * 跑法：  node 04-index-cache.mjs
 */
import fs from 'node:fs/promises'
import { createStore, indexPath } from './lib/store.mjs'
import {
  bad,
  conclusion,
  makeSandbox,
  ok,
  run,
  step,
  title,
  tryReadJson
} from './lib/demo.mjs'

run(async () => {
  const root = await makeSandbox('04')
  const store = createStore(root)

  title('一、索引里存什么')

  for (const [id, date, title_] of [
    ['a1', '2026-11-17', '周一'],
    ['a2', '2026-11-18', '周二'],
    ['a3', '2026-11-19', '周三']
  ]) {
    await store.save({ id, date, title: title_, body: '正文'.repeat(20) })
  }

  const index = await tryReadJson(indexPath(root))
  step('index.json 的形状：{ [日期]: [摘要…] } —— 只存列表要用的字段：')
  console.log(JSON.stringify(index, null, 2).replace(/^/gm, '     '))
  step('正文留在各自的文件里。列表页读索引就够了，不用把几 MB 的正文全读进内存。')

  title('二、索引坏了 → 按磁盘文件重建')

  await fs.writeFile(indexPath(root), '{ "2026-11-19": [ 半截')
  bad('把 index.json 写坏（模拟断电/手工改坏）')
  const listed = await store.list()
  ok(`列表依然返回 ${listed.length} 条：${listed.map((e) => e.title).join('、')}`)
  const rebuilt = await tryReadJson(indexPath(root))
  ok(`index.json 已被重建，条目数 = ${Object.values(rebuilt ?? {}).reduce((n, b) => n + b.length, 0)}`)
  step('关键前提：**每个日记文件里都存了所有列表需要的字段**（id/date/title/updatedAt）。')
  step('索引丢了只是慢一点（要遍历目录），不会丢数据 —— 这才叫「缓存」。')

  title('三、索引被删掉呢？')

  await fs.rm(indexPath(root), { force: true })
  const afterDelete = await store.list()
  if (afterDelete.length === 0) {
    bad('列表空了 —— 文件明明还在，却什么都看不见')
    step('原因：readIndex() 把「文件不存在」当成「还没有任何日记」，直接返回空索引，')
    step('于是它不会触发重建（只有「存在但解析失败」才会重建）。')
    step('真实源码同此行为：src/main/storage/diary/entryIndex.ts 的 readIndex()。')
    step('想改的话是这一行：文件缺失时也走 rebuildIndex()，代价是首次启动多一次全目录扫描。')
  } else {
    ok(`列表返回 ${afterDelete.length} 条（索引缺失时也重建了）`)
  }

  title('四、索引与文件不一致的其它情况')

  const orphan = await store.readIndex()
  step(`索引里的条目数：${Object.values(orphan).reduce((n, b) => n + b.length, 0)}（上一步删掉了索引）`)
  step('· 索引里有、磁盘上没有 → 读取时跳过（entryFile 会返回 null），不会报错。')
  step('· 磁盘上有、索引里没有 → 列表看不到它，直到重建索引（这是「文件是事实源」的兜底）。')
  step('· 日期改了（页面设置里改日期）→ 文件要搬到新的年月目录，索引里旧日期的记录也要删掉，')
  step('  两件事必须一起做，所以 moveEntryDate 同样跑在写队列里。')

  conclusion('索引是「可丢弃的加速结构」：能在任何时刻从文件重建，才敢把它当缓存用。')
})
