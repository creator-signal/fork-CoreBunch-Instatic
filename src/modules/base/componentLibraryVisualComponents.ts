import {
  builtInVisualComponentRegistry,
  type VCNode,
  type VCParam,
  type VisualComponent,
} from '@core/visual-components-schema'
import type { ComponentLibraryEntry } from '@core/component-library'
import { ComponentFrameModule } from './componentFrame'
import { ContainerModule } from './container'
import { ImageModule } from './image'
import { LinkModule } from './link'
import { ProgressModule } from './progress'
import { RichTextModule } from './richText'
import { SlotOutletModule } from './slotOutlet'
import { TextModule } from './text'
import {
  accessibleNameCheck,
  accessibilityCheck,
  visualComponentEntry,
} from './componentLibraryDefinitions'

type PropBindings = NonNullable<VCNode['propBindings']>

function node(
  id: string,
  moduleId: string,
  defaults: Record<string, unknown>,
  props: Record<string, unknown> = {},
  children: string[] = [],
  propBindings?: PropBindings,
): VCNode {
  return {
    id,
    moduleId,
    props: { ...defaults, ...props },
    breakpointOverrides: {},
    children,
    classIds: [],
    parentId: null,
    ...(propBindings ? { propBindings } : {}),
  }
}

function component(
  id: string,
  name: string,
  rootNodeId: string,
  params: VCParam[],
  nodes: VCNode[],
): VisualComponent {
  const byId = Object.fromEntries(nodes.map((entry) => [entry.id, entry]))
  for (const entry of nodes) {
    for (const childId of entry.children) {
      const child = byId[childId]
      if (child) child.parentId = entry.id
    }
  }
  byId[rootNodeId].parentId = null
  return {
    id,
    name,
    tree: { rootNodeId, nodes: byId },
    params,
    classIds: [],
    createdAt: 0,
  }
}

function param(
  id: string,
  name: string,
  type: VCParam['type'],
  defaultValue: unknown,
  options: Partial<Pick<VCParam, 'description' | 'required' | 'enumOptions'>> = {},
): VCParam {
  return {
    id,
    name,
    type,
    defaultValue,
    required: options.required ?? false,
    ...(options.description ? { description: options.description } : {}),
    ...(options.enumOptions ? { enumOptions: options.enumOptions } : {}),
  }
}

const HERO = component(
  'base.vc.hero',
  'Hero',
  'hero.root',
  [
    param('eyebrow', 'Eyebrow', 'string', ''),
    param('heading', 'Heading', 'string', 'Build something meaningful', { required: true }),
    param('body', 'Body', 'richText', '<p>Add a concise introduction.</p>'),
    param('image', 'Image', 'image', ''),
    param('variant', 'Variant', 'enum', 'image-right', {
      enumOptions: ['image-left', 'image-right', 'text-only'],
    }),
    param('actions', 'Actions', 'slot', []),
  ],
  [
    node(
      'hero.root',
      ComponentFrameModule.id,
      ComponentFrameModule.defaults,
      { kind: 'hero', tag: 'section', label: 'Page introduction' },
      ['hero.image', 'hero.content'],
      { variant: { paramId: 'variant' } },
    ),
    node(
      'hero.image',
      ImageModule.id,
      ImageModule.defaults,
      {},
      [],
      { src: { paramId: 'image' } },
    ),
    node(
      'hero.content',
      ContainerModule.id,
      ContainerModule.defaults,
      { tag: 'div' },
      ['hero.eyebrow', 'hero.heading', 'hero.body', 'hero.actions'],
    ),
    node(
      'hero.eyebrow',
      TextModule.id,
      TextModule.defaults,
      { tag: 'p' },
      [],
      { text: { paramId: 'eyebrow' } },
    ),
    node(
      'hero.heading',
      TextModule.id,
      TextModule.defaults,
      { tag: 'h1' },
      [],
      { text: { paramId: 'heading' } },
    ),
    node(
      'hero.body',
      RichTextModule.id,
      RichTextModule.defaults,
      {},
      [],
      { html: { paramId: 'body' } },
    ),
    node(
      'hero.actions',
      SlotOutletModule.id,
      SlotOutletModule.defaults,
      { slotName: 'actions' },
    ),
  ],
)

