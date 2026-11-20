/**
 * 一次跑完全部课程。
 * 跑法：node run-all.mjs
 */
import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))

const lessons = (await fs.readdir(here)).filter((name) => /^\d\d-.*\.mjs$/.test(name)).sort()

for (const lesson of lessons) {
  console.log(`\n\n██████████ ${lesson} ██████████`)
  await new Promise((resolve) => {
    spawn(process.execPath, [path.join(here, lesson)], { stdio: 'inherit' }).on('close', resolve)
  })
}

console.log(`\n全部 ${lessons.length} 课跑完。`)
