import type { ComponentLibraryEntry, ComponentLibraryField } from '@core/component-library'
import { heroComponent, heroParamIds } from './pack/hero-component'
import {
  creatorSignalPublicAuthoringContract,
  isCreatorSignalComponentPermitted,
} from './public-authoring-contract'

const pluginRequirement = {
  capabilities: [],
  providerAdapters: [],
  plugins: ['creator-signal.site'],
}

const defaultVariant = [{
  id: 'default',
  name: 'Default',
  description: 'The governed Creator Signal treatment.',
  values: {},
}]

function siteEntry(input: {
  id: string
  version?: string
  name: string
  description: string
  tags: string[]
  moduleId: string
  fields: ComponentLibraryField[]
  accessibility?: ComponentLibraryEntry['accessibility']
}): ComponentLibraryEntry {
  return {
    id: input.id,
    version: input.version ?? '1.0.0',
    name: input.name,
    description: input.description,
    category: 'Creator Signal',
    tags: input.tags,
    icon: 'layout-solid',
    source: {
      type: 'plugin',
      pluginId: 'creator-signal.site',
      name: 'Creator Signal',
    },
    status: 'stable',
    composition: 'leaf',
    implementation: { type: 'primitive', moduleId: input.moduleId },
    fields: input.fields,
    variants: defaultVariant,
    presets: [],
    slots: [],
    constraints: {},
    requirements: pluginRequirement,
    documentation: {
      usage: `Edit the typed content fields; the component owns its semantic HTML and uses ${creatorSignalPublicAuthoringContract.designSystem.packageName}.`,
      accessibility: 'Keep labels descriptive and preserve the component heading hierarchy.',
    },
    ...(input.accessibility ? { accessibility: input.accessibility } : {}),
  }
}

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
  composition: 'leaf',
  implementation: {
    type: 'visual-component',
    componentId: heroComponent.id,
  },
  fields: [
    { key: heroParamIds.eyebrow, label: 'Eyebrow', description: 'Short context label above the headline.', type: 'text', required: true },
    { key: heroParamIds.heading, label: 'Heading', description: 'Primary page promise.', type: 'text', required: true },
    { key: heroParamIds.body, label: 'Introduction', description: 'Plain-language supporting copy.', type: 'text', required: true },
    { key: heroParamIds.actionLabel, label: 'Action label', description: 'Visible label for the primary action.', type: 'text', required: true },
    { key: heroParamIds.actionUrl, label: 'Action URL', description: 'Destination for the primary action.', type: 'url', required: true },
    { key: heroParamIds.artwork, label: 'Artwork', description: 'Optional image selected from the Media workspace.', type: 'image', required: false },
  ],
  variants: defaultVariant,
  presets: [],
  slots: [],
  constraints: {},
  requirements: pluginRequirement,
  documentation: {
    usage: `Use once near the start of a landing page. Styling is governed by ${creatorSignalPublicAuthoringContract.designSystem.packageName}.`,
    accessibility: 'Use the Hero as the page-level H1 and keep later heading levels logical.',
  },
  accessibility: {
    checks: [{
      rule: 'a11y.heading-order',
      category: 'heading',
      enforcement: 'manual',
      severity: 'warning',
      fields: [heroParamIds.heading],
      summary: 'The Hero heading must fit the page heading hierarchy.',
      remediation: 'Use the Hero as the page-level H1 and keep later heading levels logical.',
    }],
  },
}

export const creatorSignalHeaderEntry = siteEntry({
  id: 'creator-signal.site.header',
  name: 'Site Header',
  description: 'Shared brand identity and primary navigation edited once in the site template.',
  tags: ['header', 'navigation', 'brand', 'shared'],
  moduleId: 'creator-signal.site.header',
  fields: [
    { key: 'brandName', label: 'Brand name', type: 'text', required: true },
    { key: 'tagline', label: 'Tagline', type: 'text', required: true },
    { key: 'homeUrl', label: 'Home URL', type: 'url', required: true },
    {
      key: 'items', label: 'Navigation links', type: 'repeater', required: true,
      itemLabel: 'Link', minItems: 1, maxItems: 12,
      itemFields: [
        { key: 'label', label: 'Label', type: 'text', required: true },
        { key: 'url', label: 'URL', type: 'url', required: true },
        { key: 'emphasis', label: 'Treatment', type: 'select', required: true, options: [
          { label: 'Standard', value: 'default' },
          { label: 'Primary action', value: 'primary' },
        ] },
      ],
    },
  ],
})

