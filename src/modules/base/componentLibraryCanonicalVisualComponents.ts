import type { ComponentLibraryEntry } from '@core/component-library'
import {
  builtInVisualComponentRegistry,
  type VisualComponent,
} from '@core/visual-components-schema'
import {
  AccordionModule,
  TabsModule,
} from './disclosure'
import { IconModule } from './icon'
import { MediaDisplayModule } from './mediaDisplay'
import { PdfViewerModule } from './pdfViewer'
import { SlotOutletModule } from './slotOutlet'
import { TableModule } from './table'
import {
  accessibleNameCheck,
  behaviorCheck,
  visualComponentEntry,
} from './componentLibraryDefinitions'
import {
  visualComponent,
  visualNode,
  visualParam,
} from './visualComponentDefinitionHelpers'

const TABLE = visualComponent(
  'base.vc.table',
  'Table',
  'table.root',
  [
    visualParam('caption', 'Caption', 'string', 'Table caption', { required: true }),
    visualParam('columns', 'Column headings', 'string', 'Column 1 | Column 2', { required: true }),
    visualParam('rows', 'Rows', 'string', 'Value 1 | Value 2', { required: true }),
    visualParam('firstColumnHeader', 'First column contains row headings', 'boolean', false),
  ],
  [
    visualNode(
      'table.root',
      TableModule.id,
      TableModule.defaults,
      {},
      [],
      {
        caption: { paramId: 'caption' },
        columns: { paramId: 'columns' },
        rows: { paramId: 'rows' },
        firstColumnHeader: { paramId: 'firstColumnHeader' },
      },
    ),
  ],
)

const ICON = visualComponent(
  'base.vc.icon',
  'Icon',
  'icon.root',
  [
    visualParam('name', 'Icon', 'enum', 'information', {
      required: true,
      enumOptions: ['information', 'check', 'warning', 'error', 'star', 'person'],
    }),
    visualParam('label', 'Accessible label', 'string', ''),
    visualParam('decorative', 'Decorative', 'boolean', true),
    visualParam('size', 'Size', 'enum', 'medium', {
      enumOptions: ['small', 'medium', 'large'],
    }),
  ],
  [
    visualNode(
      'icon.root',
      IconModule.id,
      IconModule.defaults,
      {},
      [],
      {
        name: { paramId: 'name' },
        label: { paramId: 'label' },
        decorative: { paramId: 'decorative' },
        size: { paramId: 'size' },
      },
    ),
  ],
)

const PDF_VIEWER = visualComponent(
  'base.vc.pdf-viewer',
  'PDF Viewer',
  'pdf.root',
  [
    visualParam('source', 'PDF file', 'url', '', { required: true }),
    visualParam('title', 'Document title', 'string', 'PDF document', { required: true }),
    visualParam(
      'fallbackText',
      'Fallback message',
      'string',
      'Your browser cannot display this PDF.',
      { required: true },
    ),
    visualParam('downloadLabel', 'Download link label', 'string', 'Download PDF', {
      required: true,
    }),
    visualParam('height', 'Viewer height', 'enum', 'standard', {
      enumOptions: ['compact', 'standard', 'tall'],
    }),
  ],
  [
    visualNode(
      'pdf.root',
      PdfViewerModule.id,
      PdfViewerModule.defaults,
      {},
      [],
      {
        source: { paramId: 'source' },
        title: { paramId: 'title' },
        fallbackText: { paramId: 'fallbackText' },
        downloadLabel: { paramId: 'downloadLabel' },
        height: { paramId: 'height' },
      },
    ),
  ],
)

const TABS = visualComponent(
  'base.vc.tabs',
  'Tabs',
  'tabs.root',
  [
    visualParam('label', 'Accessible label', 'string', 'Tabs', { required: true }),
    visualParam('orientation', 'Orientation', 'enum', 'horizontal', {
      enumOptions: ['horizontal', 'vertical'],
    }),
    visualParam('activation', 'Keyboard activation', 'enum', 'automatic', {
      enumOptions: ['automatic', 'manual'],
    }),
    visualParam('panels', 'Panels', 'slot', []),
  ],
  [
    visualNode(
      'tabs.root',
      TabsModule.id,
      TabsModule.defaults,
      {},
      ['tabs.panels'],
      {
        label: { paramId: 'label' },
        orientation: { paramId: 'orientation' },
        activation: { paramId: 'activation' },
      },
    ),
    visualNode(
      'tabs.panels',
      SlotOutletModule.id,
      SlotOutletModule.defaults,
      { slotName: 'panels' },
    ),
  ],
)

const ACCORDION = visualComponent(
  'base.vc.accordion',
  'Accordion',
  'accordion.root',
  [
    visualParam('label', 'Accessible label', 'string', 'Accordion', { required: true }),
    visualParam('items', 'Items', 'slot', []),
  ],
  [
    visualNode(
      'accordion.root',
      AccordionModule.id,
      AccordionModule.defaults,
      {},
      ['accordion.items'],
      { label: { paramId: 'label' } },
    ),
    visualNode(
      'accordion.items',
      SlotOutletModule.id,
      SlotOutletModule.defaults,
      { slotName: 'items' },
    ),
  ],
)

