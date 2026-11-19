import crypto from 'crypto'
import path from 'path'
import fs from 'fs-extra'
import type { ImageAsset } from '../../../shared/types/diary'
import { getImagesDir } from './paths'

/* ─────────────────────────────────────────────────────────────
   图片素材（userData/images）

   日记里存的是 `file://` 地址，不存二进制；选择图片时复制一份到素材目录，
   原图被移动或删除也不影响已写好的日记。
───────────────────────────────────────────────────────────── */

const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp']

async function copyIntoImagesDir(srcPaths: string[]): Promise<string[]> {
  const destDir = getImagesDir()
  await fs.ensureDir(destDir)

  const urls: string[] = []
  for (const srcPath of srcPaths) {
    const ext = path.extname(srcPath)
    const destPath = path.join(destDir, `${crypto.randomUUID()}${ext}`)
    await fs.copyFile(srcPath, destPath)
    urls.push(`file://${destPath}`)
  }
  return urls
}

/** 选择一张图片并复制到 userData/images，返回 file:// 地址。 */
export async function uploadImage(): Promise<string | null> {
  const urls = await uploadImages(false)
  return urls[0] ?? null
}

/** 选择一到多张图片并复制到 userData/images，返回 file:// 地址列表。 */
export async function uploadImages(multiple = true): Promise<string[]> {
  const { dialog } = await import('electron')
  const result = await dialog.showOpenDialog({
    properties: multiple ? ['openFile', 'multiSelections'] : ['openFile'],
    filters: [{ name: 'Images', extensions: IMAGE_EXTENSIONS }]
  })

  if (result.canceled || result.filePaths.length === 0) return []
  return copyIntoImagesDir(result.filePaths)
}

/** 列出素材库里的图片（按最近修改倒序）。 */
export async function listImages(): Promise<ImageAsset[]> {
  const dir = getImagesDir()
  if (!(await fs.pathExists(dir))) return []

  const names = await fs.readdir(dir)
  const assets: ImageAsset[] = []
  for (const name of names) {
    if (!IMAGE_EXTENSIONS.includes(path.extname(name).slice(1).toLowerCase())) continue
    const stat = await fs.stat(path.join(dir, name))
    assets.push({ url: `file://${path.join(dir, name)}`, name, modifiedAt: stat.mtimeMs })
  }
  return assets.sort((a, b) => b.modifiedAt - a.modifiedAt)
}
