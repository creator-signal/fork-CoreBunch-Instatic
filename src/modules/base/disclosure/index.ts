import type { ModuleDefinition } from '@core/module-engine'
import { registry } from '@core/module-engine'
import { Type, Value, type Static } from '@core/utils/typeboxHelpers'
import { LayoutSolidIcon } from 'pixel-art-icons/icons/layout-solid'
import { ListBoxSolidIcon } from 'pixel-art-icons/icons/list-box-solid'
import {
  AccordionEditor,
  AccordionItemEditor,
  TabPanelEditor,
  TabsEditor,
} from './DisclosureEditors'
import { TABS_RUNTIME_JS } from './tabsRuntimeJs'

const TabsPropsSchema = Type.Object({
  label: Type.String({ default: 'Tabs' }),
  orientation: Type.Union([
    Type.Literal('horizontal'),
    Type.Literal('vertical'),
  ], { default: 'horizontal' }),
  activation: Type.Union([
    Type.Literal('automatic'),
    Type.Literal('manual'),
  ], { default: 'automatic' }),
})

const TabPanelPropsSchema = Type.Object({
  tabId: Type.String({ default: 'tab' }),
  label: Type.String({ default: 'Tab' }),
  selected: Type.Boolean({ default: false }),
  disabled: Type.Boolean({ default: false }),
})

const AccordionPropsSchema = Type.Object({
  label: Type.String({ default: 'Accordion' }),
})

const AccordionItemPropsSchema = Type.Object({
  title: Type.String({ default: 'Section' }),
  open: Type.Boolean({ default: false }),
})

type TabsProps = Static<typeof TabsPropsSchema>
type TabPanelProps = Static<typeof TabPanelPropsSchema>
type AccordionProps = Static<typeof AccordionPropsSchema>
type AccordionItemProps = Static<typeof AccordionItemPropsSchema>

export const TabsModule: ModuleDefinition<TabsProps> = {
  id: 'base.tabs',
  name: 'Tabs',
  description: 'A progressively enhanced accessible tab set.',
  category: 'Interactive',
  version: '1.0.0',
  icon: LayoutSolidIcon,
  trusted: true,
  canHaveChildren: true,
  schema: {
    label: { type: 'text', label: 'Accessible label' },
    orientation: {
      type: 'select',
      label: 'Orientation',
      options: [
        { label: 'Horizontal', value: 'horizontal' },
        { label: 'Vertical', value: 'vertical' },
      ],
    },
    activation: {
      type: 'select',
      label: 'Keyboard activation',
      options: [
        { label: 'Automatic', value: 'automatic' },
        { label: 'Manual', value: 'manual' },
      ],
    },
  },
  propsSchema: TabsPropsSchema,
  defaults: Value.Create(TabsPropsSchema),
  component: TabsEditor,
  htmlTag: 'div',
  render: (props, renderedChildren) => ({
    html:
      `<div data-instatic-tabs data-instatic-tabs-orientation="${props.orientation}" ` +
      `data-instatic-tabs-activation="${props.activation}" aria-label="${props.label}">` +
      `${renderedChildren.join('')}</div>`,
    js: TABS_RUNTIME_JS,
  }),
}

export const TabPanelModule: ModuleDefinition<TabPanelProps> = {
  id: 'base.tab-panel',
  name: 'Tab panel',
  description: 'One labelled panel inside Tabs.',
  category: 'Interactive',
  version: '1.0.0',
  icon: LayoutSolidIcon,
  trusted: true,
  canHaveChildren: true,
  schema: {
    tabId: { type: 'text', label: 'Tab ID', normalize: 'identifier' },
    label: { type: 'text', label: 'Label' },
    selected: { type: 'toggle', label: 'Selected initially' },
    disabled: { type: 'toggle', label: 'Disabled' },
  },
  propsSchema: TabPanelPropsSchema,
  defaults: Value.Create(TabPanelPropsSchema),
  component: TabPanelEditor,
  htmlTag: 'section',
  render: (props, renderedChildren) => ({
    html:
      `<section data-instatic-tab-panel="${props.tabId}" ` +
      `data-instatic-tab-label="${props.label}"` +
      `${props.selected ? ' data-instatic-tab-selected="true"' : ''}` +
      `${props.disabled ? ' data-instatic-tab-disabled="true"' : ''}>` +
      `${renderedChildren.join('')}</section>`,
  }),
}

export const AccordionModule: ModuleDefinition<AccordionProps> = {
  id: 'base.accordion',
  name: 'Accordion',
  description: 'A labelled group of native disclosure sections.',
  category: 'Interactive',
  version: '1.0.0',
  icon: ListBoxSolidIcon,
  trusted: true,
  canHaveChildren: true,
  schema: {
    label: { type: 'text', label: 'Accessible label' },
  },
  propsSchema: AccordionPropsSchema,
  defaults: Value.Create(AccordionPropsSchema),
  component: AccordionEditor,
  htmlTag: 'div',
  render: (props, renderedChildren) => ({
    html:
      `<div data-instatic-accordion aria-label="${props.label}">` +
      `${renderedChildren.join('')}</div>`,
  }),
}

export const AccordionItemModule: ModuleDefinition<AccordionItemProps> = {
  id: 'base.accordion-item',
  name: 'Accordion item',
  description: 'A native details and summary disclosure section.',
  category: 'Interactive',
  version: '1.0.0',
  icon: ListBoxSolidIcon,
  trusted: true,
  canHaveChildren: true,
  schema: {
    title: { type: 'text', label: 'Summary' },
    open: { type: 'toggle', label: 'Open initially' },
  },
  propsSchema: AccordionItemPropsSchema,
  defaults: Value.Create(AccordionItemPropsSchema),
  component: AccordionItemEditor,
  htmlTag: 'details',
  render: (props, renderedChildren) => ({
    html:
      `<details data-instatic-accordion-item${props.open ? ' open' : ''}>` +
      `<summary>${props.title}</summary>${renderedChildren.join('')}</details>`,
  }),
}

registry.registerOrReplace(TabsModule)
registry.registerOrReplace(TabPanelModule)
registry.registerOrReplace(AccordionModule)
registry.registerOrReplace(AccordionItemModule)
