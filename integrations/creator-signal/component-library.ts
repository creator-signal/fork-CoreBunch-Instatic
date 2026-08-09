import type { ComponentLibraryEntry } from '@core/component-library'
import { heroComponent, heroParamIds } from './pack/hero-component'
import {
  creatorSignalPublicAuthoringContract,
  isCreatorSignalComponentPermitted,
} from './public-authoring-contract'

export const creatorSignalHeroEntry: ComponentLibraryEntry = {
  id: 'creator-signal.site.hero',
  version: '1.1.0',
  name: 'Creator Signal Hero',
  description: 'The governed Creator Signal page introduction with one primary action and optional artwork.',
  category: 'Creator Signal',
  tags: ['creator signal', 'hero', 'introduction', 'landing page', 'call to action'],
  icon: 'layout-solid',
  source: {
    type: 'plugin',
    pluginId: 'creator-signal.site',
    name: 'Creator Signal',
  },
  status: 'stable',
  implementation: {
    type: 'visual-component',
    componentId: heroComponent.id,
  },
  fields: [
    {
      key: heroParamIds.eyebrow,
      label: 'Eyebrow',
      description: 'Short context label above the headline.',
      type: 'text',
      required: true,
    },
    {
      key: heroParamIds.heading,
      label: 'Heading',
      description: 'Primary page promise.',
      type: 'text',
      required: true,
    },
    {
      key: heroParamIds.body,
      label: 'Introduction',
      description: 'Plain-language supporting copy.',
      type: 'text',
      required: true,
    },
    {
      key: heroParamIds.actionLabel,
      label: 'Action label',
      description: 'Visible label for the primary action.',
      type: 'text',
      required: true,
    },
    {
      key: heroParamIds.actionUrl,
      label: 'Action URL',
      description: 'Destination for the primary action.',
      type: 'url',
      required: true,
    },
    {
      key: heroParamIds.artwork,
      label: 'Artwork',
      description: 'Optional image selected from the MinIO-backed Media workspace.',
      type: 'image',
      required: false,
    },
  ],
  variants: [
    {
      id: 'default',
      name: 'Default',
      description: 'The single governed Creator Signal Hero treatment.',
      values: {},
    },
  ],
  presets: [],
  slots: [],
  constraints: {},
  requirements: {
    capabilities: [],
    providerAdapters: [],
    plugins: ['creator-signal.site'],
  },
  documentation: {
    usage: `Use once near the start of a Creator Signal landing page. Keep the primary action specific and task-oriented. Styling is governed by ${creatorSignalPublicAuthoringContract.designSystem.packageName}; authors do not choose raw colour, font, spacing, radius, shadow, motion, or breakpoint values.`,
    accessibility: 'Keep one page-level H1, preserve a logical heading order, and choose artwork that does not carry essential text.',
  },
  accessibility: {
    checks: [
      {
        rule: 'a11y.heading-order',
        category: 'heading',
        enforcement: 'manual',
        severity: 'warning',
        fields: [heroParamIds.heading],
        summary: 'The Hero heading must fit the page heading hierarchy.',
        remediation: 'Use the Hero as the page-level H1 and keep later heading levels logical.',
      },
      {
        rule: 'a11y.image-alternative',
        category: 'media',
        enforcement: 'manual',
        severity: 'warning',
        fields: [heroParamIds.artwork],
        summary: 'Hero artwork must not be the only place essential information appears.',
        remediation: 'Repeat essential information in the heading or introduction and use decorative artwork when possible.',
      },
    ],
  },
}

export const creatorSignalComponentLibraryEntries: readonly ComponentLibraryEntry[] = [
  creatorSignalHeroEntry,
]

for (const entry of creatorSignalComponentLibraryEntries) {
  if (!isCreatorSignalComponentPermitted(entry.id)) {
    throw new Error(
      `[creator-signal] Component Library entry "${entry.id}" is not permitted by the public authoring contract.`,
    )
  }
}
