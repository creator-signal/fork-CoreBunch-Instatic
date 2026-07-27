import type { ModuleDefinition, RenderOutput } from '@core/module-engine'
import { registry } from '@core/module-engine'
import { Type, Value, type Static } from '@core/utils/typeboxHelpers'
import { VideoSolidIcon } from 'pixel-art-icons/icons/video-solid'
import { AudioModule } from '../audio'
import { VideoModule } from '../video'
import { MediaDisplayEditor } from './MediaDisplayEditor'

const MediaDisplayPropsSchema = Type.Object({
  kind: Type.Union([
    Type.Literal('audio'),
    Type.Literal('video'),
  ], { default: 'video' }),
  source: Type.String({ default: '' }),
  poster: Type.String({ default: '' }),
  title: Type.String({ default: 'Media' }),
  transcriptUrl: Type.String({ default: '' }),
  transcriptLabel: Type.String({ default: 'Read transcript' }),
  captionsUrl: Type.String({ default: '' }),
  captionsLanguage: Type.String({ default: 'en' }),
  captionsLabel: Type.String({ default: 'Captions' }),
  controls: Type.Boolean({ default: true }),
  autoplay: Type.Boolean({ default: false }),
  loop: Type.Boolean({ default: false }),
  preload: Type.Union([
    Type.Literal('none'),
    Type.Literal('metadata'),
    Type.Literal('auto'),
  ], { default: 'metadata' }),
})

type MediaDisplayProps = Static<typeof MediaDisplayPropsSchema>

export const MediaDisplayModule: ModuleDefinition<MediaDisplayProps> = {
  id: 'base.media-display',
  name: 'Media display',
  description: 'Shared hosted audio and video renderer for the governed Media component.',
  category: 'Media',
  version: '1.0.0',
  icon: VideoSolidIcon,
  trusted: true,
  canHaveChildren: false,
  schema: {
    kind: { type: 'select', label: 'Media kind', options: [
      { label: 'Audio', value: 'audio' },
      { label: 'Video', value: 'video' },
    ] },
    source: { type: 'media', label: 'Media', mediaKind: 'video' },
    poster: { type: 'image', label: 'Poster or artwork' },
    title: { type: 'text', label: 'Accessible title' },
    transcriptUrl: { type: 'url', label: 'Transcript URL' },
    transcriptLabel: { type: 'text', label: 'Transcript link label' },
    captionsUrl: { type: 'url', label: 'Captions file' },
    captionsLanguage: { type: 'text', label: 'Captions language' },
    captionsLabel: { type: 'text', label: 'Captions label' },
    controls: { type: 'toggle', label: 'Show controls' },
    autoplay: { type: 'toggle', label: 'Autoplay' },
    loop: { type: 'toggle', label: 'Loop' },
    preload: { type: 'select', label: 'Preload', options: [
      { label: 'None', value: 'none' },
      { label: 'Metadata', value: 'metadata' },
      { label: 'Auto', value: 'auto' },
    ] },
  },
  propsSchema: MediaDisplayPropsSchema,
  defaults: Value.Create(MediaDisplayPropsSchema),
  component: MediaDisplayEditor,
  htmlTag: 'figure',
  render: (props) => renderMedia(props),
}

function renderMedia(props: MediaDisplayProps): RenderOutput {
  if (props.kind === 'audio') {
    return AudioModule.render({
      ...AudioModule.defaults,
      source: props.source,
      title: props.title,
      transcriptUrl: props.transcriptUrl,
      transcriptLabel: props.transcriptLabel,
      loop: props.loop,
      preload: props.preload,
    }, [])
  }
  return VideoModule.render({
    ...VideoModule.defaults,
    videoUrl: props.source,
    poster: props.poster,
    title: props.title,
    captionsUrl: props.captionsUrl,
    captionsLanguage: props.captionsLanguage,
    captionsLabel: props.captionsLabel,
    controls: props.controls,
    autoplay: props.autoplay,
    loop: props.loop,
    preload: props.preload,
  }, [])
}

registry.registerOrReplace(MediaDisplayModule)
