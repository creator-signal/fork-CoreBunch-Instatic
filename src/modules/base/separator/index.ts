import type { ModuleDefinition } from '@core/module-engine'
import { registry } from '@core/module-engine'
import { Type, Value, type Static } from '@core/utils/typeboxHelpers'
import { LayoutSolidIcon } from 'pixel-art-icons/icons/layout-solid'
import { SeparatorEditor } from './SeparatorEditor'

const SeparatorPropsSchema = Type.Object({
  style: Type.Union([
    Type.Literal('solid'),
    Type.Literal('dashed'),
    Type.Literal('dotted'),
  ], { default: 'solid' }),
  width: Type.Union([
    Type.Literal('content'),
    Type.Literal('wide'),
    Type.Literal('full'),
  ], { default: 'full' }),
  colorToken: Type.String({ default: 'border.subtle' }),
  spacing: Type.Union([
    Type.Literal('compact'),
    Type.Literal('normal'),
    Type.Literal('spacious'),
  ], { default: 'normal' }),
})

type SeparatorProps = Static<typeof SeparatorPropsSchema>

export const SeparatorModule: ModuleDefinition<SeparatorProps> = {
  id: 'base.separator',
  name: 'Separator',
  description: 'A semantic thematic break styled through approved tokens.',
  category: 'Layout',
  version: '1.0.0',
  icon: LayoutSolidIcon,
  trusted: true,
  canHaveChildren: false,
  schema: {
    style: { type: 'select', label: 'Style', options: [
      { label: 'Solid', value: 'solid' },
      { label: 'Dashed', value: 'dashed' },
      { label: 'Dotted', value: 'dotted' },
    ] },
    width: { type: 'select', label: 'Width', options: [
      { label: 'Content', value: 'content' },
      { label: 'Wide', value: 'wide' },
      { label: 'Full', value: 'full' },
    ] },
    colorToken: { type: 'text', label: 'Colour token' },
    spacing: { type: 'select', label: 'Spacing', options: [
      { label: 'Compact', value: 'compact' },
      { label: 'Normal', value: 'normal' },
      { label: 'Spacious', value: 'spacious' },
    ] },
  },
  propsSchema: SeparatorPropsSchema,
  defaults: Value.Create(SeparatorPropsSchema),
  component: SeparatorEditor,
  htmlTag: 'hr',
  render: (props) => ({
    html:
      `<hr data-instatic-separator-style="${props.style}"` +
      ` data-instatic-separator-width="${props.width}"` +
      ` data-instatic-separator-color="${attribute(props.colorToken)}"` +
      ` data-instatic-separator-spacing="${props.spacing}">`,
  }),
}

function attribute(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

registry.registerOrReplace(SeparatorModule)
