import { useEffect } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import { StarterKit } from '@tiptap/starter-kit'
import { sanitizeRichtext } from '@core/sanitize'
import { Button } from '@ui/components/Button'
import { ControlRow } from '@ui/components/ControlRow'
import type { ControlProps } from './shared'
import styles from './RichtextControl.module.css'

type RichtextControlProps = ControlProps<string>

export function RichtextControl({
  propKey,
  value,
  onChange,
  label,
  isOverride,
  disabled,
  layout,
}: RichtextControlProps) {
  const editor = useEditor({
    immediatelyRender: false,
    editable: !disabled,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        link: {
          openOnClick: false,
          autolink: true,
          linkOnPaste: true,
        },
      }),
    ],
    editorProps: {
      attributes: {
        id: `ctrl-${propKey}`,
        role: 'textbox',
        'aria-label': label ?? 'Rich text',
        'aria-multiline': 'true',
      },
    },
    content: sanitizeRichtext(value),
    onUpdate: ({ editor: currentEditor }) => {
      onChange(propKey, sanitizeRichtext(currentEditor.getHTML()))
    },
  })

  useEffect(() => {
    editor?.setEditable(!disabled)
  }, [disabled, editor])

  useEffect(() => {
    if (!editor) return
    const sanitized = sanitizeRichtext(value)
    if (sanitizeRichtext(editor.getHTML()) === sanitized) return
    editor.commands.setContent(sanitized, { emitUpdate: false })
  }, [editor, value])

  const setLink = () => {
    if (!editor || disabled) return
    const current = String(editor.getAttributes('link').href ?? '')
    const next = window.prompt('Link URL', current)
    if (next === null) return
    if (next.trim() === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: next.trim() }).run()
  }

  return (
    <ControlRow
      propKey={propKey}
      label={label}
      layout={layout}
      isOverride={isOverride}
      disabled={disabled}
    >
      <div className={styles.root} data-testid={`richtext-control-${propKey}`}>
        <div className={styles.toolbar} role="toolbar" aria-label={`${label ?? 'Rich text'} formatting`}>
          <FormatButton label="Bold" active={editor?.isActive('bold')} disabled={disabled} onClick={() => editor?.chain().focus().toggleBold().run()} />
          <FormatButton label="Italic" active={editor?.isActive('italic')} disabled={disabled} onClick={() => editor?.chain().focus().toggleItalic().run()} />
          <FormatButton label="Heading 2" active={editor?.isActive('heading', { level: 2 })} disabled={disabled} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} />
          <FormatButton label="Heading 3" active={editor?.isActive('heading', { level: 3 })} disabled={disabled} onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()} />
          <FormatButton label="Bulleted list" active={editor?.isActive('bulletList')} disabled={disabled} onClick={() => editor?.chain().focus().toggleBulletList().run()} />
          <FormatButton label="Numbered list" active={editor?.isActive('orderedList')} disabled={disabled} onClick={() => editor?.chain().focus().toggleOrderedList().run()} />
          <FormatButton label="Quotation" active={editor?.isActive('blockquote')} disabled={disabled} onClick={() => editor?.chain().focus().toggleBlockquote().run()} />
          <FormatButton label="Link" active={editor?.isActive('link')} disabled={disabled} onClick={setLink} />
        </div>
        <EditorContent
          editor={editor}
          className={styles.editor}
          aria-label={label ?? 'Rich text'}
        />
      </div>
    </ControlRow>
  )
}

function FormatButton({
  label,
  active = false,
  disabled = false,
  onClick,
}: {
  label: string
  active?: boolean
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <Button
      variant="secondary"
      size="xs"
      className={styles.toolbarButton}
      aria-label={label}
      pressed={active}
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
    >
      {label}
    </Button>
  )
}