const MEDIA = visualComponent(
  'base.vc.media',
  'Media',
  'media.root',
  [
    visualParam('kind', 'Media kind', 'enum', 'video', {
      enumOptions: ['audio', 'video'],
    }),
    visualParam('source', 'Media', 'url', '', { required: true }),
    visualParam('poster', 'Poster or artwork', 'image', ''),
    visualParam('title', 'Accessible title', 'string', 'Media', { required: true }),
    visualParam('transcriptUrl', 'Transcript URL', 'url', ''),
    visualParam('transcriptLabel', 'Transcript link label', 'string', 'Read transcript'),
    visualParam('captionsUrl', 'Captions file', 'url', ''),
    visualParam('captionsLanguage', 'Captions language', 'string', 'en'),
    visualParam('captionsLabel', 'Captions label', 'string', 'Captions'),
    visualParam('controls', 'Show controls', 'boolean', true),
    visualParam('autoplay', 'Autoplay', 'boolean', false),
    visualParam('loop', 'Loop', 'boolean', false),
    visualParam('preload', 'Preload', 'enum', 'metadata', {
      enumOptions: ['none', 'metadata', 'auto'],
    }),
  ],
  [
    visualNode(
      'media.root',
      MediaDisplayModule.id,
      MediaDisplayModule.defaults,
      {},
      [],
      {
        kind: { paramId: 'kind' },
        source: { paramId: 'source' },
        poster: { paramId: 'poster' },
        title: { paramId: 'title' },
        transcriptUrl: { paramId: 'transcriptUrl' },
        transcriptLabel: { paramId: 'transcriptLabel' },
        captionsUrl: { paramId: 'captionsUrl' },
        captionsLanguage: { paramId: 'captionsLanguage' },
        captionsLabel: { paramId: 'captionsLabel' },
        controls: { paramId: 'controls' },
        autoplay: { paramId: 'autoplay' },
        loop: { paramId: 'loop' },
        preload: { paramId: 'preload' },
      },
    ),
  ],
)

export const BUILT_IN_CANONICAL_VISUAL_COMPONENTS:
readonly VisualComponent[] = [
  TABLE,
  ICON,
  PDF_VIEWER,
  TABS,
  ACCORDION,
  MEDIA,
]

for (const definition of BUILT_IN_CANONICAL_VISUAL_COMPONENTS) {
  builtInVisualComponentRegistry.registerOrReplace(definition)
}

const interactiveBehavior = [
  behaviorCheck(
    'a11y.keyboard-contract',
    'keyboard',
    'The shared runtime preserves the documented keyboard interaction.',
    'Retain the canonical module and its tested keyboard contract.',
  ),
  behaviorCheck(
    'a11y.no-javascript-fallback',
    'semantic',
    'All authored content remains available when enhancement is unavailable.',
    'Keep the server-rendered native fallback in logical source order.',
  ),
]

