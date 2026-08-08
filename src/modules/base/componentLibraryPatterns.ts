import {
  componentLibraryPatternRegistry,
  type ComponentLibraryEntry,
  type ComponentLibraryPatternDefinition,
  type ComponentLibraryPatternNode,
} from '@core/component-library'
import { creatorSignalCatalogueEntryId } from '@core/page-tree'
import { AccordionItemModule, AccordionModule } from './disclosure'
import { ComponentFrameModule } from './componentFrame'
import { ContainerModule } from './container'
import { ImageModule } from './image'
import { LinkModule } from './link'
import { ListModule } from './list'
import { LoopModule } from './loop'
import { SlotInstanceModule } from './slotInstance'
import { TableModule } from './table'
import { TextModule } from './text'
import { VisualComponentRefModule } from './visualComponentRef'
import {
  behaviorCheck,
  patternEntry,
} from './componentLibraryDefinitions'

function metadata(entryId: string) {
  return {
    entryId: creatorSignalCatalogueEntryId(entryId),
    entryVersion: '1.0.0',
  }
}

function patternNode(
  key: string,
  moduleId: string,
  defaults: Record<string, unknown>,
  props: Record<string, unknown> = {},
  children: string[] = [],
  entryId?: string,
): ComponentLibraryPatternNode {
  return {
    key,
    moduleId,
    props: { ...defaults, ...props },
    children,
    ...(entryId ? { catalogueInstance: metadata(entryId) } : {}),
  }
}

function definition(
  id: string,
  nodes: ComponentLibraryPatternNode[],
  authorableNodeKeys: string[],
  rootKey = 'root',
): ComponentLibraryPatternDefinition {
  return { id, rootKey, nodes, authorableNodeKeys }
}

function cardNodes(key: string, title: string): ComponentLibraryPatternNode[] {
  return [
    patternNode(
      key,
      VisualComponentRefModule.id,
      VisualComponentRefModule.defaults,
      {
        componentId: 'base.vc.card',
        propOverrides: {
          title,
          description: '<p>Add a concise description.</p>',
        },
      },
      [`${key}.actions`],
      'base.card',
    ),
    patternNode(
      `${key}.actions`,
      SlotInstanceModule.id,
      SlotInstanceModule.defaults,
      { slotName: 'actions' },
    ),
  ]
}

function imageNodes(key: string): ComponentLibraryPatternNode[] {
  return [
    patternNode(key, ImageModule.id, ImageModule.defaults, {}, [], 'base.image'),
  ]
}

function textNode(
  key: string,
  text: string,
  tag: 'p' | 'h2' | 'h3' = 'p',
): ComponentLibraryPatternNode {
  return patternNode(
    key,
    TextModule.id,
    TextModule.defaults,
    { text, tag },
    [],
    tag === 'p' ? 'base.plain-text' : 'base.heading',
  )
}

const GRID = definition(
  'base.pattern.grid',
  [
    patternNode(
      'root',
      ComponentFrameModule.id,
      ComponentFrameModule.defaults,
      { kind: 'grid', variant: 'two-columns', tag: 'section' },
      ['column-1', 'column-2'],
    ),
    patternNode('column-1', ContainerModule.id, ContainerModule.defaults, {}, [], 'base.container'),
    patternNode('column-2', ContainerModule.id, ContainerModule.defaults, {}, [], 'base.container'),
  ],
  ['column-1', 'column-2'],
)

const CARD_GRID = definition(
  'base.pattern.card-grid',
  [
    patternNode(
      'root',
      ComponentFrameModule.id,
      ComponentFrameModule.defaults,
      { kind: 'card-grid', variant: 'three-columns', tag: 'section' },
      ['items'],
    ),
    patternNode(
      'items',
      ContainerModule.id,
      ContainerModule.defaults,
      {},
      ['card-1', 'card-2', 'card-3'],
      'base.container',
    ),
    ...cardNodes('card-1', 'First card'),
    ...cardNodes('card-2', 'Second card'),
    ...cardNodes('card-3', 'Third card'),
  ],
  ['items'],
)

const GALLERY = definition(
  'base.pattern.gallery',
  [
    patternNode(
      'root',
      ComponentFrameModule.id,
      ComponentFrameModule.defaults,
      { kind: 'gallery', variant: 'three-columns', tag: 'section', label: 'Image gallery' },
      ['items'],
    ),
    patternNode(
      'items',
      ContainerModule.id,
      ContainerModule.defaults,
      {},
      ['image-1', 'image-2', 'image-3'],
      'base.container',
    ),
    ...imageNodes('image-1'),
    ...imageNodes('image-2'),
    ...imageNodes('image-3'),
  ],
  ['items'],
)

