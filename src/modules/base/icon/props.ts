import { Type, type Static } from '@core/utils/typeboxHelpers'

export const IconPropsSchema = Type.Object({
  name: Type.Union(
    [
      Type.Literal('information'),
      Type.Literal('check'),
      Type.Literal('warning'),
      Type.Literal('error'),
      Type.Literal('star'),
      Type.Literal('person'),
    ],
    { default: 'information' },
  ),
  label: Type.String({ default: '' }),
  decorative: Type.Boolean({ default: true }),
  size: Type.Union(
    [
      Type.Literal('small'),
      Type.Literal('medium'),
      Type.Literal('large'),
    ],
    { default: 'medium' },
  ),
})

export type IconStoredProps = Static<typeof IconPropsSchema>
