/**
 * 第 1 课：一天一个文件
 *
 * 学什么：数据在磁盘上怎么摆，决定了「改一点」的代价和「坏一个」的爆炸半径。
 * 跑法：  node 01-one-file-per-day.mjs
 */
import fs from 'node:fs/promises'
import { createStore, entryPath } from './lib/store.mjs'
import { conclusion, makeSandbox, printTree, run, step, title } from './lib/demo.mjs'

const DAYS = 40

run(async () => {
  const root = await makeSandbox('01')
  const store = createStore(root)

  title('一、落盘布局：一天 = 一个文件')

  for (const date of ['2026-11-17', '2026-11-18', '2026-11-19']) {
    await store.save({
      id: `id-${date}`,
      date,
      title: `${date} 的日记`,
      body: `${date} 这天记了一段话。`
    })
  }

  await printTree(root)

  step('注意落盘路径：{year}/{month}/{date}-{id}.json —— 目录本身就是时间索引，')
  step('想读某个月，readdir 两个目录就够，不用打开每一年的文件。')
  step('index.json 是另存的缓存（第 4 课专门讲）。')

  title(`二、写放大：改一句话要重写多少数据（先塞 ${DAYS} 天）`)

  const entries = []
  for (let i = 0; i < DAYS; i++) {
    const date = new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10)
    const entry = await store.save({
      id: `id-${i}`,
      date,
      title: `${date} 的日记`,
      body: '今天记了一件事。'.repeat(40)
    })
    entries.push(entry)
  }

  const singleFileBytes = Buffer.byteLength(JSON.stringify(entries, null, 2))
  const oneDay = entries[7]
  const oneDayBytes = Buffer.byteLength(JSON.stringify(oneDay, null, 2))

  step(`方案 A「一天一个文件」：改一天 = 重写 ${oneDayBytes} B，写放大与库的大小无关。`)
  step(`方案 B「全部塞进一个 diary.json」：改一天 = 读出 ${singleFileBytes} B、改完再写回 ${singleFileBytes} B。`)
  step(`当前只存了 ${DAYS} 天，差距已经有 ${Math.round(singleFileBytes / oneDayBytes)} 倍；`)
  step('日记是会攒好几年的数据，方案 B 的代价随时间线性增长（而且每次都要整库序列化）。')

  title('三、爆炸半径')

  step('方案 A：一个文件坏了 → 只有那一天读不出来（第 6 课会实测）。')
  step('方案 B：整个 diary.json 坏了 → 所有日记一起打不开。')
  step('这也是「文件即数据库」要付的代价：没有事务，就用「小文件 + 原子写 + 串行写」补回来。')

  // 顺手验证一下路径函数和磁盘上的文件真的对得上
  const expected = entryPath(root, oneDay)
  const exists = await fs
    .stat(expected)
    .then(() => true)
    .catch(() => false)
  step(`路径函数 entryPath() 与磁盘一致：${exists ? '是' : '否'}`)

  conclusion('一天一个文件 = 写入量恒定 + 故障范围最小；代价是「跨天的一致性」要自己保证。')
})
