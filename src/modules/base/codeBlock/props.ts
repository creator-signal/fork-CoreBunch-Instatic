import { Type, type Static } from '@core/utils/typeboxHelpers'

export const CodeBlockPropsSchema = Type.Object({
  code: Type.String({ default: 'const greeting = "Hello";' }),
  language: Type.String({ default: 'text' }),
  label: Type.String({ default: 'Code example' }),
  wrap: Type.Boolean({ default: false }),
})

export type CodeBlockStoredProps = Static<typeof CodeBlockPropsSchema>
