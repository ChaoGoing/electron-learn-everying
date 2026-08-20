import { useEffect, useRef, useCallback, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
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
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, Code, Quote,
  List, ListOrdered, CheckSquare, Heading1, Heading2, Heading3,
  ImageIcon, LinkIcon, Undo2, Redo2, Highlighter
} from 'lucide-react'
import { cn } from '../../lib/cn'
import type { DiaryEntry, CreateDiaryEntry, UpdateDiaryEntry } from '../../../../shared/types/diary'

interface DiaryEditorProps {
  entry?: DiaryEntry | null
  onSave?: (entry: DiaryEntry) => void
  className?: string
}

export function DiaryEditor({ entry, onSave, className }: DiaryEditorProps): JSX.Element {
  const [title, setTitle] = useState(entry?.title || '')
  const [saving, setSaving] = useState(false)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      ImageExtension,
      Placeholder.configure({ placeholder: '开始写日记...' }),
      Underline,
      LinkExtension.configure({ openOnClick: false }),
      TaskList,
      TaskItem.configure({ nested: true }),
      CharacterCount,
      Highlight,
    ],
    content: entry?.content || '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[300px] px-6 py-4',
      },
    },
  })

  // Auto-save
  const doSave = useCallback(async () => {
    if (!editor) return
    setSaving(true)
    try {
      const content = editor.getHTML()
      const plainText = editor.getText()
      const wordCount = plainText.split(/\s+/).filter(Boolean).length

      if (entry) {
        const data: UpdateDiaryEntry = { title: title || '无标题', content, wordCount: wordCount as unknown as undefined }
        const updated = await window.api.diary.update(entry.id, data)
        if (updated && onSave) onSave(updated)
      } else {
        const data: CreateDiaryEntry = { title: title || '无标题', content }
        const created = await window.api.diary.create(data)
        if (created && onSave) onSave(created)
      }
    } catch (err) {
      console.error('Failed to save diary:', err)
    } finally {
      setSaving(false)
    }
  }, [editor, title, entry, onSave])

  // Debounced auto-save
  useEffect(() => {
    if (!editor) return

    const handleUpdate = (): void => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(() => {
        doSave()
      }, 2000)
    }

    editor.on('update', handleUpdate)
    return () => {
      editor.off('update', handleUpdate)
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [editor, doSave])

  // Manual save on Ctrl+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        doSave()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [doSave])

  if (!editor) return <div>Loading editor...</div>

  const ToolbarButton = ({ onClick, active, disabled, children, title }: {
    onClick: () => void
    active?: boolean
    disabled?: boolean
    children: React.ReactNode
    title: string
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'w-8 h-8 flex items-center justify-center rounded-md transition-colors',
        'hover:bg-black/5 dark:hover:bg-white/10',
        active && 'bg-accent/15 text-accent',
        disabled && 'opacity-30 cursor-not-allowed'
      )}
    >
      {children}
    </button>
  )

  const addImage = async (): Promise<void> => {
    const url = await window.api.diary.uploadImage()
    if (url) {
      editor.chain().focus().setImage({ src: url }).run()
    }
  }

  const addLink = (): void => {
    const url = window.prompt('输入链接地址:')
    if (url) {
      editor.chain().focus().setLink({ href: url }).run()
    }
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Title input */}
      <div className="px-6 pt-4 pb-2">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="日记标题..."
          className="w-full text-2xl font-bold bg-transparent border-none outline-none
                     text-text-primary-light dark:text-text-primary-dark
                     placeholder:text-text-secondary-light dark:placeholder:text-text-secondary-dark"
        />
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-4 py-1.5 border-b border-border-light dark:border-border-dark flex-wrap">
        <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="加粗">
          <Bold size={16} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="斜体">
          <Italic size={16} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="下划线">
          <UnderlineIcon size={16} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="删除线">
          <Strikethrough size={16} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleHighlight().run()} active={editor.isActive('highlight')} title="高亮">
          <Highlighter size={16} />
        </ToolbarButton>

        <div className="w-px h-5 bg-border-light dark:bg-border-dark mx-1" />

        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} title="标题1">
          <Heading1 size={16} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="标题2">
          <Heading2 size={16} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="标题3">
          <Heading3 size={16} />
        </ToolbarButton>

        <div className="w-px h-5 bg-border-light dark:bg-border-dark mx-1" />

        <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="无序列表">
          <List size={16} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="有序列表">
          <ListOrdered size={16} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleTaskList().run()} active={editor.isActive('taskList')} title="任务列表">
          <CheckSquare size={16} />
        </ToolbarButton>

        <div className="w-px h-5 bg-border-light dark:bg-border-dark mx-1" />

        <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="引用">
          <Quote size={16} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive('codeBlock')} title="代码块">
          <Code size={16} />
        </ToolbarButton>
        <ToolbarButton onClick={addImage} title="插入图片">
          <ImageIcon size={16} />
        </ToolbarButton>
        <ToolbarButton onClick={addLink} active={editor.isActive('link')} title="插入链接">
          <LinkIcon size={16} />
        </ToolbarButton>

        <div className="flex-1" />

        <ToolbarButton onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="撤销">
          <Undo2 size={16} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="重做">
          <Redo2 size={16} />
        </ToolbarButton>

        {/* Save indicator */}
        <span className="text-xs text-text-secondary-light dark:text-text-secondary-dark ml-2 min-w-12 text-right">
          {saving ? '保存中...' : `${editor.storage.characterCount?.words() || 0} 字`}
        </span>
      </div>

      {/* Bubble menu for text selection */}
      {editor && (
        <BubbleMenu editor={editor} className="flex items-center gap-0.5 bg-surface-light dark:bg-surface-dark rounded-lg shadow-elevated dark:shadow-elevated-dark border border-border-light dark:border-border-dark px-1 py-1">
          <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="加粗">
            <Bold size={14} />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="斜体">
            <Italic size={14} />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="下划线">
            <UnderlineIcon size={14} />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="删除线">
            <Strikethrough size={14} />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleHighlight().run()} active={editor.isActive('highlight')} title="高亮">
            <Highlighter size={14} />
          </ToolbarButton>
        </BubbleMenu>
      )}

      {/* Editor content */}
      <div className="flex-1 overflow-auto">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}