/**
 * Fixed semantic renderer for authored arrays of links and actions.
 *
 * The records are exposed through governed Component Library repeater fields;
 * this implementation module has no child slot and cannot contain arbitrary
 * components. Nested strings are escaped here because the publisher's normal
 * top-level prop escaping deliberately leaves non-string arrays unchanged.
 */
import type { ModuleDefinition } from '@core/module-engine'
import { registry } from '@core/module-engine'
import { Value } from '@core/utils/typeboxHelpers'
import { escapeHtml, safeUrl } from '@modules/base/utils/escape'
import { anchorRel } from '@modules/base/shared/anchorTarget'
import { ListBoxSolidIcon } from 'pixel-art-icons/icons/list-box-solid'
import { LinkCollectionEditor } from './LinkCollectionEditor'
import {
  LinkCollectionPropsSchema,
  type LinkCollectionItem,
  type LinkCollectionStoredProps,
} from './props'

export const LinkCollectionModule: ModuleDefinition<LinkCollectionStoredProps> = {
  id: 'base.link-collection',
  name: 'Link Collection',
  description: 'Implementation renderer for typed Creator Signal link records.',
  category: 'Navigation',
  version: '1.0.0',
  icon: ListBoxSolidIcon,
  trusted: true,
  canHaveChildren: false,
  schema: {
    items: { type: 'text', label: 'Items', hidden: true },
    presentation: { type: 'text', label: 'Presentation', hidden: true },
  },
  propsSchema: LinkCollectionPropsSchema,
  defaults: Value.Create(LinkCollectionPropsSchema),
  component: LinkCollectionEditor,
  htmlTag: (props) => props.presentation === 'breadcrumb' ? 'ol' : 'ul',
  render: (props) => {
    const breadcrumb = props.presentation === 'breadcrumb'
    const tag = breadcrumb ? 'ol' : 'ul'
    const listAttrs = breadcrumb
      ? ' itemscope itemtype="https://schema.org/BreadcrumbList"'
      : ''
    const items = props.items.map((item, index) => renderItem(
      item,
      breadcrumb,
      breadcrumb && (item.current || index === props.items.length - 1),
      index,
    )).join('')
    return {
      html: `<${tag} data-instatic-link-collection="${props.presentation}"${listAttrs}>` +
        `${items}</${tag}>`,
    }
  },
}

function renderItem(
  item: LinkCollectionItem,
  breadcrumb: boolean,
  current: boolean,
  index: number,
): string {
  const label = escapeHtml(item.label)
  const content = breadcrumb
    ? `<span itemprop="name">${label}</span>`
    : label
  const element = item.kind === 'button'
    ? `<button type="button">${content}</button>`
    : renderAnchor(item, content, breadcrumb, current)
  if (!breadcrumb) return `<li>${element}</li>`
  return '<li itemprop="itemListElement" itemscope ' +
    'itemtype="https://schema.org/ListItem">' +
    `${element}<meta itemprop="position" content="${index + 1}"></li>`
}

function renderAnchor(
  item: LinkCollectionItem,
  content: string,
  breadcrumb: boolean,
  current: boolean,
): string {
  const target = item.target === '_blank' || item.target === '_parent'
    ? item.target
    : '_self'
  const rel = anchorRel(target)
  return `<a${breadcrumb ? ' itemprop="item"' : ''} href="${safeUrl(item.href)}"` +
    ` target="${target}"${rel ? ` rel="${rel}"` : ''}` +
    `${current ? ' aria-current="page"' : ''}>${content}</a>`
}

registry.registerOrReplace(LinkCollectionModule)
