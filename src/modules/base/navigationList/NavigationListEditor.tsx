import React from 'react'
import type { ModuleComponentProps } from '@core/module-engine'
import type { NavigationListStoredProps } from './props'

export const NavigationListEditor: React.FC<
  ModuleComponentProps<NavigationListStoredProps>
> = ({ props, children, mcClassName, nodeWrapperProps }) => {
  const tag = props.ordered ? 'ol' : 'ul'
  return React.createElement(
    tag,
    { ...nodeWrapperProps, className: mcClassName },
    React.Children.map(children, (child) => <li>{child}</li>),
  )
}