const CARD = component(
  'base.vc.card',
  'Card',
  'card.root',
  [
    param('image', 'Image', 'image', ''),
    param('eyebrow', 'Eyebrow', 'string', ''),
    param('title', 'Title', 'string', 'Card title', { required: true }),
    param('description', 'Description', 'richText', '<p>Card description.</p>'),
    param('href', 'Destination', 'url', ''),
    param('actionLabel', 'Action label', 'string', 'Learn more'),
    param('variant', 'Variant', 'enum', 'vertical', {
      enumOptions: ['vertical', 'horizontal', 'compact', 'featured'],
    }),
    param('actions', 'Actions', 'slot', []),
  ],
  [
    node(
      'card.root',
      ComponentFrameModule.id,
      ComponentFrameModule.defaults,
      { kind: 'card', tag: 'article' },
      ['card.image', 'card.eyebrow', 'card.title', 'card.description', 'card.link', 'card.actions'],
      { variant: { paramId: 'variant' } },
    ),
    node('card.image', ImageModule.id, ImageModule.defaults, {}, [], {
      src: { paramId: 'image' },
    }),
    node('card.eyebrow', TextModule.id, TextModule.defaults, { tag: 'p' }, [], {
      text: { paramId: 'eyebrow' },
    }),
    node('card.title', TextModule.id, TextModule.defaults, { tag: 'h2' }, [], {
      text: { paramId: 'title' },
    }),
    node('card.description', RichTextModule.id, RichTextModule.defaults, {}, [], {
      html: { paramId: 'description' },
    }),
    node('card.link', LinkModule.id, LinkModule.defaults, {}, [], {
      href: { paramId: 'href' },
      text: { paramId: 'actionLabel' },
    }),
    node(
      'card.actions',
      SlotOutletModule.id,
      SlotOutletModule.defaults,
      { slotName: 'actions' },
    ),
  ],
)

const NAVIGATION = component(
  'base.vc.navigation',
  'Navigation',
  'navigation.root',
  [
    param('label', 'Accessible label', 'string', 'Primary navigation', { required: true }),
    param('orientation', 'Orientation', 'enum', 'horizontal', {
      enumOptions: ['horizontal', 'vertical'],
    }),
    param('items', 'Navigation items', 'slot', []),
  ],
  [
    node(
      'navigation.root',
      ComponentFrameModule.id,
      ComponentFrameModule.defaults,
      { kind: 'navigation', tag: 'nav' },
      ['navigation.items'],
      {
        label: { paramId: 'label' },
        variant: { paramId: 'orientation' },
      },
    ),
    node(
      'navigation.items',
      SlotOutletModule.id,
      SlotOutletModule.defaults,
      { slotName: 'items' },
    ),
  ],
)

const NOTICE = component(
  'base.vc.notice',
  'Notice',
  'notice.root',
  [
    param('title', 'Title', 'string', 'Important information', { required: true }),
    param('body', 'Body', 'richText', '<p>Add notice details.</p>'),
    param('variant', 'Type', 'enum', 'information', {
      enumOptions: ['information', 'success', 'warning', 'error'],
    }),
    param('actions', 'Actions', 'slot', []),
  ],
  [
    node(
      'notice.root',
      ComponentFrameModule.id,
      ComponentFrameModule.defaults,
      { kind: 'notice', tag: 'aside' },
      ['notice.title', 'notice.body', 'notice.actions'],
      { variant: { paramId: 'variant' } },
    ),
    node('notice.title', TextModule.id, TextModule.defaults, { tag: 'h2' }, [], {
      text: { paramId: 'title' },
    }),
    node('notice.body', RichTextModule.id, RichTextModule.defaults, {}, [], {
      html: { paramId: 'body' },
    }),
    node(
      'notice.actions',
      SlotOutletModule.id,
      SlotOutletModule.defaults,
      { slotName: 'actions' },
    ),
  ],
)