export const creatorSignalFooterEntry = siteEntry({
  id: 'creator-signal.site.footer',
  name: 'Site Footer',
  description: 'Shared footer identity, legal routes and service links.',
  tags: ['footer', 'navigation', 'legal', 'shared'],
  moduleId: 'creator-signal.site.footer',
  fields: [
    { key: 'brandName', label: 'Brand name', type: 'text', required: true },
    { key: 'tagline', label: 'Tagline', type: 'text', required: true },
    { key: 'copyright', label: 'Copyright', type: 'text', required: true },
    {
      key: 'items', label: 'Footer links', type: 'repeater', required: true,
      itemLabel: 'Link', minItems: 1, maxItems: 24,
      itemFields: [
        { key: 'label', label: 'Label', type: 'text', required: true },
        { key: 'url', label: 'URL', type: 'url', required: true },
      ],
    },
  ],
})

export const creatorSignalConsentEntry = siteEntry({
  id: 'creator-signal.site.consent-banner',
  name: 'Privacy Choices',
  description: 'Shared privacy notice and analytics choices.',
  tags: ['privacy', 'consent', 'analytics', 'shared'],
  moduleId: 'creator-signal.site.consent-banner',
  fields: [
    { key: 'heading', label: 'Heading', type: 'text', required: true },
    { key: 'body', label: 'Explanation', type: 'text', required: true },
    { key: 'essentialLabel', label: 'Essential choice label', type: 'text', required: true },
    { key: 'optionalLabel', label: 'Optional choice label', type: 'text', required: true },
  ],
})

export const creatorSignalFeatureGridEntry = siteEntry({
  id: 'creator-signal.site.feature-grid',
  name: 'Feature Grid',
  description: 'A section introduction and repeatable list of opinionated feature cards.',
  tags: ['features', 'cards', 'list', 'marketing'],
  moduleId: 'creator-signal.site.feature-grid',
  fields: [
    { key: 'eyebrow', label: 'Eyebrow', type: 'text', required: true },
    { key: 'heading', label: 'Heading', type: 'text', required: true },
    { key: 'introduction', label: 'Introduction', type: 'text', required: true },
    { key: 'sectionId', label: 'Section anchor', type: 'text', required: true, advanced: true },
    {
      key: 'items', label: 'Feature cards', type: 'repeater', required: true,
      itemLabel: 'Feature', minItems: 1, maxItems: 12,
      itemFields: [
        { key: 'marker', label: 'Marker', type: 'text', required: true },
        { key: 'heading', label: 'Heading', type: 'text', required: true },
        { key: 'body', label: 'Description', type: 'text', required: true },
      ],
    },
  ],
})

export const creatorSignalCallToActionEntry = siteEntry({
  id: 'creator-signal.site.call-to-action',
  name: 'Call to Action',
  description: 'A focused next step with one primary action.',
  tags: ['call to action', 'link', 'marketing'],
  moduleId: 'creator-signal.site.call-to-action',
  fields: [
    { key: 'eyebrow', label: 'Eyebrow', type: 'text', required: true },
    { key: 'heading', label: 'Heading', type: 'text', required: true },
    { key: 'body', label: 'Explanation', type: 'text', required: true },
    { key: 'actionLabel', label: 'Action label', type: 'text', required: true },
    { key: 'actionUrl', label: 'Action URL', type: 'url', required: true },
    { key: 'sectionId', label: 'Section anchor', type: 'text', required: true, advanced: true },
  ],
})

export const creatorSignalRichTextEntry = siteEntry({
  id: 'creator-signal.site.rich-text-section',
  name: 'Rich Text Section',
  description: 'One coherent rich-text value instead of a stack of paragraph components.',
  tags: ['rich text', 'prose', 'editorial'],
  moduleId: 'creator-signal.site.rich-text-section',
  fields: [
    { key: 'heading', label: 'Heading', type: 'text', required: true },
    { key: 'body', label: 'Content', type: 'rich-text', required: true },
    { key: 'sectionId', label: 'Section anchor', type: 'text', required: true, advanced: true },
  ],
})

