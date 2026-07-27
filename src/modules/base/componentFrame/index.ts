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
[data-instatic-component="badge"] {
  display: inline-flex;
  gap: var(--space-2xs, 0.25rem);
  align-items: center;
  padding: var(--space-2xs, 0.25rem) var(--space-xs, 0.5rem);
  border-radius: var(--radius-pill, 999px);
  background: var(--color-surface-muted, Canvas);
  color: var(--color-text, CanvasText);
}
[data-instatic-component="quote"],
[data-instatic-component="person-profile"] {
  display: grid;
  gap: var(--space-m, 1rem);
}
[data-instatic-component="quote"] {
  margin-inline: 0;
  padding-inline-start: var(--space-l, 1.5rem);
  border-inline-start: var(--space-2xs, 0.25rem) solid var(--color-border, currentColor);
}
[data-instatic-component="breadcrumb"] ol,
[data-instatic-component="table-of-contents"] ul {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xs, 0.5rem) var(--space-m, 1rem);
  margin: 0;
  padding: 0;
  list-style: none;
}
[data-instatic-component="breadcrumb"] li:not(:last-child)::after {
  content: "/";
  margin-inline-start: var(--space-m, 1rem);
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
[data-instatic-component="grid"],
[data-instatic-component="card-grid"],
[data-instatic-component="gallery"],
[data-instatic-component="statistics"],
[data-instatic-component="logo-cloud"] {
  display: grid;
  gap: var(--space-l, 1.5rem);
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 16rem), 1fr));
}
[data-instatic-component="icon-list"],
[data-instatic-component="timeline"],
[data-instatic-component="steps"],
[data-instatic-component="comparison-table"],
[data-instatic-component="empty-state"] {
  display: grid;
  gap: var(--space-m, 1rem);
}
[data-instatic-component="empty-state"] {
  justify-items: start;
  padding: var(--space-xl, 2rem);
  border: 1px solid var(--color-border, currentColor);
  border-radius: var(--radius-m, 0.5rem);
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
        { label: 'Figure', value: 'figure' },
        { label: 'Inline', value: 'span' },
        { label: 'Generic', value: 'div' },
      ],
    },
    label: { type: 'text', label: 'Accessible label' },
    bindingPrefix: {
      type: 'text',
      label: 'Binding prefix',
      hidden: true,
    },
  },

  propsSchema: ComponentFramePropsSchema,
  defaults: Value.Create(ComponentFramePropsSchema),
  component: ComponentFrameEditor,
  htmlTag: (props) =>
    ['section', 'article', 'aside', 'nav', 'figure', 'span', 'div'].includes(props.tag)
      ? props.tag
      : 'section',
  render: (props, children) => {
    const tag = ['section', 'article', 'aside', 'nav', 'figure', 'span', 'div'].includes(props.tag)
      ? props.tag
      : 'section'
    const kind = normalizeComponentFrameToken(props.kind, 'section')
    const variant = normalizeComponentFrameToken(props.variant, 'default')
    const label = String(props.label ?? '').trim()
    const bindingPrefix = String(props.bindingPrefix ?? '').trim()
    return {
      html:
        `<${tag} data-instatic-component="${kind}" data-variant="${variant}"` +
        `${label ? ` aria-label="${label}"` : ''}` +
        `${bindingPrefix ? ` data-instatic-binding-prefix="${bindingPrefix}"` : ''}>` +
        `${children.join('')}</${tag}>`,
      css: COMPONENT_FRAME_CSS,
    }
  },
}

registry.registerOrReplace(ComponentFrameModule)
