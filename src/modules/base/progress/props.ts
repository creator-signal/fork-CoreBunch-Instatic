import { Type, type Static } from '@core/utils/typeboxHelpers'

export const ProgressPropsSchema = Type.Object({
  value: Type.Number({ default: 0 }),
  maximum: Type.Number({ default: 100 }),
  label: Type.String({ default: 'Progress' }),
  showValue: Type.Boolean({ default: true }),
})

export type ProgressStoredProps = Static<typeof ProgressPropsSchema>
