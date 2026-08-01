import { Type, type Static } from '@core/utils/typeboxHelpers'

export const PdfViewerPropsSchema = Type.Object({
  source: Type.String({ default: '' }),
  title: Type.String({ default: 'PDF document' }),
  fallbackText: Type.String({
    default: 'Your browser cannot display this PDF.',
  }),
  downloadLabel: Type.String({ default: 'Download PDF' }),
  height: Type.Union(
    [
      Type.Literal('compact'),
      Type.Literal('standard'),
      Type.Literal('tall'),
    ],
    { default: 'standard' },
  ),
})

export type PdfViewerStoredProps = Static<typeof PdfViewerPropsSchema>
