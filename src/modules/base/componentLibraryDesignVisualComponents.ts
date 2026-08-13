import type { ComponentLibraryEntry } from '@core/component-library'
import {
  builtInVisualComponentRegistry,
  type VisualComponent,
} from '@core/visual-components-schema'
import { ComponentFrameModule } from './componentFrame'
import { ImageModule } from './image'
import { LinkCollectionModule } from './linkCollection'
import { RichTextModule } from './richText'
import { TextModule } from './text'
import {
  accessibleNameCheck,
  behaviorCheck,
  visualComponentEntry,
} from './componentLibraryDefinitions'
import { linkRepeaterField } from './componentLibraryRepeaters'
import {
  visualComponent,
  visualNode,
  visualParam,
} from './visualComponentDefinitionHelpers'

const BADGE = visualComponent(
  'base.vc.badge',
  'Badge',
  'badge.root',
  [
    visualParam('text', 'Text', 'string', 'New', { required: true }),
    visualParam('variant', 'Type', 'enum', 'neutral', {
      enumOptions: ['neutral', 'information', 'success', 'warning', 'error'],
    }),
  ],
  [
    visualNode(
      'badge.root',
      ComponentFrameModule.id,
      ComponentFrameModule.defaults,
      { kind: 'badge', tag: 'span' },
      ['badge.text'],
      { variant: { paramId: 'variant' } },
    ),
    visualNode(
      'badge.text',
      TextModule.id,
      TextModule.defaults,
      { tag: 'none' },
      [],
      { text: { paramId: 'text' } },
    ),
  ],
)

const QUOTE = visualComponent(
  'base.vc.quote',
  'Quote / Testimonial',
  'quote.root',
  [
    visualParam(
      'quote',
      'Quotation',
      'richText',
      '<blockquote><p>Add the quotation.</p></blockquote>',
      { required: true },
    ),
    visualParam('citation', 'Citation', 'string', 'Person or source', {
      required: true,
    }),
    visualParam('variant', 'Style', 'enum', 'quote', {
      enumOptions: ['quote', 'testimonial'],
    }),
  ],
  [
    visualNode(
      'quote.root',
      ComponentFrameModule.id,
      ComponentFrameModule.defaults,
      { kind: 'quote', tag: 'figure' },
      ['quote.content', 'quote.citation'],
      { variant: { paramId: 'variant' } },
    ),
    visualNode(
      'quote.content',
      RichTextModule.id,
      RichTextModule.defaults,
      {},
      [],
      { html: { paramId: 'quote' } },
    ),
    visualNode(
      'quote.citation',
      TextModule.id,
      TextModule.defaults,
      { tag: 'figcaption' },
      [],
      { text: { paramId: 'citation' } },
    ),
  ],
)

const PERSON_PROFILE = visualComponent(
  'base.vc.person-profile',
  'Person Profile',
  'profile.root',
  [
    visualParam('image', 'Portrait', 'image', ''),
    visualParam('name', 'Name', 'string', 'Person name', { required: true }),
    visualParam('role', 'Role', 'string', ''),
    visualParam('biography', 'Biography', 'richText', '<p>Add a short biography.</p>'),
    visualParam('variant', 'Layout', 'enum', 'vertical', {
      enumOptions: ['vertical', 'horizontal', 'compact'],
    }),
    visualParam('links', 'Profile links', 'repeater', []),
  ],
  [
    visualNode(
      'profile.root',
      ComponentFrameModule.id,
      ComponentFrameModule.defaults,
      { kind: 'person-profile', tag: 'article' },
      [
        'profile.image',
        'profile.name',
        'profile.role',
        'profile.biography',
        'profile.links',
      ],
      { variant: { paramId: 'variant' } },
    ),
    visualNode(
      'profile.image',
      ImageModule.id,
      ImageModule.defaults,
      {},
      [],
      { src: { paramId: 'image' } },
    ),
    visualNode(
      'profile.name',
      TextModule.id,
      TextModule.defaults,
      { tag: 'h2' },
      [],
      { text: { paramId: 'name' } },
    ),
    visualNode(
      'profile.role',
      TextModule.id,
      TextModule.defaults,
      { tag: 'p' },
      [],
      { text: { paramId: 'role' } },
    ),
    visualNode(
      'profile.biography',
      RichTextModule.id,
      RichTextModule.defaults,
      {},
      [],
      { html: { paramId: 'biography' } },
    ),
    visualNode('profile.links', LinkCollectionModule.id, LinkCollectionModule.defaults, {
      presentation: 'profile',
    }, [], { items: { paramId: 'links' } }),
  ],
)

