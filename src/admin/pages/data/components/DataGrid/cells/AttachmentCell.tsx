import type { ReactElement } from 'react'
import type { DataField } from '@core/data/schemas'
import type { CellEditorProps } from '@admin/pages/data/types'
import { readStringArrayCell } from '@core/data/cells'
import styles from './cells.module.css'

type AttachmentField = Extract<DataField, { type: 'attachment' }>

export function AttachmentCell({
  field,
  value,
}: CellEditorProps<AttachmentField>): ReactElement {
  const ids = field.allowMultiple
    ? readStringArrayCell({ [field.id]: value }, field.id)
    : typeof value === 'string' && value ? [value] : []
  if (ids.length === 0) {
    return <span className={styles.readOnlyText}>No attachment</span>
  }
  return (
    <span className={styles.attachmentLinks}>
      {ids.map((id, index) => (
        <a
          key={id}
          href={`/admin/api/cms/attachments/${encodeURIComponent(id)}/download`}
          className={styles.attachmentLink}
        >
          Attachment {index + 1}
        </a>
      ))}
    </span>
  )
}

