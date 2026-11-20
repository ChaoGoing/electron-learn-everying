/**
 * 第 2 课：原子落盘（.tmp + rename）
 *
 * 学什么：进程随时可能被杀（崩溃 / 断电 / 用户强退），
 *        写入方式决定了「那一刻磁盘上留下什么」。
 * 跑法：  node 02-atomic-write.mjs
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import { writeJsonAtomic } from './lib/store.mjs'
import { bad, conclusion, makeSandbox, ok, run, step, title, tryReadJson } from './lib/demo.mjs'

const V1 = { version: 1, body: '第一版正文'.repeat(30) }
const V2 = { version: 2, body: '第二版正文'.repeat(30) }

run(async () => {
  const root = await makeSandbox('02')
  const file = path.join(root, '2026-11-19-id.json')

  title('一、直接覆盖写：写到一半被杀会留下什么')

  await fs.writeFile(file, JSON.stringify(V1, null, 2)) // 磁盘上先有一个完整旧版
  step('磁盘上已有 V1（完整）')

  const half = JSON.stringify(V2, null, 2).slice(0, 100)
  await fs.writeFile(file, half) // 模拟：writeFile 刚写了个开头，进程就没了
  step('模拟「覆盖写 V2 时进程被杀」')

  const afterNaive = await fs.readFile(file, 'utf8')
  bad(`文件现在是 ${afterNaive.length} B 的半截 JSON：`)
  console.log(`     ${afterNaive.replace(/\n/g, ' ').slice(0, 72)}…`)
  bad(`JSON.parse 结果：${(await tryReadJson(file)) === null ? '抛错（旧数据也一起丢了）' : '意外成功'}`)
  step('注意：V1 已经没了 —— 覆盖写是先清空再写，中间态没有退路。')

  title('二、先写 .tmp 再 rename：同样的「中断」')

  await writeJsonAtomic(file, V1) // 恢复到完整 V1
  step('磁盘上恢复为完整 V1')

  const tempPath = `${file}.tmp`
  await fs.writeFile(tempPath, half) // 中断发生在临时文件上
  step('模拟「写 .tmp 时进程被杀」（只写了个开头）')

  const afterAtomic = await tryReadJson(file)
  if (afterAtomic) {
    ok(`目标文件仍然可读，内容 = V${afterAtomic.version}（完整旧版）`)
  } else {
    bad('目标文件被破坏了 —— 不应该发生')
  }
  step(`磁盘上多了一个垃圾文件：${path.basename(tempPath)}（下次写入会把它覆盖掉）`)

  title('三、为什么这样是安全的')

  step('1) rename 只改目录项，不搬运数据，同一个目录内是**原子**的：')
  step('   读者看到的要么是完整的旧文件，要么是完整的新文件，没有中间态。')
  step('2) 写入期间数据都在 .tmp 里，目标文件始终是一个完整版本。')
  step('3) 崩溃只可能发生在「.tmp 写了一半」或「rename 还没执行」，')
  step('   两种情况目标文件都是旧的完整版 —— 最多丢最后一次修改，不会丢整个文件。')

  const final = await tryReadJson(file)
  ok(`最终可读：V${final?.version}`)

  conclusion('要保证「不被写坏」，写文件必须是 rename 覆盖，而不是原地写。')
})
