import { Type, type Static } from '@core/utils/typeboxHelpers'

export const RichTextPropsSchema = Type.Object({
  html: Type.String({ default: '<p>Add your rich text here.</p>' }),
  tag: Type.Union(
    [
      Type.Literal('div'),
      Type.Literal('article'),
      Type.Literal('section'),
    ],
    { default: 'div' },
  ),
})

export type RichTextStoredProps = Static<typeof RichTextPropsSchema>
