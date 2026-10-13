import { useCallback, useEffect, useRef, useState } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import StarterKit from '@tiptap/starter-kit'
import ImageExtension from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import Underline from '@tiptap/extension-underline'
import LinkExtension from '@tiptap/extension-link'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import CharacterCount from '@tiptap/extension-character-count'
import Highlight from '@tiptap/extension-highlight'
import {
  Bold,
  Highlighter,
  ImageIcon,
  Italic,
  LinkIcon,
  Strikethrough,
  Underline as UnderlineIcon
} from 'lucide-react'
import { cn } from '../../lib/cn'
import type { CreateDiaryEntry, DiaryEntry, UpdateDiaryEntry } from '../../../../shared/types/diary'

interface DiaryEditorProps {
  entry?: DiaryEntry | null
  onSave?: (entry: DiaryEntry) => void
  className?: string
}

interface ToolbarButtonProps {
  onClick: () => void
  active?: boolean
  title: string
  children: React.ReactNode
}

function ToolbarButton({ onClick, active, title, children }: ToolbarButtonProps): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={cn(
        'h-7 w-7 flex items-center justify-center rounded-md transition-colors',
        'text-text-secondary-light dark:text-text-secondary-dark',
        'hover:bg-black/5 hover:text-text-primary-light dark:hover:bg-white/10 dark:hover:text-text-primary-dark',
        active && 'bg-accent/15 text-accent hover:bg-accent/15 hover:text-accent'
      )}
    >
      {children}
    </button>
  )
}

export function DiaryEditor({ entry, onSave, className }: DiaryEditorProps): JSX.Element {
  const [title, setTitle] = useState(entry?.title && entry.title !== '无标题' ? entry.title : '')
  const [saving, setSaving] = useState(false)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] }
      }),
      ImageExtension,
      Placeholder.configure({ placeholder: '开始写，让思绪落下来…' }),
      Underline,
      LinkExtension.configure({ openOnClick: false }),
      TaskList,
      TaskItem.configure({ nested: true }),
      CharacterCount,
      Highlight
    ],
    content: entry?.content || '',
    editorProps: {
      attributes: {
        class:
          'prose prose-base dark:prose-invert max-w-none focus:outline-none min-h-[420px] px-8 pb-10'
      }
    }
  })

  const doSave = useCallback(async () => {
    if (!editor) return
    setSaving(true)
    try {
      const content = editor.getHTML()
      const wordCount = editor.storage.characterCount?.words() || 0
      const nextTitle = title.trim() || '无标题'

      if (entry) {
        const data: UpdateDiaryEntry = { title: nextTitle, content, wordCount }
        const updated = await window.api.diary.update(entry.id, data)
        if (updated && onSave) onSave(updated)
      } else {
        const data: CreateDiaryEntry = { title: nextTitle, content }
        const created = await window.api.diary.create(data)
        if (created && onSave) onSave(created)
      }
    } catch (err) {
      console.error('Failed to save diary:', err)
    } finally {
      setSaving(false)
    }
  }, [editor, title, entry, onSave])

  // Debounced auto-save when the rich-text content changes.
  useEffect(() => {
    if (!editor) return

    const handleUpdate = (): void => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(() => {
        void doSave()
      }, 1600)
    }

    editor.on('update', handleUpdate)
    return (): void => {
      editor.off('update', handleUpdate)
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [editor, doSave])

  // Manual save on Ctrl/Cmd+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        void doSave()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return (): void => window.removeEventListener('keydown', handleKeyDown)
  }, [doSave])

  const addImage = async (): Promise<void> => {
    if (!editor) return
    const url = await window.api.diary.uploadImage()
    if (url) editor.chain().focus().setImage({ src: url }).run()
  }

  const addLink = (): void => {
    if (!editor) return
    const url = window.prompt('输入链接地址:')
    if (url) editor.chain().focus().setLink({ href: url }).run()
  }

  if (!editor) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
          加载编辑器…
        </p>
      </div>
    )
  }

  const wordCount = editor.storage.characterCount?.words() || 0

  return (
    <div className={cn('flex h-full flex-col', className)}>
      {/* Title */}
      <div className="px-8 pt-7 pb-2">
        <input
          type="text"
          value={title}
          onChange={(e): void => setTitle(e.target.value)}
          placeholder="无标题"
          className="w-full border-none bg-transparent font-serif text-3xl font-semibold tracking-tight outline-none
                     text-text-primary-light dark:text-text-primary-dark
                     placeholder:text-text-secondary-light/70 dark:placeholder:text-text-secondary-dark/70"
        />
      </div>

      {/* Writing surface */}
      <div className="flex-1 overflow-y-auto">
        <EditorContent editor={editor} />
      </div>

      {/* Bubble menu — appears only when text is selected */}
      <BubbleMenu
        editor={editor}
        className="flex items-center gap-0.5 rounded-lg border border-border-light bg-surface-light px-1 py-1
                   shadow-elevated dark:border-border-dark dark:bg-surface-dark dark:shadow-elevated-dark"
      >
        <ToolbarButton
          onClick={(): void => {
            editor.chain().focus().toggleBold().run()
          }}
          active={editor.isActive('bold')}
          title="加粗"
        >
          <Bold size={15} />
        </ToolbarButton>
        <ToolbarButton
          onClick={(): void => {
            editor.chain().focus().toggleItalic().run()
          }}
          active={editor.isActive('italic')}
          title="斜体"
        >
          <Italic size={15} />
        </ToolbarButton>
        <ToolbarButton
          onClick={(): void => {
            editor.chain().focus().toggleUnderline().run()
          }}
          active={editor.isActive('underline')}
          title="下划线"
        >
          <UnderlineIcon size={15} />
        </ToolbarButton>
        <ToolbarButton
          onClick={(): void => {
            editor.chain().focus().toggleStrike().run()
          }}
          active={editor.isActive('strike')}
          title="删除线"
        >
          <Strikethrough size={15} />
        </ToolbarButton>
        <ToolbarButton
          onClick={(): void => {
            editor.chain().focus().toggleHighlight().run()
          }}
          active={editor.isActive('highlight')}
          title="高亮"
        >
          <Highlighter size={15} />
        </ToolbarButton>

        <div className="mx-0.5 h-4 w-px bg-border-light dark:bg-border-dark" />

        <ToolbarButton
          onClick={(): void => addLink()}
          active={editor.isActive('link')}
          title="插入链接"
        >
          <LinkIcon size={15} />
        </ToolbarButton>
        <ToolbarButton onClick={(): void => void addImage()} title="插入图片">
          <ImageIcon size={15} />
        </ToolbarButton>
      </BubbleMenu>

      {/* Minimal footer */}
      <div className="flex items-center justify-between border-t border-border-light px-6 py-3 dark:border-border-dark">
        <span className="text-xs text-text-secondary-light dark:text-text-secondary-dark">
          {saving ? '保存中…' : `${wordCount} 字`}
        </span>
        <div className="flex items-center gap-1">
          <ToolbarButton onClick={(): void => void addImage()} title="插入图片">
            <ImageIcon size={15} />
          </ToolbarButton>
          <ToolbarButton onClick={(): void => addLink()} title="插入链接">
            <LinkIcon size={15} />
          </ToolbarButton>
        </div>
      </div>
    </div>
  )
}