const ICON_LIST = definition(
  'base.pattern.icon-list',
  [
    patternNode(
      'root',
      ComponentFrameModule.id,
      ComponentFrameModule.defaults,
      { kind: 'icon-list', tag: 'section' },
      ['items'],
    ),
    patternNode(
      'items',
      ListModule.id,
      ListModule.defaults,
      { items: 'First supported item\nSecond supported item\nThird supported item' },
      [],
      'base.semantic-list',
    ),
  ],
  ['items'],
)

const STATISTICS = definition(
  'base.pattern.statistics',
  [
    patternNode(
      'root',
      ComponentFrameModule.id,
      ComponentFrameModule.defaults,
      { kind: 'statistics', variant: 'three-columns', tag: 'section', label: 'Key statistics' },
      ['stat-1', 'stat-2', 'stat-3'],
    ),
    patternNode('stat-1', ContainerModule.id, ContainerModule.defaults, {}, ['stat-1-value', 'stat-1-label'], 'base.container'),
    textNode('stat-1-value', '100%', 'h3'),
    textNode('stat-1-label', 'First measurement'),
    patternNode('stat-2', ContainerModule.id, ContainerModule.defaults, {}, ['stat-2-value', 'stat-2-label'], 'base.container'),
    textNode('stat-2-value', '24/7', 'h3'),
    textNode('stat-2-label', 'Second measurement'),
    patternNode('stat-3', ContainerModule.id, ContainerModule.defaults, {}, ['stat-3-value', 'stat-3-label'], 'base.container'),
    textNode('stat-3-value', '1M+', 'h3'),
    textNode('stat-3-label', 'Third measurement'),
  ],
  [
    'stat-1',
    'stat-2',
    'stat-3',
  ],
)

const LOGO_CLOUD = definition(
  'base.pattern.logo-cloud',
  [
    patternNode(
      'root',
      ComponentFrameModule.id,
      ComponentFrameModule.defaults,
      { kind: 'logo-cloud', variant: 'three-columns', tag: 'section', label: 'Partner logos' },
      ['items'],
    ),
    patternNode(
      'items',
      ContainerModule.id,
      ContainerModule.defaults,
      {},
      ['logo-1', 'logo-2', 'logo-3'],
      'base.container',
    ),
    ...imageNodes('logo-1'),
    ...imageNodes('logo-2'),
    ...imageNodes('logo-3'),
  ],
  ['items'],
)

const TIMELINE = definition(
  'base.pattern.timeline',
  [
    patternNode(
      'root',
      ComponentFrameModule.id,
      ComponentFrameModule.defaults,
      { kind: 'timeline', tag: 'section', label: 'Timeline' },
      ['items'],
    ),
    patternNode(
      'items',
      ListModule.id,
      ListModule.defaults,
      {
        listType: 'ordered',
        items: 'First milestone — add its date and description\nSecond milestone — add its date and description\nThird milestone — add its date and description',
      },
      [],
      'base.semantic-list',
    ),
  ],
  ['items'],
)

const STEPS = definition(
  'base.pattern.steps',
  [
    patternNode(
      'root',
      ComponentFrameModule.id,
      ComponentFrameModule.defaults,
      { kind: 'steps', tag: 'section', label: 'Steps' },
      ['items'],
    ),
    patternNode(
      'items',
      ListModule.id,
      ListModule.defaults,
      {
        listType: 'ordered',
        items: 'Complete the first step\nComplete the second step\nComplete the third step',
      },
      [],
      'base.semantic-list',
    ),
  ],
  ['items'],
)

const COMPARISON_TABLE = definition(
  'base.pattern.comparison-table',
  [
    patternNode(
      'root',
      ComponentFrameModule.id,
      ComponentFrameModule.defaults,
      { kind: 'comparison-table', tag: 'section' },
      ['table'],
    ),
    patternNode(
      'table',
      TableModule.id,
      TableModule.defaults,
      {
        caption: 'Feature comparison',
        columns: 'Feature | Option A | Option B',
        rows: 'First feature | Included | Included\nSecond feature | Included | Not included',
        firstColumnHeader: true,
      },
      [],
    ),
  ],
  ['table'],
)

