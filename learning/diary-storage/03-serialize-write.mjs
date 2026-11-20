/**
 * 第 3 课：写入串行化（serializeWrite）
 *
 * 学什么：这是 2026-11-19 真出过的事故 —— 卡片是「改一下就存一次」，
 *        两次写并发交错，磁盘上留下「一份合法 JSON + 上一版的尾巴」，
 *        文件从此解析不了，`diary:list` 整体失败，整本日记看起来是空的。
 * 跑法：  node 03-serialize-write.mjs
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import { createStore, indexPath, writeJsonAtomic } from './lib/store.mjs'
import { bad, conclusion, makeSandbox, ok, padDisplay, run, step, title, tryReadJson } from './lib/demo.mjs'

const WRITERS = 12
const ROUNDS = 5

run(async () => {
  const root = await makeSandbox('03')
  const file = path.join(root, 'race.json')

  /* 长度**各不相同**的正文：真实日记也是这样，长短差得越多，交错留下的残骸越明显 */
  const payloads = Array.from({ length: WRITERS }, (_, i) =>
    JSON.stringify({ writer: i, body: String.fromCharCode(65 + i).repeat(30_000 * (i + 1)) }, null, 2)
  )

  title('一、把 writeFile 拆成两步，让交错必然发生')

  step('fs.writeFile 内部是三步：open("w") → write() → close()。')
  step('其中 open("w") 会**立刻把文件截断成 0 字节**，然后才从 offset 0 开始写。')
  step('把这三步摊开就能看清：多个写者同时截断、又各自从 0 开始写，')
  step('先写的长数据会被后写的短数据截断 —— 短数据写完了，长数据剩下的尾巴还在后面。')

  async function naiveConcurrentWrite(target, list) {
    await Promise.all(
      list.map(async (payload) => {
        const handle = await fs.open(target, 'w') // ① 打开即截断
        await new Promise((resolve) => setTimeout(resolve, Math.random() * 8)) // ② 调度空档
        await handle.writeFile(payload) // ③ 从 offset 0 开始写
        await handle.close()
      })
    )
  }

  let corruptRounds = 0
  for (let round = 0; round < ROUNDS; round++) {
    await naiveConcurrentWrite(file, payloads)
    if ((await tryReadJson(file)) === null) corruptRounds++
  }

  bad(`${ROUNDS} 轮 × ${WRITERS} 个并发写，坏掉 ${corruptRounds} 轮`)

  if (corruptRounds > 0) {
    const raw = await fs.readFile(file, 'utf8')
    let reason = ''
    try {
      JSON.parse(raw)
    } catch (error) {
      reason = error.message
    }
    bad(`JSON.parse：${reason}`)
    step('文件末尾粘着上一版的残骸：')
    console.log(`     …${raw.slice(-80).replace(/\n/g, ' ')}`)
    step('前半段是一个**语法完全合法**的 JSON —— 所以只看「文件能不能打开」是查不出来的，')
    step('必须真的解析它。事故当天整本日记列表报错，就是这个原因。')
  }

  title('二、一个反直觉的细节：长度完全相同时它就不犯了')

  const sameSize = Array.from({ length: WRITERS }, (_, i) =>
    // writer 补成两位，保证 12 份 JSON 的字节长度**完全一致**
    JSON.stringify({ writer: String(i).padStart(2, '0'), body: 'x'.repeat(200_000) }, null, 2)
  )
  let sameSizeCorrupt = 0
  for (let round = 0; round < ROUNDS; round++) {
    await naiveConcurrentWrite(file, sameSize)
    if ((await tryReadJson(file)) === null) sameSizeCorrupt++
  }
  step(`长度完全相同的 ${WRITERS} 份正文：坏掉 ${sameSizeCorrupt} 轮`)
  step('每份都恰好覆盖 0…N 这段字节，谁最后写谁说了算，交错被长度一致「掩盖」了。')
  step('真实日记的正文长度千差万别，所以这个 bug 才「时不时」炸一次：')
  step('跟「只有中文输入法才暴露的输入框 bug，用英文测永远看不到」是同一类问题。')

  title('三、原子写解决了「写坏」，但没解决「并发」')

  const settled = await Promise.allSettled(
    payloads.map((payload) => writeJsonAtomic(file, JSON.parse(payload)))
  )
  const failed = settled.filter((result) => result.status === 'rejected')
  const renameRace = failed.filter((result) => result.reason.code === 'ENOENT').length

  if (failed.length > 0) {
    bad(`${WRITERS} 个写者里有 ${failed.length} 个直接失败，其中 ${renameRace} 个是 ENOENT`)
    step('writeJsonAtomic 用的是固定名字 `${filePath}.tmp`：两个写者同时写它，')
    step('先完成的那个把 .tmp rename 走了，后一个再 rename 就找不到文件。')
    step('更糟的是：后开的写者会用 open("w") 截断前一个正在写的 .tmp，')
    step('于是**连「成功」的那次也可能把坏数据搬过去** —— 临时文件本身成了竞争资源。')
  }
  if ((await tryReadJson(file)) !== null) {
    ok('文件这次可解析：原子写保证读者看到的是「完整的某一版」，不会是半截')
  } else {
    bad('文件依然是坏的：被截断的 .tmp 恰好被 rename 成了正式文件')
  }
  step('结论：原子 ≠ 互斥。「不被写坏」和「不互相打断」是两件事，缺一不可。')

  title('四、三档配置的实测对比')

  const modes = [
    { name: '裸写（无串行 + 无原子）', options: { serialize: false, atomic: false } },
    { name: '只加原子（无串行）', options: { serialize: false, atomic: true } },
    { name: '串行 + 原子（真实实现）', options: { serialize: true, atomic: true } }
  ]
  const COUNT = 20
  const W = [28, 8, 8, 8, 8]

  const row = (cells) =>
    `   │ ${cells.map((cell, i) => padDisplay(cell, W[i])).join(' │ ')} │`
  const line = (left, mid, right) =>
    `   ${left}${W.map((w) => '─'.repeat(w + 2)).join(mid)}${right}`

  console.log(line('┌', '┬', '┐'))
  console.log(row(['配置', '索引损坏', '索引条目', '保存失败', '丢更新']))
  console.log(line('├', '┼', '┤'))

  for (const mode of modes) {
    const caseRoot = await makeSandbox(`03-${mode.options.serialize}-${mode.options.atomic}`)
    const store = createStore(caseRoot, mode.options)

    const results = await Promise.allSettled(
      Array.from({ length: COUNT }, (_, i) =>
        store.save({
          id: `id-${i}`,
          date: `2026-11-${String(1 + (i % 28)).padStart(2, '0')}`,
          title: `第 ${i} 条`,
          body: '正文'.repeat(50)
        })
      )
    )

    const indexRaw = await tryReadJson(indexPath(caseRoot))
    const metaCount = indexRaw
      ? Object.values(indexRaw).reduce((sum, bucket) => sum + bucket.length, 0)
      : 0
    const failedCount = results.filter((result) => result.status === 'rejected').length

    console.log(
      row([
        mode.name,
        indexRaw === null ? '是' : '否',
        String(metaCount),
        String(failedCount),
        String(COUNT - metaCount)
      ])
    )
  }
  console.log(line('└', '┴', '┘'))

  step(`同一批 ${COUNT} 条并发保存：`)
  step('· 裸写：索引文件自己都被写坏（下一次列表直接报错）。')
  step('· 只加原子：文件都不坏，但一部分保存直接失败，另一部分悄悄覆盖掉别人的索引改动 ——')
  step('  条目从列表里凭空消失，磁盘上文件明明还在。这种「不报错的数据丢失」比坏文件更难查。')
  step('· 串行 + 原子：全部保住。')
  step('')
  step('所以 io.ts 的 serializeWrite 排的不只是「写文件」，还有「索引的读-改-写」：')
  step('从读索引到写回索引，中间不能让别的写插进来。')

  title('五、事故复盘')

  step('1) 现象：日记列表整体报错，用户以为数据没了。')
  step('2) 原因：卡片「改一下就存一次」，两次 update 并发写同一个文件，交错出坏 JSON。')
  step('3) 放大：列表要读全部条目，一个坏文件让整个查询失败 → 看起来「整本日记空了」。')
  step('4) 修复：写操作排成一条链（serializeWrite）+ 单次写入走 .tmp + rename。')
  step('5) 兜底：读单个文件失败只跳过并记日志（第 6 课），坏文件不再连坐。')
  step('')
  step('五步里只有第 4 步是「修根因」，其余是「缩小后果」—— 两者都要有。')

  conclusion('一个写队列 + 原子 rename，是这个「文件即数据库」方案的全部并发控制。')
})
