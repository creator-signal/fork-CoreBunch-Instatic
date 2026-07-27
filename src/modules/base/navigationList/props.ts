import { Type, type Static } from '@core/utils/typeboxHelpers'

export const NavigationListPropsSchema = Type.Object({
  ordered: Type.Boolean({ default: false }),
})

export type NavigationListStoredProps = Static<typeof NavigationListPropsSchema>
