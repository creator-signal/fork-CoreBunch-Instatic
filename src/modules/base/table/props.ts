import { Type, type Static } from '@core/utils/typeboxHelpers'

export const TablePropsSchema = Type.Object({
  caption: Type.String({ default: 'Table caption' }),
  columns: Type.String({ default: 'Column 1 | Column 2' }),
  rows: Type.String({ default: 'Value 1 | Value 2' }),
  firstColumnHeader: Type.Boolean({ default: false }),
})

export type TableStoredProps = Static<typeof TablePropsSchema>
