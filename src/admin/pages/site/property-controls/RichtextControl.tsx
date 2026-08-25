import { useEffect, useRef, useState } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import { StarterKit } from '@tiptap/starter-kit'
import { isSafeUrl } from '@core/html-sanitize'
import { sanitizeRichtext } from '@core/sanitize'
import { Button } from '@ui/components/Button'
import { ControlRow } from '@ui/components/ControlRow'
import { Dialog } from '@ui/components/Dialog'
import { Input } from '@ui/components/Input'
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
  const lastValueRef = useRef(sanitizeRichtext(value))
  const [linkOpen, setLinkOpen] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [linkError, setLinkError] = useState<string | null>(null)
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
      const next = sanitizeRichtext(currentEditor.getHTML())
      if (next === lastValueRef.current) return
      lastValueRef.current = next
      onChange(propKey, next)
    },
  })

  useEffect(() => {
    editor?.setEditable(!disabled)
  }, [disabled, editor])

  useEffect(() => {
    if (!editor) return
    const sanitized = sanitizeRichtext(value)
    lastValueRef.current = sanitized
    if (sanitizeRichtext(editor.getHTML()) === sanitized) return
    editor.commands.setContent(sanitized, { emitUpdate: false })
  }, [editor, value])

  const openLinkDialog = () => {
    if (!editor || disabled) return
    setLinkUrl(String(editor.getAttributes('link').href ?? ''))
    setLinkError(null)
    setLinkOpen(true)
  }

  const applyLink = () => {
    if (!editor || disabled) return
    const next = linkUrl.trim()
    if (next !== '' && !isSafeUrl(next)) {
      setLinkError('Use a relative URL or an http, https, mailto, tel or sms URL.')
      return
    }
    if (next === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
    } else {
      editor.chain().focus().extendMarkRange('link').setLink({ href: next }).run()
    }
    setLinkOpen(false)
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
          <FormatButton label="Link" active={editor?.isActive('link')} disabled={disabled} onClick={openLinkDialog} />
        </div>
        <EditorContent
          editor={editor}
          className={styles.editor}
          aria-label={label ?? 'Rich text'}
        />
      </div>
      <Dialog
        open={linkOpen}
        onClose={() => setLinkOpen(false)}
        title="Edit link"
        eyebrow="Rich text"
        size="sm"
        footer={(
          <>
            <Button variant="secondary" onClick={() => setLinkOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={applyLink}>Apply link</Button>
          </>
        )}
      >
        <div className={styles.linkDialogBody}>
          <Input
            value={linkUrl}
            type="url"
            autoFocus
            aria-label="Link URL"
            placeholder="https://example.com or /page"
            invalid={linkError !== null}
            onChange={(event) => {
              setLinkUrl(event.target.value)
              setLinkError(null)
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                applyLink()
              }
            }}
          />
          {linkError ? <p className={styles.linkError} role="alert">{linkError}</p> : null}
        </div>
      </Dialog>
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
