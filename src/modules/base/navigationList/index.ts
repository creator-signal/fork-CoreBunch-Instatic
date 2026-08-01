import type { ModuleDefinition } from '@core/module-engine'
import { registry } from '@core/module-engine'
import { Value } from '@core/utils/typeboxHelpers'
import { ListBoxSolidIcon } from 'pixel-art-icons/icons/list-box-solid'
import { NavigationListEditor } from './NavigationListEditor'
import {
  NavigationListPropsSchema,
  type NavigationListStoredProps,
} from './props'

export const NavigationListModule: ModuleDefinition<NavigationListStoredProps> = {
  id: 'base.navigation-list',
  name: 'Navigation List',
  description: 'Implementation list that wraps each governed navigation item in a list item.',
  category: 'Navigation',
  version: '1.0.0',
  icon: ListBoxSolidIcon,
  trusted: true,
  canHaveChildren: true,
  schema: {
    ordered: { type: 'toggle', label: 'Ordered list' },
    structuredData: {
      type: 'select',
      label: 'Structured data',
      hidden: true,
      options: [
        { label: 'None', value: 'none' },
        { label: 'Breadcrumb', value: 'breadcrumb' },
      ],
    },
  },
  propsSchema: NavigationListPropsSchema,
  defaults: Value.Create(NavigationListPropsSchema),
  component: NavigationListEditor,
  htmlTag: (props) => props.ordered ? 'ol' : 'ul',
  render: (props, children) => {
    const tag = props.ordered ? 'ol' : 'ul'
    if (props.structuredData === 'breadcrumb') {
      const items = children.map((child, index) => {
        const anchor = child.match(/^<a([^>]*)>([\s\S]*)<\/a>$/)
        const content = anchor
          ? `<a itemprop="item"${anchor[1]}` +
            `${index === children.length - 1 && !/\saria-current=/.test(anchor[1])
              ? ' aria-current="page"'
              : ''}>` +
            `<span itemprop="name">${anchor[2]}</span></a>`
          : `<span itemprop="name">${child}</span>`
        return '<li itemprop="itemListElement" itemscope ' +
          'itemtype="https://schema.org/ListItem">' +
          `${content}<meta itemprop="position" content="${index + 1}"></li>`
      }).join('')
      return {
        html: `<${tag} itemscope itemtype="https://schema.org/BreadcrumbList">` +
          `${items}</${tag}>`,
      }
    }
    return {
      html: `<${tag}>${children.map((child) => `<li>${child}</li>`).join('')}</${tag}>`,
    }
  },
}

registry.registerOrReplace(NavigationListModule)
