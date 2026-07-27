import { Type, type Static } from '@core/utils/typeboxHelpers'

export const ComponentFramePropsSchema = Type.Object({
  kind: Type.String({ default: 'section' }),
  variant: Type.String({ default: 'default' }),
  tag: Type.Union(
    [
      Type.Literal('section'),
      Type.Literal('article'),
      Type.Literal('aside'),
      Type.Literal('nav'),
      Type.Literal('figure'),
      Type.Literal('span'),
      Type.Literal('div'),
    ],
    { default: 'section' },
  ),
  label: Type.String({ default: '' }),
  bindingPrefix: Type.String({ default: '' }),
})

export type ComponentFrameStoredProps = Static<typeof ComponentFramePropsSchema>