const REUSABLE_SECTION = component(
  'base.vc.reusable-section',
  'Reusable Section',
  'section.root',
  [
    param('label', 'Accessible label', 'string', ''),
    param('content', 'Content', 'slot', []),
  ],
  [
    node(
      'section.root',
      ComponentFrameModule.id,
      ComponentFrameModule.defaults,
      { kind: 'reusable-section', tag: 'section' },
      ['section.content'],
      { label: { paramId: 'label' } },
    ),
    node(
      'section.content',
      SlotOutletModule.id,
      SlotOutletModule.defaults,
      { slotName: 'content' },
    ),
  ],
)

const DOWNLOAD = component(
  'base.vc.download',
  'Download',
  'download.root',
  [
    param('title', 'Title', 'string', 'Download', { required: true }),
    param('description', 'Description', 'string', ''),
    param('href', 'File', 'url', '', { required: true }),
    param('label', 'Link label', 'string', 'Download file', { required: true }),
  ],
  [
    node(
      'download.root',
      ComponentFrameModule.id,
      ComponentFrameModule.defaults,
      { kind: 'download', tag: 'article' },
      ['download.title', 'download.description', 'download.link'],
    ),
    node('download.title', TextModule.id, TextModule.defaults, { tag: 'h2' }, [], {
      text: { paramId: 'title' },
    }),
    node('download.description', TextModule.id, TextModule.defaults, { tag: 'p' }, [], {
      text: { paramId: 'description' },
    }),
    node('download.link', LinkModule.id, LinkModule.defaults, {}, [], {
      href: { paramId: 'href' },
      text: { paramId: 'label' },
    }),
  ],
)

const PROGRESS = component(
  'base.vc.progress',
  'Progress Bar',
  'progress.root',
  [
    param('value', 'Value', 'number', 0),
    param('maximum', 'Maximum', 'number', 100),
    param('label', 'Label', 'string', 'Progress', { required: true }),
    param('showValue', 'Show percentage', 'boolean', true),
  ],
  [
    node(
      'progress.root',
      ProgressModule.id,
      ProgressModule.defaults,
      {},
      [],
      {
        value: { paramId: 'value' },
        maximum: { paramId: 'maximum' },
        label: { paramId: 'label' },
        showValue: { paramId: 'showValue' },
      },
    ),
  ],
)

export const BUILT_IN_VISUAL_COMPONENTS: readonly VisualComponent[] = [
  HERO,
  CARD,
  NAVIGATION,
  NOTICE,
  REUSABLE_SECTION,
  DOWNLOAD,
  PROGRESS,
]

for (const definition of BUILT_IN_VISUAL_COMPONENTS) {
  builtInVisualComponentRegistry.registerOrReplace(definition)
}

const actionSlot: ComponentLibraryEntry['slots'][number] = {
  id: 'actions',
  name: 'Actions',
  description: 'Approved buttons and links.',
  allowedEntryIds: ['base.button', 'base.link'],
  minItems: 0,
  maxItems: 3,
}

