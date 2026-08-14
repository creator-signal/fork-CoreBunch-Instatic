import { Type, type Static } from '@core/utils/typeboxHelpers'
import { AnchorTargetSchema } from '@modules/base/shared/anchorTarget'

export const LinkCollectionItemSchema = Type.Object(
  {
    label: Type.String({ default: 'Link' }),
    href: Type.String({ default: '#' }),
    target: AnchorTargetSchema,
    current: Type.Boolean({ default: false }),
    kind: Type.Union([Type.Literal('link'), Type.Literal('button')], {
      default: 'link',
    }),
  },
  { additionalProperties: false },
)

export const LinkCollectionPropsSchema = Type.Object({
  items: Type.Array(LinkCollectionItemSchema, { default: [] }),
  presentation: Type.Union(
    [
      Type.Literal('navigation'),
      Type.Literal('breadcrumb'),
      Type.Literal('table-of-contents'),
      Type.Literal('profile'),
      Type.Literal('actions'),
    ],
    { default: 'navigation' },
  ),
})

export type LinkCollectionItem = Static<typeof LinkCollectionItemSchema>
export type LinkCollectionStoredProps = Static<typeof LinkCollectionPropsSchema>