const BREADCRUMB = visualComponent(
  'base.vc.breadcrumb',
  'Breadcrumb',
  'breadcrumb.root',
  [
    visualParam('label', 'Accessible label', 'string', 'Breadcrumb', {
      required: true,
    }),
    visualParam('items', 'Breadcrumb items', 'repeater', []),
  ],
  [
    visualNode(
      'breadcrumb.root',
      ComponentFrameModule.id,
      ComponentFrameModule.defaults,
      { kind: 'breadcrumb', tag: 'nav' },
      ['breadcrumb.list'],
      { label: { paramId: 'label' } },
    ),
    visualNode('breadcrumb.list', LinkCollectionModule.id, LinkCollectionModule.defaults, {
      presentation: 'breadcrumb',
    }, [], { items: { paramId: 'items' } }),
  ],
)

const TABLE_OF_CONTENTS = visualComponent(
  'base.vc.table-of-contents',
  'Table of Contents',
  'toc.root',
  [
    visualParam('label', 'Accessible label', 'string', 'On this page', {
      required: true,
    }),
    visualParam('heading', 'Heading', 'string', 'On this page', {
      required: true,
    }),
    visualParam('items', 'Section links', 'repeater', []),
  ],
  [
    visualNode(
      'toc.root',
      ComponentFrameModule.id,
      ComponentFrameModule.defaults,
      { kind: 'table-of-contents', tag: 'nav' },
      ['toc.heading', 'toc.list'],
      { label: { paramId: 'label' } },
    ),
    visualNode(
      'toc.heading',
      TextModule.id,
      TextModule.defaults,
      { tag: 'h2' },
      [],
      { text: { paramId: 'heading' } },
    ),
    visualNode('toc.list', LinkCollectionModule.id, LinkCollectionModule.defaults, {
      presentation: 'table-of-contents',
    }, [], { items: { paramId: 'items' } }),
  ],
)

export const BUILT_IN_DESIGN_VISUAL_COMPONENTS:
readonly VisualComponent[] = [
  BADGE,
  QUOTE,
  PERSON_PROFILE,
  BREADCRUMB,
  TABLE_OF_CONTENTS,
]

for (const definition of BUILT_IN_DESIGN_VISUAL_COMPONENTS) {
  builtInVisualComponentRegistry.registerOrReplace(definition)
}

