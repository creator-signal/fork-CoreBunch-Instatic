import { Type, type Static } from '@core/utils/typeboxHelpers'

export const AudioPropsSchema = Type.Object({
  source: Type.String({ default: '' }),
  title: Type.String({ default: 'Audio' }),
  transcriptUrl: Type.String({ default: '' }),
  transcriptLabel: Type.String({ default: 'Read transcript' }),
  loop: Type.Boolean({ default: false }),
  preload: Type.Union(
    [
      Type.Literal('none'),
      Type.Literal('metadata'),
      Type.Literal('auto'),
    ],
    { default: 'metadata' },
  ),
})

export type AudioStoredProps = Static<typeof AudioPropsSchema>
