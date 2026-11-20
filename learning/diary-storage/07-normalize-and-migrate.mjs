/**
 * 第 7 课：读取时规范化 + 顺带迁移
 *
 * 学什么：磁盘上的数据是「历史累积」的 —— 老版本写的、手工改的、远端推来的，
 *        字段可能缺、类型可能错。读的一方负责把它们补成同一个形状。
 * 跑法：  node 07-normalize-and-migrate.mjs
 */
import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
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

/**
 * 简化的「条目规范化」：所有读取路径都要过这一关。
 * 真实实现见 src/main/storage/diary/normalize.ts 的 normalizeEntry()。
 */
function normalizeEntry(raw) {
  const createdAt = raw?.createdAt ?? raw?.date ?? ''
  return {
    id: typeof raw?.id === 'string' && raw.id ? raw.id : crypto.randomUUID(),
    date: createdAt.slice(0, 10),
    title: typeof raw?.title === 'string' ? raw.title : '',
    // 迁移：老版本把正文放在 content 里（还是一段 HTML），新版本用 body
    body: typeof raw?.body === 'string' ? raw.body : stripTags(raw?.content ?? ''),
    tags: Array.isArray(raw?.tags) ? raw.tags.filter((t) => typeof t === 'string' && t) : [],
    deletedAt: raw?.deletedAt ?? null,
    createdAt,
    updatedAt: raw?.updatedAt ?? createdAt
  }
}

function stripTags(html) {
  return String(html)
    .replace(/<\/(p|div|h[1-6]|li)>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n')
}

run(async () => {
  const root = await makeSandbox('07')
  const legacyPath = path.join(root, '2026', '11', '2026-11-19-old.json')
  await fs.mkdir(path.dirname(legacyPath), { recursive: true })

  title('一、磁盘上的一条「旧版本」数据')

  const legacy = {
    id: 'old-1',
    date: '2026-11-19',
    content: '<p>今天写了点东西。</p><p>第二段。</p>'
    // 没有 body / tags / deletedAt / updatedAt —— 都是后来才加上的字段
  }
  await fs.writeFile(legacyPath, JSON.stringify(legacy, null, 2))
  console.log(JSON.stringify(legacy, null, 2).replace(/^/gm, '     '))

  title('二、不做处理直接交给界面会怎样')

  const raw = await tryReadJson(legacyPath)
  step(`entry.body      = ${raw.body}  → 界面上正文是空的`)
  step(`entry.deletedAt = ${raw.deletedAt}  → 「删除过滤」拿到 undefined，行为不确定`)

  let tagError = null
  try {
    raw.tags.includes('读书')
  } catch (error) {
    tagError = error
  }
  if (tagError) bad(`entry.tags.includes('读书') → ${tagError.message}`)
  step('缺字段的代价不是「显示难看」，而是把 undefined 传染到每一处使用它的代码。')

  title('三、规范化：读进来就补成同一个形状')

  const entry = normalizeEntry(raw)
  console.log(JSON.stringify(entry, null, 2).replace(/^/gm, '     '))
  ok('缺的字段补上了默认值，`content` 里的 HTML 也顺手迁移成了纯文本 body。')

  title('四、为什么要「顺带」迁移')

  step('没有单独的迁移脚本、也没有版本号：任何一次读取都会规范化，')
  step('规范化后的结果在**下一次写入时**落盘（更新、同步合并都会写回）。')
  step('好处：升级无缝，不用等一个「迁移完成」的过程；代价：旧数据会长期混在磁盘上，')
  step('所以读路径永远不能假设字段一定存在 —— 规范化必须在每次 readJSON 之后都跑一遍。')

  await fs.writeFile(legacyPath, JSON.stringify(entry, null, 2))
  const after = await tryReadJson(legacyPath)
  ok(`写回后磁盘上已是新形状：body = ${JSON.stringify(after.body)}`)

  title('五、容错的尺度')

  step('补默认值 ≠ 什么都接受。真实实现里的取舍：')
  step('· 类型未知的卡片 → 直接丢弃（渲染不出来，留着只会让界面报错）。')
  step('· 数值越界（如卡片内边距）→ clamp 进合法区间，而不是拒绝整条数据。')
  step('· 关键身份字段（id）缺失 → 补一个新 UUID，让这条数据还能被保存和使用。')
  step('判断标准：这条数据「还能不能表达用户的意图」？能就修，不能就丢。')

  conclusion('把「磁盘上的历史形状」和「代码假设的形状」之间的差距，收敛在读入口一处。')
})