export const BUILT_IN_DESIGN_COMPONENT_LIBRARY_ENTRIES:
readonly ComponentLibraryEntry[] = [
  visualComponentEntry({
    id: 'base.badge',
    name: 'Badge',
    description: 'A short status or category label using approved semantic variants.',
    category: 'Design',
    icon: 'star-solid',
    componentId: BADGE.id,
    tags: ['badge', 'label', 'status', 'tag'],
    fields: [
      { key: 'text', label: 'Text', type: 'text', required: true },
    ],
    variants: [
      { id: 'neutral', name: 'Neutral', values: { variant: 'neutral' } },
      { id: 'information', name: 'Information', values: { variant: 'information' } },
      { id: 'success', name: 'Success', values: { variant: 'success' } },
      { id: 'warning', name: 'Warning', values: { variant: 'warning' } },
      { id: 'error', name: 'Error', values: { variant: 'error' } },
    ],
    accessibilityChecks: [accessibleNameCheck('text')],
    usage: 'Use for short metadata or status, not as the only explanation of a state.',
    accessibility: 'The text, not colour, communicates the badge meaning.',
  }),
  visualComponentEntry({
    id: 'base.quote',
    name: 'Quote / Testimonial',
    description: 'A quotation with a required visible citation.',
    category: 'Editorial',
    icon: 'text-start-t',
    componentId: QUOTE.id,
    tags: ['quote', 'testimonial', 'citation', 'review'],
    fields: [
      { key: 'quote', label: 'Quotation', type: 'rich-text', required: true },
      { key: 'citation', label: 'Citation', type: 'text', required: true },
    ],
    variants: [
      { id: 'quote', name: 'Quote', values: { variant: 'quote' } },
      { id: 'testimonial', name: 'Testimonial', values: { variant: 'testimonial' } },
    ],
    accessibilityChecks: [accessibleNameCheck('citation')],
    usage: 'Use for attributed words; keep the source accurate and specific.',
    accessibility: 'Keep quotation semantics in the rich-text content and identify its source.',
  }),
  visualComponentEntry({
    id: 'base.person-profile',
    version: '2.0.0',
    name: 'Person Profile',
    description: 'A named person with portrait, role, biography and governed links.',
    category: 'Editorial',
    icon: 'users-solid',
    componentId: PERSON_PROFILE.id,
    tags: ['person', 'profile', 'author', 'team'],
    fields: [
      { key: 'image', label: 'Portrait', type: 'image', required: false },
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'role', label: 'Role', type: 'text', required: false },
      { key: 'biography', label: 'Biography', type: 'rich-text', required: false },
      linkRepeaterField({
        key: 'links',
        label: 'Profile links',
        itemLabel: 'Profile link',
        description: 'Ordered links associated with this person.',
        maxItems: 5,
      }),
    ],
    variants: [
      { id: 'vertical', name: 'Vertical', values: { variant: 'vertical' } },
      { id: 'horizontal', name: 'Horizontal', values: { variant: 'horizontal' } },
      { id: 'compact', name: 'Compact', values: { variant: 'compact' } },
    ],
    accessibilityChecks: [accessibleNameCheck('name')],
    usage: 'Use for a real person whose role or biography is relevant to the page.',
    accessibility: 'Use an informative portrait alternative in the media library, or leave it decorative.',
  }),
  visualComponentEntry({
    id: 'base.breadcrumb',
    version: '2.0.0',
    name: 'Breadcrumb',
    description: 'An ordered navigation trail for the current page hierarchy.',
    category: 'Navigation',
    icon: 'link',
    componentId: BREADCRUMB.id,
    tags: ['breadcrumb', 'navigation', 'hierarchy', 'trail'],
    fields: [
      { key: 'label', label: 'Accessible label', type: 'text', required: true },
      linkRepeaterField({
        description: 'Ordered links from the broadest page to the current page.',
        minItems: 1,
        current: true,
        itemLabel: 'Breadcrumb link',
      }),
    ],
    accessibilityChecks: [
      accessibleNameCheck('label'),
      behaviorCheck(
        'a11y.keyboard-contract',
        'keyboard',
        'Breadcrumb links use native anchor navigation and visible focus.',
        'Name every hierarchy level and mark the current destination in its link attributes.',
      ),
    ],
    usage: 'Place near the page start and order links from broadest to current context.',
    accessibility: 'Use a distinct navigation label and identify the current page with aria-current.',
  }),
  visualComponentEntry({
    id: 'base.table-of-contents',
    version: '2.0.0',
    name: 'Table of Contents',
    description: 'A labelled set of links to headings on the current page.',
    category: 'Navigation',
    icon: 'list-box-solid',
    componentId: TABLE_OF_CONTENTS.id,
    tags: ['table of contents', 'on this page', 'anchors', 'navigation'],
    fields: [
      { key: 'label', label: 'Accessible label', type: 'text', required: true },
      { key: 'heading', label: 'Visible heading', type: 'text', required: true },
      linkRepeaterField({
        description: 'Ordered fragment links to headings on this page.',
        minItems: 1,
        itemLabel: 'Section link',
      }),
    ],
    accessibilityChecks: [
      accessibleNameCheck('label'),
      behaviorCheck(
        'a11y.keyboard-contract',
        'keyboard',
        'Section links use native anchor navigation and visible focus.',
        'Keep each destination ID stable and each link text aligned with its heading.',
      ),
    ],
    usage: 'Use on long pages whose major sections have stable fragment identifiers.',
    accessibility: 'Link text should match or clearly identify the destination heading.',
  }),
]
