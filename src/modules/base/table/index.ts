/**
 * base.table — small governed editorial data tables.
 *
 * Authors provide one pipe-delimited header row and one pipe-delimited line
 * per body row. The renderer normalises each row to the declared column count
 * and emits explicit caption, thead/tbody and scope relationships.
 */
import type { ModuleDefinition } from '@core/module-engine'
import { registry } from '@core/module-engine'
import { Value } from '@core/utils/typeboxHelpers'
import { ListBoxSolidIcon } from 'pixel-art-icons/icons/list-box-solid'
import { parseTableData } from './data'
import { TableEditor } from './TableEditor'
import { TablePropsSchema, type TableStoredProps } from './props'

export const TableModule: ModuleDefinition<TableStoredProps> = {
  id: 'base.table',
  name: 'Table',
  description: 'A captioned table for genuinely tabular editorial data.',
  category: 'Typography',
  version: '1.0.0',
  icon: ListBoxSolidIcon,
  trusted: true,
  canHaveChildren: false,

  schema: {
    caption: {
      type: 'text',
      label: 'Caption',
      placeholder: 'Describe the table',
    },
    columns: {
      type: 'textarea',
      label: 'Column headings',
      rows: 2,
      placeholder: 'Name | Status | Owner',
    },
    rows: {
      type: 'textarea',
      label: 'Rows',
      rows: 8,
      placeholder: 'Item 1 | Active | Alex\nItem 2 | Paused | Sam',
    },
    firstColumnHeader: {
      type: 'toggle',
      label: 'First cell is a row heading',
    },
  },

  propsSchema: TablePropsSchema,
  defaults: Value.Create(TablePropsSchema),
  component: TableEditor,
  htmlTag: 'table',
  render: (props) => {
    const table = parseTableData(props.columns, props.rows)
    const caption = props.caption ? `<caption>${props.caption}</caption>` : ''
    const headings = table.columns
      .map((column) => `<th scope="col">${column}</th>`)
      .join('')
    const rows = table.rows.map((row) => {
      const cells = row.map((cell, index) =>
        props.firstColumnHeader && index === 0
          ? `<th scope="row">${cell}</th>`
          : `<td>${cell}</td>`,
      ).join('')
      return `<tr>${cells}</tr>`
    }).join('')
    return {
      html:
        `<table>${caption}<thead><tr>${headings}</tr></thead>` +
        `<tbody>${rows}</tbody></table>`,
    }
  },
}

registry.registerOrReplace(TableModule)
