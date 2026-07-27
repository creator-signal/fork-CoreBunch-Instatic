import type { ModuleComponentProps } from '@core/module-engine'

type MediaDisplayProps = Record<string, unknown> & {
  kind: 'audio' | 'video'
  title: string
  source: string
}

export function MediaDisplayEditor({
  mcClassName,
  nodeWrapperProps,
  props,
}: ModuleComponentProps<MediaDisplayProps>) {
  return (
    <figure
      {...nodeWrapperProps}
      className={mcClassName}
      data-instatic-media-preview={props.kind}
    >
      <strong>{props.title || (props.kind === 'audio' ? 'Audio' : 'Video')}</strong>
      <span>{props.source ? ` · ${props.source}` : ' · Choose media'}</span>
    </figure>
  )
}
