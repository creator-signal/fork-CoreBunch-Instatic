import React from 'react'
import type { ModuleComponentProps } from '@core/module-engine'
import { normalizeComponentFrameToken } from './normalize'
import type { ComponentFrameStoredProps } from './props'

export const ComponentFrameEditor: React.FC<
  ModuleComponentProps<ComponentFrameStoredProps>
> = ({ props, children, mcClassName, nodeWrapperProps }) => {
  const tag = ['section', 'article', 'aside', 'nav', 'figure', 'span', 'div'].includes(props.tag)
    ? props.tag
    : 'section'

  return React.createElement(
    tag,
    {
      ...nodeWrapperProps,
      className: mcClassName,
      'data-instatic-component': normalizeComponentFrameToken(
        props.kind,
        'section',
      ),
      'data-variant': normalizeComponentFrameToken(props.variant, 'default'),
      ...(props.label ? { 'aria-label': props.label } : {}),
      ...(props.bindingPrefix
        ? { 'data-instatic-binding-prefix': props.bindingPrefix }
        : {}),
    },
    children,
  )
}
