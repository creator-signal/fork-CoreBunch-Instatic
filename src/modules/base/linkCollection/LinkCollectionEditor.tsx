import type { ModuleComponentProps } from '@core/module-engine'
import { isSafeUrl } from '@core/html-sanitize'
import React from 'react'
import { anchorRel } from '@modules/base/shared/anchorTarget'
import type {
  LinkCollectionItem,
  LinkCollectionStoredProps,
} from './props'

export function LinkCollectionEditor({
  props,
  mcClassName,
  nodeWrapperProps,
}: ModuleComponentProps<LinkCollectionStoredProps>) {
  const ordered = props.presentation === 'breadcrumb'
  const Tag = ordered ? 'ol' : 'ul'

  return (
    <Tag
      {...nodeWrapperProps}
      className={mcClassName}
      data-instatic-link-collection={props.presentation}
      {...(ordered
        ? {
            itemScope: true,
            itemType: 'https://schema.org/BreadcrumbList',
          }
        : {})}
    >
      {props.items.map((item, index) => (
        <li
          key={`${item.href}:${index}`}
          {...(ordered
            ? {
                itemProp: 'itemListElement',
                itemScope: true,
                itemType: 'https://schema.org/ListItem',
              }
            : {})}
        >
          {renderItem(item, ordered && (item.current || index === props.items.length - 1), ordered)}
          {ordered ? <meta itemProp="position" content={String(index + 1)} /> : null}
        </li>
      ))}
    </Tag>
  )
}

function renderItem(
  item: LinkCollectionItem,
  current: boolean,
  breadcrumb: boolean,
) {
  if (item.kind === 'button') {
    // This is the authored page element, not an admin UI action. Keep it native
    // and byte-aligned with the publisher without opting into admin Button CSS.
    return React.createElement('button', { type: 'button' }, item.label)
  }
  const label = breadcrumb
    ? <span itemProp="name">{item.label}</span>
    : item.label
  return (
    <a
      href={isSafeUrl(item.href) ? item.href : '#'}
      target={item.target}
      rel={anchorRel(item.target) ?? undefined}
      aria-current={current ? 'page' : undefined}
      itemProp={breadcrumb ? 'item' : undefined}
    >
      {label}
    </a>
  )
}
