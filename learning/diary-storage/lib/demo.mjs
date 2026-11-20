/** 示例脚本的公共小工具：沙盒目录、打印、目录树。 */
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

/**
 * 每个示例在系统临时目录里开一块自己的沙盒：
 * 跑完不留垃圾在仓库里，也不会碰到你真实的日记数据。
 */
export async function makeSandbox(name) {
  return await fs.mkdtemp(path.join(os.tmpdir(), `diary-learn-${name}-`))
}

export function title(text) {
  console.log(`\n━━ ${text} ━━`)
}

export function step(text) {
  console.log(`   · ${text}`)
}

export function ok(text) {
  console.log(`   ✓ ${text}`)
}

export function bad(text) {
  console.log(`   ✗ ${text}`)
}

export function conclusion(text) {
  console.log(`\n👉 ${text}\n`)
}

/** 把沙盒目录打印成一棵树，方便肉眼确认「一天一个文件」的落盘布局。 */
export async function printTree(root, prefix = '', name = path.basename(root)) {
  console.log(`${prefix}${name}/`)
  let items = []
  try {
    items = await fs.readdir(root, { withFileTypes: true })
  } catch {
    return
  }
  for (const [index, item] of items.entries()) {
    const last = index === items.length - 1
    const branch = last ? '└── ' : '├── '
    const full = path.join(root, item.name)
    if (item.isDirectory()) {
      await printTree(full, `${prefix}${last ? '    ' : '│   '}`, item.name)
    } else {
      const size = (await fs.stat(full)).size
      console.log(`${prefix}${branch}${item.name}  (${size} B)`)
    }
  }
}

/** 读 JSON；解析失败返回 null 而不是抛异常。 */
export async function tryReadJson(filePath) {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'))
  } catch {
    return null
  }
}

/* ── 表格对齐：中文是双宽字符，padEnd 会算错，所以自己算显示宽度 ── */

function isWide(code) {
  return (
    (code >= 0x1100 && code <= 0x115f) ||
    (code >= 0x2e80 && code <= 0xa4cf) ||
    (code >= 0xac00 && code <= 0xd7a3) ||
    (code >= 0xf900 && code <= 0xfaff) ||
    (code >= 0xfe30 && code <= 0xfe6f) ||
    (code >= 0xff00 && code <= 0xff60) ||
    (code >= 0xffe0 && code <= 0xffe6)
  )
}

export function displayWidth(text) {
  let width = 0
  for (const char of String(text)) {
    width += isWide(char.codePointAt(0)) ? 2 : 1
  }
  return width
}

/** 按「终端里占几列」补空格，而不是按字符个数。 */
export function padDisplay(text, width) {
  const value = String(text)
  return value + ' '.repeat(Math.max(0, width - displayWidth(value)))
}

/** 让脚本即使某个环节出错也能正常退出（示例不该用未捕获异常收场）。 */
export async function run(main) {
  try {
    await main()
    process.exit(0)
  } catch (error) {
    console.error(error)
    process.exit(1)
  }
}