export const creatorSignalTestimonialEntry = siteEntry({
  id: 'creator-signal.site.testimonial',
  name: 'Testimonial',
  description: 'A semantic quotation and attribution.',
  tags: ['quote', 'testimonial', 'editorial'],
  moduleId: 'creator-signal.site.testimonial',
  fields: [
    { key: 'quote', label: 'Quotation', type: 'text', required: true },
    { key: 'attribution', label: 'Attribution', type: 'text', required: true },
    { key: 'role', label: 'Role or business', type: 'text', required: true },
  ],
})

export const creatorSignalFaqEntry = siteEntry({
  id: 'creator-signal.site.faq',
  name: 'FAQ',
  description: 'Repeatable questions rendered as native disclosures with FAQ structured data.',
  tags: ['faq', 'disclosure', 'structured data'],
  moduleId: 'creator-signal.site.faq',
  fields: [
    { key: 'heading', label: 'Heading', type: 'text', required: true },
    { key: 'sectionId', label: 'Section anchor', type: 'text', required: true, advanced: true },
    {
      key: 'items', label: 'Questions and answers', type: 'repeater', required: true,
      itemLabel: 'Question', minItems: 1, maxItems: 20,
      itemFields: [
        { key: 'question', label: 'Question', type: 'text', required: true },
        { key: 'answer', label: 'Answer', type: 'text', required: true },
      ],
    },
  ],
})

export const creatorSignalPublicDocumentEntry = siteEntry({
  id: 'creator-signal.site.public-document',
  name: 'Public Document',
  description: 'A complete versioned legal, trust, support or status document.',
  tags: ['legal', 'trust', 'support', 'document', 'structured data'],
  moduleId: 'creator-signal.site.public-document',
  fields: [
    { key: 'eyebrow', label: 'Eyebrow', type: 'text', required: true },
    { key: 'heading', label: 'Document heading', type: 'text', required: true },
    { key: 'summary', label: 'Summary', type: 'text', required: true },
    { key: 'body', label: 'Document content', type: 'rich-text', required: true },
    { key: 'dateModified', label: 'Date modified', type: 'text', required: true },
  ],
})

export const creatorSignalMauticFormEntry = siteEntry({
  id: 'creator-signal.site.mautic-form',
  name: 'Managed Form',
  description: 'A governed public form resolved from the generated Mautic registry.',
  tags: ['form', 'contact', 'mautic', 'integration'],
  moduleId: 'creator-signal.site.mautic-form',
  fields: [
    { key: 'eyebrow', label: 'Eyebrow', type: 'text', required: true },
    { key: 'heading', label: 'Heading', type: 'text', required: true },
    { key: 'introduction', label: 'Introduction', type: 'text', required: true },
    { key: 'successMessage', label: 'Success message', type: 'text', required: true },
    { key: 'mauticBaseUrl', label: 'Mautic public URL', type: 'url', required: true, advanced: true },
    { key: 'formAlias', label: 'Governed form alias', type: 'text', required: true, advanced: true },
    { key: 'registryPath', label: 'Registry path', type: 'text', required: true, advanced: true },
    { key: 'formCode', label: 'Analytics form code', type: 'text', required: true, advanced: true },
    { key: 'campaignCode', label: 'Analytics campaign code', type: 'text', required: true, advanced: true },
  ],
})

export const creatorSignalComponentLibraryEntries: readonly ComponentLibraryEntry[] = [
  creatorSignalHeroEntry,
  creatorSignalHeaderEntry,
  creatorSignalFooterEntry,
  creatorSignalConsentEntry,
  creatorSignalFeatureGridEntry,
  creatorSignalCallToActionEntry,
  creatorSignalRichTextEntry,
  creatorSignalTestimonialEntry,
  creatorSignalFaqEntry,
  creatorSignalPublicDocumentEntry,
  creatorSignalMauticFormEntry,
]

for (const entry of creatorSignalComponentLibraryEntries) {
  if (!isCreatorSignalComponentPermitted(entry.id)) {
    throw new Error(
      `[creator-signal] Component Library entry "${entry.id}" is not permitted by the public authoring contract.`,
    )
  }
}
