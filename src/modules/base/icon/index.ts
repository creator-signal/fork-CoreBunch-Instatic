import type { ModuleDefinition } from '@core/module-engine'
import { registry } from '@core/module-engine'
import { Value } from '@core/utils/typeboxHelpers'
import { StarSolidIcon } from 'pixel-art-icons/icons/star-solid'
import { IconEditor } from './IconEditor'
import {
  ICON_CSS,
  ICON_PATHS,
  normalizeIconName,
  normalizeIconSize,
} from './markup'
import { IconPropsSchema, type IconStoredProps } from './props'

export const IconModule: ModuleDefinition<IconStoredProps> = {
  id: 'base.icon',
  name: 'Icon',
  description: 'An approved symbolic icon with decorative or labelled semantics.',
  category: 'Design',
  version: '1.0.0',
  icon: StarSolidIcon,
  trusted: true,
  canHaveChildren: false,
  schema: {
    name: {
      type: 'select',
      label: 'Icon',
      options: [
        { label: 'Information', value: 'information' },
        { label: 'Check', value: 'check' },
        { label: 'Warning', value: 'warning' },
        { label: 'Error', value: 'error' },
        { label: 'Star', value: 'star' },
        { label: 'Person', value: 'person' },
      ],
    },
    label: {
      type: 'text',
      label: 'Accessible label',
      description: 'Required when the icon communicates meaning.',
    },
    decorative: {
      type: 'toggle',
      label: 'Decorative',
      description: 'Hides the icon from assistive technology.',
    },
    size: {
      type: 'select',
      label: 'Size',
      options: [
        { label: 'Small', value: 'small' },
        { label: 'Medium', value: 'medium' },
        { label: 'Large', value: 'large' },
      ],
    },
  },
  propsSchema: IconPropsSchema,
  defaults: Value.Create(IconPropsSchema),
  component: IconEditor,
  htmlTag: 'svg',
  render: (props) => {
    const name = normalizeIconName(props.name)
    const size = normalizeIconSize(props.size)
    const label = String(props.label ?? '').trim()
    const decorative = Boolean(props.decorative) || !label
    return {
      html:
        `<svg viewBox="0 0 24 24" data-instatic-icon="${name}"` +
        ` data-instatic-icon-size="${size}" focusable="false"` +
        (decorative
          ? ' aria-hidden="true"'
          : ` role="img" aria-label="${label}"`) +
        `><path d="${ICON_PATHS[name]}"></path></svg>`,
      css: ICON_CSS,
    }
  },
}

registry.registerOrReplace(IconModule)
