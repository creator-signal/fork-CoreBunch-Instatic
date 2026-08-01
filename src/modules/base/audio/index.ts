import type { ModuleDefinition } from '@core/module-engine'
import { registry } from '@core/module-engine'
import { Value } from '@core/utils/typeboxHelpers'
import { VideoSolidIcon } from 'pixel-art-icons/icons/video-solid'
import { safeUrl } from '@modules/base/utils/escape'
import { AudioEditor } from './AudioEditor'
import { AudioPropsSchema, type AudioStoredProps } from './props'

const AUDIO_CSS = `
[data-instatic-audio] {
  display: grid;
  gap: var(--space-xs);
  margin-inline: 0;
}
[data-instatic-audio] audio {
  width: 100%;
}
`.trim()

export const AudioModule: ModuleDefinition<AudioStoredProps> = {
  id: 'base.audio',
  name: 'Audio',
  description: 'A native audio player with a title and optional transcript.',
  category: 'Media',
  version: '1.0.0',
  icon: VideoSolidIcon,
  trusted: true,
  canHaveChildren: false,
  schema: {
    source: {
      type: 'url',
      label: 'Audio file',
      description: 'Choose a published upload path or an HTTPS audio URL.',
    },
    title: {
      type: 'text',
      label: 'Audio title',
      description: 'Identifies the recording to assistive technology.',
    },
    transcriptUrl: {
      type: 'url',
      label: 'Transcript URL',
    },
    transcriptLabel: {
      type: 'text',
      label: 'Transcript link label',
    },
    loop: { type: 'toggle', label: 'Loop' },
    preload: {
      type: 'select',
      label: 'Preload',
      options: [
        { label: 'None', value: 'none' },
        { label: 'Metadata', value: 'metadata' },
        { label: 'Auto', value: 'auto' },
      ],
    },
  },
  propsSchema: AudioPropsSchema,
  defaults: Value.Create(AudioPropsSchema),
  component: AudioEditor,
  htmlTag: 'figure',
  render: (props) => {
    const source = safeUrl(props.source)
    const transcriptUrl = String(props.transcriptUrl ?? '').trim()
      ? safeUrl(props.transcriptUrl)
      : ''
    const preload =
      props.preload === 'none' || props.preload === 'auto'
        ? props.preload
        : 'metadata'
    const title = String(props.title || 'Audio')
    const transcriptLabel = String(props.transcriptLabel || 'Read transcript')
    const player = source && source !== '#'
      ? `<audio src="${source}" aria-label="${title}" controls` +
        `${props.loop ? ' loop' : ''} preload="${preload}">` +
        `<a href="${source}">Download ${title}</a></audio>`
      : '<p>No audio file is available.</p>'
    return {
      html:
        `<figure data-instatic-audio>${player}` +
        `<figcaption><span>${title}</span>` +
        (transcriptUrl && transcriptUrl !== '#'
          ? ` · <a href="${transcriptUrl}">${transcriptLabel}</a>`
          : '') +
        '</figcaption></figure>',
      css: AUDIO_CSS,
    }
  },
}

registry.registerOrReplace(AudioModule)
