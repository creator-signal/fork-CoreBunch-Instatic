import React from 'react'
import type { ModuleComponentProps } from '@core/module-engine'
import { ICON_PATHS, normalizeIconName, normalizeIconSize } from './markup'
import type { IconStoredProps } from './props'

export const IconEditor: React.FC<ModuleComponentProps<IconStoredProps>> = ({
  props,
  mcClassName,
  nodeWrapperProps,
}) => {
  const name = normalizeIconName(props.name)
  const decorative = props.decorative || !props.label.trim()
  return (
    <svg
      {...nodeWrapperProps}
      className={mcClassName}
      viewBox="0 0 24 24"
      data-instatic-icon={name}
      data-instatic-icon-size={normalizeIconSize(props.size)}
      aria-hidden={decorative ? 'true' : undefined}
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : props.label}
      focusable="false"
    >
      <path d={ICON_PATHS[name]} />
    </svg>
  )
}