export const BUILT_IN_VISUAL_COMPONENT_LIBRARY_ENTRIES:
readonly ComponentLibraryEntry[] = [
  visualComponentEntry({
    id: 'base.hero',
    name: 'Hero',
    description: 'A major page introduction with optional media and actions.',
    category: 'Editorial',
    icon: 'layout-solid',
    componentId: HERO.id,
    tags: ['hero', 'introduction', 'banner', 'call to action'],
    fields: [
      { key: 'eyebrow', label: 'Eyebrow', type: 'text', required: false },
      { key: 'heading', label: 'Heading', type: 'text', required: true },
      { key: 'body', label: 'Body', type: 'rich-text', required: false },
      { key: 'image', label: 'Image', type: 'image', required: false },
    ],
    variants: [
      { id: 'image-left', name: 'Image left', values: { variant: 'image-left' } },
      { id: 'image-right', name: 'Image right', values: { variant: 'image-right' } },
      { id: 'text-only', name: 'Text only', values: { variant: 'text-only' } },
    ],
    slots: [actionSlot],
    accessibilityChecks: [
      accessibleNameCheck('heading'),
      accessibilityCheck(
        'a11y.heading-order',
        'heading',
        'automated',
        'The Hero heading must fit the page heading hierarchy.',
        'Use one page-level H1 and keep subsequent heading levels logical.',
        ['heading'],
      ),
    ],
    usage: 'Use once near the start of a landing page.',
    accessibility: 'Keep the heading concise and ensure optional media has suitable alternative text.',
  }),
  visualComponentEntry({
    id: 'base.card',
    name: 'Card',
    description: 'A contained summary with optional media and action.',
    category: 'Editorial',
    icon: 'layout-solid',
    componentId: CARD.id,
    tags: ['card', 'teaser', 'summary', 'content'],
    fields: [
      { key: 'image', label: 'Image', type: 'image', required: false },
      { key: 'eyebrow', label: 'Eyebrow', type: 'text', required: false },
      { key: 'title', label: 'Title', type: 'text', required: true },
      { key: 'description', label: 'Description', type: 'rich-text', required: false },
      { key: 'href', label: 'Destination', type: 'url', required: false },
      { key: 'actionLabel', label: 'Action label', type: 'text', required: false },
    ],
    variants: [
      { id: 'vertical', name: 'Vertical', values: { variant: 'vertical' } },
      { id: 'horizontal', name: 'Horizontal', values: { variant: 'horizontal' } },
      { id: 'compact', name: 'Compact', values: { variant: 'compact' } },
      { id: 'featured', name: 'Featured', values: { variant: 'featured' } },
    ],
    slots: [actionSlot],
    accessibilityChecks: [accessibleNameCheck('title')],
    usage: 'Summarise one destination or record. Use Card Grid for repeated cards.',
    accessibility: 'Use a specific title and avoid duplicating competing links to the same destination.',
  }),
  visualComponentEntry({
    id: 'base.teaser',
    name: 'Teaser',
    description: 'A promotional Card preset that reuses the Card definition.',
    category: 'Editorial',
    icon: 'layout-solid',
    componentId: CARD.id,
    tags: ['teaser', 'campaign', 'article', 'promotion'],
    fields: [
      { key: 'image', label: 'Image', type: 'image', required: false },
      { key: 'eyebrow', label: 'Pre-title', type: 'text', required: false },
      { key: 'title', label: 'Title', type: 'text', required: true },
      { key: 'description', label: 'Description', type: 'rich-text', required: false },
      { key: 'href', label: 'Destination', type: 'url', required: true },
      { key: 'actionLabel', label: 'Action label', type: 'text', required: false },
    ],
    variants: [
      { id: 'banner', name: 'Banner', values: { variant: 'horizontal' } },
      { id: 'card', name: 'Card', values: { variant: 'vertical' } },
      { id: 'article', name: 'Article', values: { variant: 'compact' } },
      { id: 'campaign', name: 'Campaign', values: { variant: 'featured' } },
    ],
    accessibilityChecks: [accessibleNameCheck('title')],
    usage: 'Promote another page or resource with the shared Card implementation.',
    accessibility: 'Use a title and action that identify the destination.',
  }),
  visualComponentEntry({
    id: 'base.navigation',
    name: 'Navigation',
    description: 'A labelled navigation region with governed link content.',
    category: 'Navigation',
    icon: 'link',
    componentId: NAVIGATION.id,
    tags: ['navigation', 'menu', 'links', 'site'],
    fields: [
      { key: 'label', label: 'Accessible label', type: 'text', required: true },
    ],
    variants: [
      { id: 'horizontal', name: 'Horizontal', values: { orientation: 'horizontal' } },
      { id: 'vertical', name: 'Vertical', values: { orientation: 'vertical' } },
    ],
    slots: [{
      id: 'items',
      name: 'Navigation items',
      description: 'Links and approved supplementary actions.',
      allowedEntryIds: ['base.link', 'base.button'],
      minItems: 1,
    }],
    accessibilityChecks: [accessibleNameCheck('label')],
    usage: 'Use a distinct label when more than one navigation region appears on the page.',
    accessibility: 'Keep link text descriptive and identify the current page where applicable.',
  }),
  visualComponentEntry({
    id: 'base.notice',
    name: 'Notice / Callout',
    description: 'Highlights important information with an approved semantic type.',
    category: 'Editorial',
    icon: 'warning-diamond-solid',
    componentId: NOTICE.id,
    tags: ['notice', 'callout', 'alert', 'message'],
    fields: [
      { key: 'title', label: 'Title', type: 'text', required: true },
      { key: 'body', label: 'Body', type: 'rich-text', required: false },
    ],
    variants: [
      { id: 'information', name: 'Information', values: { variant: 'information' } },
      { id: 'success', name: 'Success', values: { variant: 'success' } },
      { id: 'warning', name: 'Warning', values: { variant: 'warning' } },
      { id: 'error', name: 'Error', values: { variant: 'error' } },
    ],
    slots: [actionSlot],
    accessibilityChecks: [accessibleNameCheck('title')],
    usage: 'Use for information that should stand apart from the surrounding flow.',
    accessibility: 'Do not rely on colour alone to communicate the notice type.',
  }),
  visualComponentEntry({
    id: 'base.reusable-section',
    name: 'Reusable Section',
    description: 'A centrally defined section frame with governed content.',
    category: 'Structure',
    icon: 'container-solid',
    componentId: REUSABLE_SECTION.id,
    tags: ['reusable', 'section', 'shared', 'layout'],
    fields: [
      { key: 'label', label: 'Accessible label', type: 'text', required: false },
    ],
    slots: [{
      id: 'content',
      name: 'Content',
      description: 'Approved content for the reusable section.',
      minItems: 0,
    }],
    usage: 'Provide shared structure while allowing explicitly governed slot content.',
    accessibility: 'Name the section when its purpose is not clear from a visible heading.',
  }),
  visualComponentEntry({
    id: 'base.download',
    name: 'Download',
    description: 'A described link to a downloadable site asset.',
    category: 'Editorial',
    icon: 'file-text-solid',
    componentId: DOWNLOAD.id,
    tags: ['download', 'file', 'asset', 'document'],
    fields: [
      { key: 'title', label: 'Title', type: 'text', required: true },
      { key: 'description', label: 'Description', type: 'text', required: false },
      { key: 'href', label: 'File', type: 'url', required: true },
      { key: 'label', label: 'Link label', type: 'text', required: true },
    ],
    accessibilityChecks: [accessibleNameCheck('title')],
    usage: 'Describe the file and its purpose before the download link.',
    accessibility: 'Include file type and size in the description when that affects the decision to download.',
  }),
  visualComponentEntry({
    id: 'base.progress-bar',
    name: 'Progress Bar',
    description: 'A labelled native progress indicator.',
    category: 'Content',
    icon: 'chart-solid',
    componentId: PROGRESS.id,
    tags: ['progress', 'completion', 'status', 'measurement'],
    fields: [
      { key: 'value', label: 'Value', type: 'number', required: true },
      { key: 'maximum', label: 'Maximum', type: 'number', required: true },
      { key: 'label', label: 'Label', type: 'text', required: true },
      { key: 'showValue', label: 'Show percentage', type: 'boolean', required: false },
    ],
    accessibilityChecks: [accessibleNameCheck('label')],
    usage: 'Use for measurable progress with a meaningful current value and maximum.',
    accessibility: 'Provide a label that explains what is progressing.',
  }),
]