const FAQ = definition(
  'base.pattern.faq',
  [
    patternNode(
      'root',
      ComponentFrameModule.id,
      ComponentFrameModule.defaults,
      { kind: 'faq', tag: 'section' },
      ['accordion'],
    ),
    patternNode(
      'accordion',
      AccordionModule.id,
      AccordionModule.defaults,
      { label: 'Frequently asked questions' },
      ['question-1', 'question-2'],
    ),
    patternNode(
      'question-1',
      AccordionItemModule.id,
      AccordionItemModule.defaults,
      { title: 'First question' },
      [],
      'base.accordion-item',
    ),
    patternNode(
      'question-2',
      AccordionItemModule.id,
      AccordionItemModule.defaults,
      { title: 'Second question' },
      [],
      'base.accordion-item',
    ),
  ],
  ['accordion'],
)

const EMPTY_STATE = definition(
  'base.pattern.empty-state',
  [
    patternNode(
      'root',
      ComponentFrameModule.id,
      ComponentFrameModule.defaults,
      { kind: 'empty-state', tag: 'section', label: 'Empty state' },
      ['title', 'message', 'action'],
    ),
    textNode('title', 'Nothing here yet', 'h2'),
    textNode('message', 'Explain why this area is empty and what to do next.'),
    patternNode(
      'action',
      LinkModule.id,
      LinkModule.defaults,
      { text: 'Return to the previous page', href: '/' },
      [],
      'base.link',
    ),
  ],
  ['title', 'message', 'action'],
)

const LIST = definition(
  'base.pattern.list',
  [
    patternNode(
      'root',
      LoopModule.id,
      LoopModule.defaults,
      {
        sourceMode: 'manual',
        sourceId: '',
        manualItems: [{ id: 'item-1', fields: {} }],
        itemRenderer: 'children',
        pagination: 'none',
        pageSize: 10,
        limit: 10,
        tag: 'div',
      },
      ['item'],
    ),
    patternNode(
      'item',
      ContainerModule.id,
      ContainerModule.defaults,
      { tag: 'article' },
      [],
      'base.container',
    ),
  ],
  ['item'],
)

export const BUILT_IN_COMPONENT_LIBRARY_PATTERNS:
readonly ComponentLibraryPatternDefinition[] = [
  GRID,
  CARD_GRID,
  GALLERY,
  ICON_LIST,
  STATISTICS,
  LOGO_CLOUD,
  TIMELINE,
  STEPS,
  COMPARISON_TABLE,
  FAQ,
  EMPTY_STATE,
  LIST,
]

for (const pattern of BUILT_IN_COMPONENT_LIBRARY_PATTERNS) {
  componentLibraryPatternRegistry.registerOrReplace(pattern)
}

