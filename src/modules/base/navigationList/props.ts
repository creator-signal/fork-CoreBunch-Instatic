import { Type, type Static } from '@core/utils/typeboxHelpers'

export const NavigationListPropsSchema = Type.Object({
  ordered: Type.Boolean({ default: false }),
  structuredData: Type.Union(
    [Type.Literal('none'), Type.Literal('breadcrumb')],
    { default: 'none' },
  ),
})

export type NavigationListStoredProps = Static<typeof NavigationListPropsSchema>
