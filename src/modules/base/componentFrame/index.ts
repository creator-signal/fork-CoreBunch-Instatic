/**
 * base.component-frame — shared semantic root for built-in Visual Components.
 *
 * It owns no authored content. Built-in Visual Component definitions compose
 * ordinary modules beneath it and bind the frame's kind/variant parameters.
 * Static CSS consumes the site's generated design-token variables with
 * conservative fallbacks, so a token update flows through every instance.
 */
import type { ModuleDefinition } from '@core/module-engine'
import { registry } from '@core/module-engine'
import { Value } from '@core/utils/typeboxHelpers'
import { ContainerSolidIcon } from 'pixel-art-icons/icons/container-solid'
import { ComponentFrameEditor } from './ComponentFrameEditor'
import { normalizeComponentFrameToken } from './normalize'
import {
  ComponentFramePropsSchema,
  type ComponentFrameStoredProps,
} from './props'

export const COMPONENT_FRAME_CSS = `
[data-instatic-component] {
  box-sizing: border-box;
}
[data-instatic-component="hero"] {
  display: grid;
  gap: var(--space-l, 1.5rem);
  padding-block: var(--space-2xl, 4rem);
  align-items: center;
}
[data-instatic-component="hero"][data-variant="image-right"] > :first-child {
  order: 2;
}
@media (min-width: 48rem) {
  [data-instatic-component="hero"]:not([data-variant="text-only"]) {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  }
}
[data-instatic-component="card"],
[data-instatic-component="download"],
[data-instatic-component="notice"] {
  display: grid;
  gap: var(--space-s, 0.75rem);
  padding: var(--space-l, 1.5rem);
  border: 1px solid var(--color-border, currentColor);
  border-radius: var(--radius-m, 0.5rem);
}
[data-instatic-component="notice"] {
  border-inline-start-width: var(--space-2xs, 0.25rem);
}
[data-instatic-component="navigation"] {
  display: flex;
  gap: var(--space-m, 1rem);
  align-items: center;
}
[data-instatic-component="navigation"][data-variant="vertical"] {
  flex-direction: column;
  align-items: stretch;
}
`.trim()

export const ComponentFrameModule: ModuleDefinition<ComponentFrameStoredProps> = {
  id: 'base.component-frame',
  name: 'Component Frame',
  description: 'Shared semantic root for governed Visual Components.',
  category: 'Component system',
  version: '1.0.0',
  icon: ContainerSolidIcon,
  trusted: true,
  canHaveChildren: true,

  schema: {
    kind: { type: 'text', label: 'Component kind', hidden: true },
    variant: { type: 'text', label: 'Variant', hidden: true },
    tag: {
      type: 'select',
      label: 'Semantic element',
      options: [
        { label: 'Section', value: 'section' },
        { label: 'Article', value: 'article' },
        { label: 'Aside', value: 'aside' },
        { label: 'Navigation', value: 'nav' },
        { label: 'Generic', value: 'div' },
      ],
    },
    label: { type: 'text', label: 'Accessible label' },
  },

  propsSchema: ComponentFramePropsSchema,
  defaults: Value.Create(ComponentFramePropsSchema),
  component: ComponentFrameEditor,
  htmlTag: (props) =>
    ['section', 'article', 'aside', 'nav', 'div'].includes(props.tag)
      ? props.tag
      : 'section',
  render: (props, children) => {
    const tag = ['section', 'article', 'aside', 'nav', 'div'].includes(props.tag)
      ? props.tag
      : 'section'
    const kind = normalizeComponentFrameToken(props.kind, 'section')
    const variant = normalizeComponentFrameToken(props.variant, 'default')
    const label = String(props.label ?? '').trim()
    return {
      html:
        `<${tag} data-instatic-component="${kind}" data-variant="${variant}"` +
        `${label ? ` aria-label="${label}"` : ''}>` +
        `${children.join('')}</${tag}>`,
      css: COMPONENT_FRAME_CSS,
    }
  },
}

registry.registerOrReplace(ComponentFrameModule)
