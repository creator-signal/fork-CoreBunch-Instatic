import React from 'react'
import type { ModuleComponentProps } from '@core/module-engine'
import { CanvasModulePlaceholder } from '@ui/components/CanvasModulePlaceholder'
import { VideoSolidIcon } from 'pixel-art-icons/icons/video-solid'
import type { AudioStoredProps } from './props'

export const AudioEditor: React.FC<ModuleComponentProps<AudioStoredProps>> = ({
  props,
  mcClassName,
  nodeWrapperProps,
}) => {
  if (!props.source) {
    return (
      <CanvasModulePlaceholder
        {...nodeWrapperProps}
        className={mcClassName}
        icon={<VideoSolidIcon size={16} />}
        label="No audio selected"
      />
    )
  }
  return (
    <figure {...nodeWrapperProps} className={mcClassName} data-instatic-audio>
      <audio
        src={props.source}
        aria-label={props.title || 'Audio'}
        controls
        loop={props.loop}
        preload={props.preload}
      />
      <figcaption>
        <span>{props.title}</span>
        {props.transcriptUrl ? (
          <>
            {' · '}
            <a href={props.transcriptUrl}>{props.transcriptLabel}</a>
          </>
        ) : null}
      </figcaption>
    </figure>
  )
}
