import type { ComponentLibraryField } from '@core/component-library'

type RepeaterField = Extract<ComponentLibraryField, { type: 'repeater' }>

const targetField: RepeaterField['itemFields'][number] = {
  key: 'target',
  label: 'Open in',
  type: 'select',
  required: true,
  options: [
    { label: 'Same tab', value: '_self' },
    { label: 'New tab', value: '_blank' },
    { label: 'Parent', value: '_parent' },
  ],
}

interface LinkRepeaterOptions {
  key?: string
  label?: string
  itemLabel?: string
  description: string
  minItems?: number
  maxItems?: number
  current?: boolean
}

export function linkRepeaterField(options: LinkRepeaterOptions): RepeaterField {
  return {
    key: options.key ?? 'items',
    label: options.label ?? 'Links',
    description: options.description,
    type: 'repeater',
    required: (options.minItems ?? 0) > 0,
    itemLabel: options.itemLabel ?? 'Link',
    itemFields: [
      { key: 'label', label: 'Link text', type: 'text', required: true },
      { key: 'href', label: 'Destination', type: 'url', required: true },
      targetField,
      ...(options.current
        ? [{
            key: 'current',
            label: 'Current page',
            type: 'boolean' as const,
            required: false,
          }]
        : []),
    ],
    minItems: options.minItems ?? 0,
    ...(options.maxItems === undefined ? {} : { maxItems: options.maxItems }),
  }
}

export function actionRepeaterField(maxItems = 3): RepeaterField {
  return {
    key: 'actions',
    label: 'Actions',
    description: 'Ordered links or native buttons rendered by this component.',
    type: 'repeater',
    required: false,
    itemLabel: 'Action',
    itemFields: [
      { key: 'label', label: 'Label', type: 'text', required: true },
      {
        key: 'kind',
        label: 'Action type',
        type: 'select',
        required: true,
        options: [
          { label: 'Link', value: 'link' },
          { label: 'Button', value: 'button' },
        ],
      },
      { key: 'href', label: 'Destination', type: 'url', required: false },
      targetField,
    ],
    minItems: 0,
    maxItems,
  }
}
