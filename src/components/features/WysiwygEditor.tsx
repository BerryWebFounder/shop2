'use client'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import { cn } from '@/lib/utils'

interface WysiwygEditorProps {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  className?: string
}

const TOOLBAR_BTNS = [
  { label: 'B', title: '굵게', action: (e: ReturnType<typeof useEditor>) => e?.chain().focus().toggleBold().run(), isActive: (e: ReturnType<typeof useEditor>) => e?.isActive('bold') },
  { label: 'I', title: '기울임', action: (e: ReturnType<typeof useEditor>) => e?.chain().focus().toggleItalic().run(), isActive: (e: ReturnType<typeof useEditor>) => e?.isActive('italic') },
  { label: 'U͟', title: '밑줄', action: () => {}, isActive: () => false },
  { label: 'H1', title: '제목1', action: (e: ReturnType<typeof useEditor>) => e?.chain().focus().toggleHeading({ level: 1 }).run(), isActive: (e: ReturnType<typeof useEditor>) => e?.isActive('heading', { level: 1 }) },
  { label: 'H2', title: '제목2', action: (e: ReturnType<typeof useEditor>) => e?.chain().focus().toggleHeading({ level: 2 }).run(), isActive: (e: ReturnType<typeof useEditor>) => e?.isActive('heading', { level: 2 }) },
  { label: '—', title: '구분선', action: (e: ReturnType<typeof useEditor>) => e?.chain().focus().setHorizontalRule().run(), isActive: () => false },
  { label: '≡', title: '목록', action: (e: ReturnType<typeof useEditor>) => e?.chain().focus().toggleBulletList().run(), isActive: (e: ReturnType<typeof useEditor>) => e?.isActive('bulletList') },
  { label: '1.', title: '번호목록', action: (e: ReturnType<typeof useEditor>) => e?.chain().focus().toggleOrderedList().run(), isActive: (e: ReturnType<typeof useEditor>) => e?.isActive('orderedList') },
  { label: '↩', title: '되돌리기', action: (e: ReturnType<typeof useEditor>) => e?.chain().focus().undo().run(), isActive: () => false },
  { label: '↪', title: '다시실행', action: (e: ReturnType<typeof useEditor>) => e?.chain().focus().redo().run(), isActive: () => false },
]

export function WysiwygEditor({ value, onChange, placeholder = '상품 상세 내용을 입력하세요...', className }: WysiwygEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Image,
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: 'outline-none min-h-[120px] text-sm text-ink leading-relaxed prose prose-invert max-w-none',
      },
    },
  })

  return (
    <div className={cn('border border-border rounded-lg overflow-hidden', className)}>
      {/* Toolbar */}
      <div className="flex flex-wrap gap-1 bg-bg-3 border-b border-border px-2 py-1.5">
        {TOOLBAR_BTNS.map((btn) => (
          <button
            key={btn.label}
            type="button"
            title={btn.title}
            onClick={() => btn.action(editor)}
            className={cn(
              'px-2 py-1 rounded text-xs font-medium transition-colors',
              btn.isActive(editor)
                ? 'bg-accent/20 text-accent'
                : 'text-ink-2 hover:bg-[var(--bg-3)] hover:text-ink'
            )}
          >
            {btn.label}
          </button>
        ))}
      </div>
      {/* Content */}
      <div className="bg-bg-3 px-3 py-2.5">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