export const BUILT_IN_PATTERN_COMPONENT_LIBRARY_ENTRIES:
readonly ComponentLibraryEntry[] = [
  patternEntry({
    id: 'base.list',
    name: 'List',
    description: 'A static or generated collection using one governed item template.',
    category: 'Editorial',
    icon: 'list-box',
    patternId: LIST.id,
    tags: ['list', 'collection', 'loop', 'pages', 'records'],
    fields: [
      { key: 'sourceMode', label: 'Source mode', type: 'select', required: true },
      { key: 'sourceId', label: 'Content source', type: 'select', required: false },
      { key: 'query', label: 'Query', type: 'text', required: false },
      { key: 'orderBy', label: 'Sort by', type: 'select', required: false },
      { key: 'direction', label: 'Direction', type: 'select', required: true },
      { key: 'limit', label: 'Limit', type: 'number', required: true },
      { key: 'pagination', label: 'Pagination', type: 'select', required: true },
      { key: 'pageSize', label: 'Page size', type: 'number', required: true },
    ],
    allowedChildEntryIds: [
      'base.card',
      'base.teaser',
      'base.link',
      'base.plain-text',
      'base.rich-text',
    ],
    usage: 'Choose manual items or a registered loop source and author one governed item template.',
    accessibility: 'Retain meaningful item semantics, source order and the shared collection status.',
  }),
  patternEntry({
    id: 'base.grid',
    name: 'Columns / Grid',
    description: 'A responsive two-column authored layout.',
    category: 'Structure',
    icon: 'layout-columns',
    patternId: GRID.id,
    tags: ['columns', 'grid', 'layout', 'responsive'],
    usage: 'Place governed content inside each declared column region.',
    accessibility: 'Keep reading order meaningful when columns stack on narrow screens.',
  }),
  patternEntry({
    id: 'base.card-grid',
    name: 'Card Grid',
    description: 'A responsive collection composed from the shared Card definition.',
    category: 'Editorial',
    icon: 'layout-solid',
    patternId: CARD_GRID.id,
    tags: ['cards', 'grid', 'collection', 'teasers'],
    allowedChildEntryIds: ['base.card', 'base.teaser'],
    usage: 'Use for a short manual collection of comparable destinations.',
    accessibility: 'Keep card headings and action labels specific; document order remains the reading order.',
  }),
  patternEntry({
    id: 'base.gallery',
    name: 'Gallery',
    description: 'An ordered responsive collection of governed images.',
    category: 'Media',
    icon: 'images-solid',
    patternId: GALLERY.id,
    tags: ['gallery', 'images', 'collection', 'media'],
    allowedChildEntryIds: ['base.image'],
    accessibilityChecks: [
      behaviorCheck(
        'a11y.image-alternative',
        'media',
        'Every gallery image needs contextual alternative treatment.',
        'Review each Media Library alternative before publication.',
      ),
    ],
    usage: 'Use for related images whose order and captions carry meaning.',
    accessibility: 'Review every image alternative and preserve a meaningful document order.',
  }),
  patternEntry({
    id: 'base.icon-list',
    name: 'Icon List',
    description: 'A concise repeated list ready for approved icon decoration.',
    category: 'Design',
    icon: 'list-box-solid',
    patternId: ICON_LIST.id,
    tags: ['icon', 'list', 'features', 'benefits'],
    usage: 'Use the shared semantic List; apply approved decorative icons through the design system.',
    accessibility: 'Keep the textual item meaningful without relying on the decorative icon.',
  }),
  patternEntry({
    id: 'base.statistics',
    name: 'Statistics',
    description: 'A responsive group of key measurements.',
    category: 'Design',
    icon: 'chart-solid',
    patternId: STATISTICS.id,
    tags: ['statistics', 'metrics', 'numbers', 'measurements'],
    usage: 'Use for a small set of comparable, well-sourced measurements.',
    accessibility: 'Include units and enough context for each value to make sense independently.',
  }),
  patternEntry({
    id: 'base.logo-cloud',
    name: 'Logo Cloud',
    description: 'A governed group of partner or organisation logos.',
    category: 'Design',
    icon: 'images-solid',
    patternId: LOGO_CLOUD.id,
    tags: ['logos', 'partners', 'organisations', 'trust'],
    usage: 'Use for a curated set of organisations with consistent image treatment.',
    accessibility: 'Give linked logos an organisation name and mark purely decorative logos appropriately.',
  }),
  patternEntry({
    id: 'base.timeline',
    name: 'Timeline',
    description: 'A semantic ordered sequence of dated milestones.',
    category: 'Design',
    icon: 'list-box-solid',
    patternId: TIMELINE.id,
    tags: ['timeline', 'history', 'events', 'dates'],
    usage: 'Use when chronology is essential to understanding the events.',
    accessibility: 'Include dates in text and retain chronological DOM order.',
  }),
  patternEntry({
    id: 'base.steps',
    name: 'Steps',
    description: 'A semantic ordered sequence of actions.',
    category: 'Design',
    icon: 'list-box-solid',
    patternId: STEPS.id,
    tags: ['steps', 'process', 'instructions', 'sequence'],
    usage: 'Use for instructions whose sequence is meaningful.',
    accessibility: 'Use concise action-led text and keep the required order explicit.',
  }),
  patternEntry({
    id: 'base.comparison-table',
    name: 'Comparison Table',
    description: 'A captioned table comparing any set of options or features.',
    category: 'Design',
    icon: 'list-box-solid',
    patternId: COMPARISON_TABLE.id,
    tags: ['comparison', 'table', 'features', 'options'],
    usage: 'Use for genuine row-and-column comparison, including but not limited to pricing.',
    accessibility: 'Provide a specific caption and preserve row and column header associations.',
  }),
  patternEntry({
    id: 'base.faq-list',
    name: 'FAQ List',
    description: 'Frequently asked questions composed from native Accordion items.',
    category: 'Design',
    icon: 'list-box-solid',
    patternId: FAQ.id,
    tags: ['faq', 'questions', 'answers', 'accordion'],
    usage: 'Use for genuinely frequent questions; keep answers useful when read directly.',
    accessibility: 'Uses native details and summary controls and remains operable without JavaScript.',
  }),
  patternEntry({
    id: 'base.empty-state',
    name: 'Empty State',
    description: 'Explains an empty collection or unavailable result with a next action.',
    category: 'Design',
    icon: 'layout-solid',
    patternId: EMPTY_STATE.id,
    tags: ['empty', 'no results', 'unavailable', 'fallback'],
    usage: 'Explain why content is absent and offer the most useful next action.',
    accessibility: 'Do not rely on illustration alone; keep the message and next action explicit.',
  }),
]
