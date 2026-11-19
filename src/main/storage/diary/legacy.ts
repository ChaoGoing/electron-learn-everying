import crypto from 'crypto'
import type { DiaryCard, DiaryChecklistItem } from '../../../shared/types/diary'
import { CARD_DEFAULT_PADDING } from '../../../shared/types/diary'

/* ─────────────────────────────────────────────────────────────
   旧版富文本 → 卡片迁移

   阶段 2 之前的日记用 Tiptap HTML 存在 `content` 字段里。这里把一段 HTML 拆成
   卡片：引用块 → 摘录卡，任务列表 → 清单卡，图片 → 照片卡，其余文字 → 文字卡。
   迁移结果在下次写入时落盘，无需单独的迁移脚本。
───────────────────────────────────────────────────────────── */

function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

/** 去掉标签，把块级标签换成换行，保留段落结构。 */
function htmlToPlainText(html: string): string {
  return decodeEntities(
    html
      .replace(/<(br|\/p|\/div|\/h[1-6]|\/li|\/blockquote|\/tr)[^>]*>/gi, '\n')
      .replace(/<[^>]*>/g, '')
  )
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n\n')
}

function extractAttr(tag: string, name: string): string | null {
  const match = tag.match(new RegExp(`${name}\\s*=\\s*"([^"]*)"`, 'i'))
  return match ? decodeEntities(match[1]) : null
}

/** 把一条旧版 Tiptap HTML 正文拆成卡片。 */
export function cardsFromLegacyHtml(html: string): DiaryCard[] {
  const cards: DiaryCard[] = []
  let rest = html

  const blockquotes: string[] = []
  rest = rest.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_m, inner: string) => {
    blockquotes.push(inner)
    return ''
  })

  const checklistHtml: string[] = []
  rest = rest.replace(
    /<ul[^>]*data-type\s*=\s*"taskList"[^>]*>([\s\S]*?)<\/ul>/gi,
    (_m, inner: string) => {
      checklistHtml.push(inner)
      return ''
    }
  )

  const imageTags: string[] = []
  rest = rest.replace(/<img[^>]*>/gi, (tag: string) => {
    imageTags.push(tag)
    return ''
  })

  let order = 0
  const text = htmlToPlainText(rest)
  if (text) {
    cards.push({
      id: crypto.randomUUID(),
      type: 'text',
      order: order++,
      width: 'half',
      background: 'paper',
      padding: CARD_DEFAULT_PADDING,
      time: null,
      title: '',
      text,
      mood: null,
      tags: []
    })
  }

  for (const blockquote of blockquotes) {
    const plain = htmlToPlainText(blockquote)
    if (!plain) continue
    const cite = blockquote.match(/<cite[^>]*>([\s\S]*?)<\/cite>/i)
    cards.push({
      id: crypto.randomUUID(),
      type: 'quote',
      order: order++,
      width: 'third',
      background: 'cream',
      padding: CARD_DEFAULT_PADDING,
      time: null,
      title: '摘录',
      text: plain,
      source: cite ? htmlToPlainText(cite[1]) : ''
    })
  }

  for (const listHtml of checklistHtml) {
    const items: DiaryChecklistItem[] = []
    const liPattern = /<li([^>]*)>([\s\S]*?)<\/li>/gi
    let li = liPattern.exec(listHtml)
    while (li) {
      const liText = htmlToPlainText(li[2])
      if (liText) {
        items.push({
          id: crypto.randomUUID(),
          text: liText,
          done: /data-checked\s*=\s*"true"/i.test(li[1])
        })
      }
      li = liPattern.exec(listHtml)
    }
    if (items.length > 0) {
      cards.push({
        id: crypto.randomUUID(),
        type: 'checklist',
        order: order++,
        width: 'third',
        background: 'paper',
        padding: CARD_DEFAULT_PADDING,
        time: null,
        title: '清单',
        variant: 'list',
        items
      })
    }
  }

  const images = imageTags
    .map((tag) => extractAttr(tag, 'src'))
    .filter((src): src is string => !!src)
  if (images.length > 0) {
    cards.push({
      id: crypto.randomUUID(),
      type: 'photo',
      order: order++,
      width: 'half',
      background: 'paper',
      padding: CARD_DEFAULT_PADDING,
      time: null,
      title: '照片',
      images,
      caption: '',
      place: null
    })
  }

  return cards
}
