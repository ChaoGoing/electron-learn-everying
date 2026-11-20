/**
 * 第 6 课：单个坏文件不连坐
 *
 * 学什么：文件读写一定会遇到坏数据（半截 JSON、手工改坏、磁盘错误、
 *        同步回来的脏数据）。读的一方必须有「跳过它，继续读别的」的自觉。
 * 跑法：  node 06-skip-bad-file.mjs
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import { createStore } from './lib/store.mjs'
import {
  bad,
  conclusion,
  makeSandbox,
  ok,
  run,
  step,
  title
} from './lib/demo.mjs'

run(async () => {
  const root = await makeSandbox('06')
  const store = createStore(root)

  for (const [id, date, name] of [
    ['b1', '2026-11-18', '前一天'],
    ['b2', '2026-11-19', '坏掉的那天'],
    ['b3', '2026-11-20', '后一天']
  ]) {
    await store.save({ id, date, title: name, body: '正文'.repeat(20) })
  }

  title('一、往数据目录里塞一个坏文件')

  const brokenPath = path.join(root, '2026', '11', '2026-11-19-b2.json')
  await fs.writeFile(brokenPath, '{"id":"b2","date":"2026-11-19","body":"写到一半就没了')
  bad('2026-11-19-b2.json 现在是半截 JSON（模拟磁盘/进程事故）')

  title('二、宽容的读法：跳过它，保住其余的')

  const listed = await store.list()
  ok(`列表返回 ${listed.length} 条：${listed.map((e) => e.title).join('、')}`)
  step('上面那行 [跳过] 日志就是 readEntryFile 打的 —— 坏文件按「不存在」处理。')
  step('真实实现：src/main/storage/diary/entryFile.ts 的 readEntryFile()')
  step('  用 try/catch 包住 fs.readJSON，解析失败记日志并返回 null。')

  title('三、不宽容的读法会怎样')

  const all = await fs.readdir(path.join(root, '2026', '11'))
  let crashed = null
  try {
    const strict = []
    for (const file of all) {
      strict.push(JSON.parse(await fs.readFile(path.join(root, '2026', '11', file), 'utf8')))
    }
    step(`没报错，读到 ${strict.length} 条`)
  } catch (error) {
    crashed = error
  }
  if (crashed) {
    bad(`同样的数据，不捕获异常的实现直接抛错：${crashed.message}`)
    step('一口气读完再返回的写法，会让「一天坏了」升级成「整本日记打不开」。')
    step('事故复盘里的现象就是这样：日记列表页报错，用户以为数据全没了。')
  }

  title('四、写的一方也要防')

  await fs.rm(brokenPath, { force: true })
  await store.readIndex()
  step('读坏索引的处理不同：索引只是缓存，所以不是「跳过」而是「整体重建」。')
  step('判断标准：这份数据丢了会不会真的丢信息？会 → 报错或重建；不会 → 跳过。')

  const rebuilt = await store.rebuildIndex()
  ok(`按磁盘文件重建索引：${Object.values(rebuilt).reduce((n, b) => n + b.length, 0)} 条`)
  step('重建时同样要跳过坏文件，否则一个坏文件会让重建也失败。')

  title('五、还有一件事：谁来修')

  step('跳过只是「不让它连坐」，坏掉的那一天并没有回来。')
  step('产品上要有兜底：备份目录、回收站，或者让同步的远端把好版本再推回来。')
  step('本项目的同步是「后写覆盖」：远端更新的话会把本地这条覆盖掉，坏文件就自愈了。')

  conclusion('单个文件的故障必须以单个文件的粒度被吸收 —— 用 try/catch 换回可用性。')
})
