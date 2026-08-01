import React from 'react'
import type { ModuleComponentProps } from '@core/module-engine'
import type { NavigationListStoredProps } from './props'

export const NavigationListEditor: React.FC<
  ModuleComponentProps<NavigationListStoredProps>
> = ({ props, children, mcClassName, nodeWrapperProps }) => {
  const tag = props.ordered ? 'ol' : 'ul'
  return React.createElement(
    tag,
    {
      ...nodeWrapperProps,
      className: mcClassName,
      ...(props.structuredData === 'breadcrumb'
        ? {
            itemScope: true,
            itemType: 'https://schema.org/BreadcrumbList',
          }
        : {}),
    },
    React.Children.map(children, (child, index) => (
      <li
        {...(props.structuredData === 'breadcrumb'
          ? {
              itemProp: 'itemListElement',
              itemScope: true,
              itemType: 'https://schema.org/ListItem',
            }
          : {})}
      >
        {child}
        {props.structuredData === 'breadcrumb'
          ? <meta itemProp="position" content={String(index + 1)} />
          : null}
      </li>
    )),
  )
}
