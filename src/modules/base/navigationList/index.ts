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
  },
  propsSchema: NavigationListPropsSchema,
  defaults: Value.Create(NavigationListPropsSchema),
  component: NavigationListEditor,
  htmlTag: (props) => props.ordered ? 'ol' : 'ul',
  render: (props, children) => {
    const tag = props.ordered ? 'ol' : 'ul'
    return {
      html: `<${tag}>${children.map((child) => `<li>${child}</li>`).join('')}</${tag}>`,
    }
  },
}

registry.registerOrReplace(NavigationListModule)