export const BUILT_IN_CANONICAL_VISUAL_COMPONENT_LIBRARY_ENTRIES:
readonly ComponentLibraryEntry[] = [
  visualComponentEntry({
    id: 'base.table',
    name: 'Table',
    description: 'A captioned semantic table for genuinely tabular editorial data.',
    category: 'Content',
    icon: 'list-box-solid',
    componentId: TABLE.id,
    tags: ['table', 'data', 'rows', 'columns'],
    fields: [
      { key: 'caption', label: 'Caption', type: 'text', required: true },
      { key: 'columns', label: 'Column headings', type: 'text', required: true },
      { key: 'rows', label: 'Rows', type: 'text', required: true },
      { key: 'firstColumnHeader', label: 'First cell is a row heading', type: 'boolean', required: false },
    ],
    accessibilityChecks: [accessibleNameCheck('caption')],
    usage: 'Use only when row and column relationships are meaningful.',
    accessibility: 'Provide a specific caption and preserve row and column header associations.',
  }),
  visualComponentEntry({
    id: 'base.icon',
    name: 'Icon',
    description: 'An approved symbolic icon with controlled semantics and size.',
    category: 'Design',
    icon: 'star-solid',
    componentId: ICON.id,
    tags: ['icon', 'symbol', 'design', 'status'],
    fields: [
      { key: 'name', label: 'Icon', type: 'select', required: true },
      { key: 'label', label: 'Accessible label', type: 'text', required: false },
      { key: 'decorative', label: 'Decorative', type: 'boolean', required: false },
      { key: 'size', label: 'Size', type: 'select', required: true },
    ],
    accessibilityChecks: [
      behaviorCheck(
        'a11y.accessible-name',
        'naming',
        'Meaningful icons expose text and decorative icons stay silent.',
        'Supply a short label whenever the icon communicates meaning.',
      ),
    ],
    usage: 'Use only an approved symbol and pair unfamiliar icons with visible text.',
    accessibility: 'Decorative icons are hidden; meaningful icons require a concise label.',
  }),
  visualComponentEntry({
    id: 'base.pdf-viewer',
    name: 'PDF Viewer',
    description: 'An embedded PDF with a native fallback and direct download link.',
    category: 'Media',
    icon: 'file-text-solid',
    componentId: PDF_VIEWER.id,
    tags: ['pdf', 'document', 'viewer', 'download'],
    fields: [
      { key: 'source', label: 'PDF file', type: 'url', required: true },
      { key: 'title', label: 'Document title', type: 'text', required: true },
      { key: 'fallbackText', label: 'Fallback message', type: 'text', required: true },
      { key: 'downloadLabel', label: 'Download link label', type: 'text', required: true },
      { key: 'height', label: 'Viewer height', type: 'select', required: true },
    ],
    accessibilityChecks: [
      accessibleNameCheck('title'),
      behaviorCheck(
        'a11y.no-javascript-fallback',
        'media',
        'The document stays available as a direct download.',
        'Keep the title and fallback link specific.',
      ),
    ],
    usage: 'Use an inline preview only when it helps and provide equivalent accessible content.',
    accessibility: 'Name the document and ensure the PDF itself is tagged and accessible.',
  }),
  visualComponentEntry({
    id: 'base.tabs',
    container: true,
    name: 'Tabs',
    description: 'A labelled set of progressively enhanced content panels.',
    category: 'Interactive',
    icon: 'layout-solid',
    componentId: TABS.id,
    tags: ['tabs', 'panels', 'interactive'],
    fields: [
      { key: 'label', label: 'Accessible label', type: 'text', required: true },
    ],
    variants: [
      { id: 'horizontal', name: 'Horizontal', values: { orientation: 'horizontal' } },
      { id: 'vertical', name: 'Vertical', values: { orientation: 'vertical' } },
    ],
    slots: [{
      id: 'panels',
      name: 'Panels',
      description: 'Labelled peer content panels.',
      allowedEntryIds: ['base.tab-panel'],
      minItems: 1,
    }],
    allowedChildEntryIds: ['base.tab-panel'],
    accessibilityChecks: [accessibleNameCheck('label'), ...interactiveBehavior],
    usage: 'Add labelled Tab Panel entries to the governed Panels slot.',
    accessibility: 'Arrow, Home and End keys navigate; every panel remains in the no-JavaScript fallback.',
  }),
  visualComponentEntry({
    id: 'base.accordion',
    container: true,
    name: 'Accordion',
    description: 'A labelled group of native disclosure sections.',
    category: 'Interactive',
    icon: 'list-box-solid',
    componentId: ACCORDION.id,
    tags: ['accordion', 'disclosure', 'interactive'],
    fields: [
      { key: 'label', label: 'Accessible label', type: 'text', required: true },
    ],
    slots: [{
      id: 'items',
      name: 'Items',
      description: 'Native disclosure sections.',
      allowedEntryIds: ['base.accordion-item'],
      minItems: 1,
    }],
    allowedChildEntryIds: ['base.accordion-item'],
    accessibilityChecks: [accessibleNameCheck('label'), ...interactiveBehavior],
    usage: 'Add independently expandable Accordion Item entries to the Items slot.',
    accessibility: 'Native details and summary remain keyboard operable without JavaScript.',
  }),
  visualComponentEntry({
    id: 'base.media',
    name: 'Media',
    description: 'Accessible hosted audio or video using one governed display definition.',
    category: 'Media',
    icon: 'video',
    componentId: MEDIA.id,
    tags: ['media', 'audio', 'video', 'captions', 'transcript'],
    fields: [
      { key: 'source', label: 'Media', type: 'media', required: true },
      { key: 'poster', label: 'Poster or artwork', type: 'image', required: false },
      { key: 'title', label: 'Accessible title', type: 'text', required: true },
      { key: 'transcriptUrl', label: 'Transcript URL', type: 'url', required: false },
      { key: 'captionsUrl', label: 'Captions file', type: 'url', required: false },
      { key: 'controls', label: 'Show controls', type: 'boolean', required: true },
      { key: 'autoplay', label: 'Autoplay', type: 'boolean', required: false, advanced: true },
      { key: 'loop', label: 'Loop', type: 'boolean', required: false, advanced: true },
      { key: 'preload', label: 'Preload', type: 'select', required: true, advanced: true },
    ],
    variants: [
      { id: 'audio', name: 'Audio', values: { kind: 'audio' } },
      { id: 'hosted-video', name: 'Hosted video', values: { kind: 'video' } },
    ],
    accessibilityChecks: [
      accessibleNameCheck('title'),
      behaviorCheck(
        'a11y.motion-control',
        'motion',
        'Autoplay and motion require available controls and reduced-motion review.',
        'Keep controls enabled and avoid autoplay unless the policy permits it.',
      ),
    ],
    usage: 'Choose Audio or Hosted video; provider video remains behind its approved adapter entry.',
    accessibility: 'Provide captions for video and a transcript for spoken audio where required.',
  }),
]
