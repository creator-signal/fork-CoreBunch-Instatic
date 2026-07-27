import {
  builtInVisualComponentRegistry,
  type VisualComponent,
} from '@core/visual-components-schema'
import type { ComponentLibraryEntry } from '@core/component-library'
import { CarouselModule, OverlayModule } from './interactive'
import { SlotOutletModule } from './slotOutlet'
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

const DIALOG = visualComponent(
  'base.vc.dialog',
  'Modal / Dialog',
  'dialog.root',
  [
    visualParam('triggerLabel', 'Trigger label', 'string', 'Open dialog', {
      required: true,
    }),
    visualParam('title', 'Title', 'string', 'Dialog', { required: true }),
    visualParam('closeLabel', 'Close label', 'string', 'Close dialog', {
      required: true,
    }),
    visualParam('size', 'Size', 'enum', 'medium', {
      enumOptions: ['small', 'medium', 'large'],
    }),
    visualParam('dismissOnEscape', 'Dismiss with Escape', 'boolean', true),
    visualParam('dismissOnBackdrop', 'Dismiss from backdrop', 'boolean', true),
    visualParam('content', 'Content', 'slot', []),
    visualParam('actions', 'Actions', 'slot', []),
  ],
  [
    visualNode(
      'dialog.root',
      OverlayModule.id,
      OverlayModule.defaults,
      { kind: 'dialog' },
      ['dialog.content', 'dialog.actions'],
      {
        triggerLabel: { paramId: 'triggerLabel' },
        title: { paramId: 'title' },
        closeLabel: { paramId: 'closeLabel' },
        size: { paramId: 'size' },
        dismissOnEscape: { paramId: 'dismissOnEscape' },
        dismissOnBackdrop: { paramId: 'dismissOnBackdrop' },
      },
    ),
    visualNode(
      'dialog.content',
      SlotOutletModule.id,
      SlotOutletModule.defaults,
      { slotName: 'content' },
    ),
    visualNode(
      'dialog.actions',
      SlotOutletModule.id,
      SlotOutletModule.defaults,
      { slotName: 'actions' },
    ),
  ],
)

const DRAWER = visualComponent(
  'base.vc.drawer',
  'Drawer',
  'drawer.root',
  [
    visualParam('triggerLabel', 'Trigger label', 'string', 'Open drawer', {
      required: true,
    }),
    visualParam('title', 'Title', 'string', 'Drawer', { required: true }),
    visualParam('closeLabel', 'Close label', 'string', 'Close drawer', {
      required: true,
    }),
    visualParam('side', 'Side', 'enum', 'end', {
      enumOptions: ['start', 'end'],
    }),
    visualParam('dismissOnEscape', 'Dismiss with Escape', 'boolean', true),
    visualParam('dismissOnBackdrop', 'Dismiss from backdrop', 'boolean', true),
    visualParam('content', 'Content', 'slot', []),
    visualParam('actions', 'Actions', 'slot', []),
  ],
  [
    visualNode(
      'drawer.root',
      OverlayModule.id,
      OverlayModule.defaults,
      { kind: 'drawer', size: 'medium' },
      ['drawer.content', 'drawer.actions'],
      {
        triggerLabel: { paramId: 'triggerLabel' },
        title: { paramId: 'title' },
        closeLabel: { paramId: 'closeLabel' },
        side: { paramId: 'side' },
        dismissOnEscape: { paramId: 'dismissOnEscape' },
        dismissOnBackdrop: { paramId: 'dismissOnBackdrop' },
      },
    ),
    visualNode(
      'drawer.content',
      SlotOutletModule.id,
      SlotOutletModule.defaults,
      { slotName: 'content' },
    ),
    visualNode(
      'drawer.actions',
      SlotOutletModule.id,
      SlotOutletModule.defaults,
      { slotName: 'actions' },
    ),
  ],
)

const CAROUSEL = visualComponent(
  'base.vc.carousel',
  'Carousel',
  'carousel.root',
  [
    visualParam('label', 'Accessible label', 'string', 'Featured content', {
      required: true,
    }),
    visualParam('previousLabel', 'Previous label', 'string', 'Previous slide', {
      required: true,
    }),
    visualParam('nextLabel', 'Next label', 'string', 'Next slide', {
      required: true,
    }),
    visualParam('autoplay', 'Autoplay', 'boolean', false),
    visualParam('interval', 'Autoplay interval', 'number', 5000),
    visualParam('slides', 'Slides', 'slot', []),
  ],
  [
    visualNode(
      'carousel.root',
      CarouselModule.id,
      CarouselModule.defaults,
      {},
      ['carousel.slides'],
      {
        label: { paramId: 'label' },
        previousLabel: { paramId: 'previousLabel' },
        nextLabel: { paramId: 'nextLabel' },
        autoplay: { paramId: 'autoplay' },
        interval: { paramId: 'interval' },
      },
    ),
    visualNode(
      'carousel.slides',
      SlotOutletModule.id,
      SlotOutletModule.defaults,
      { slotName: 'slides' },
    ),
  ],
)

export const BUILT_IN_INTERACTIVE_VISUAL_COMPONENTS:
readonly VisualComponent[] = [DIALOG, DRAWER, CAROUSEL]

for (const definition of BUILT_IN_INTERACTIVE_VISUAL_COMPONENTS) {
  builtInVisualComponentRegistry.registerOrReplace(definition)
}

const overlayChecks = [
  accessibleNameCheck('title'),
  behaviorCheck(
    'a11y.keyboard-contract',
    'keyboard',
    'Overlay triggers, dismissal and Tab order follow the documented keyboard contract.',
    'Run the overlay runtime keyboard behavior suite after implementation changes.',
  ),
  behaviorCheck(
    'a11y.focus-contract',
    'focus',
    'Focus enters, stays within and returns from the enhanced overlay.',
    'Keep a visible close action and do not remove the runtime focus boundary.',
  ),
  behaviorCheck(
    'a11y.no-javascript-fallback',
    'semantic',
    'Overlay content remains available as a native details disclosure.',
    'Keep the summary and inline panel usable before enhancement.',
  ),
]

const contentSlot: ComponentLibraryEntry['slots'][number] = {
  id: 'content',
  name: 'Content',
  description: 'Governed content shown inside the overlay.',
  minItems: 1,
}

const actionSlot: ComponentLibraryEntry['slots'][number] = {
  id: 'actions',
  name: 'Actions',
  description: 'Approved dialog or drawer actions.',
  allowedEntryIds: ['base.button', 'base.link'],
  minItems: 0,
  maxItems: 3,
}

export const BUILT_IN_INTERACTIVE_COMPONENT_LIBRARY_ENTRIES:
readonly ComponentLibraryEntry[] = [
  visualComponentEntry({
    id: 'base.dialog',
    name: 'Modal / Dialog',
    description: 'Focused interactive content with governed dismissal and focus.',
    category: 'Interactive',
    icon: 'layout-solid',
    componentId: DIALOG.id,
    tags: ['modal', 'dialog', 'overlay', 'focus'],
    fields: [
      { key: 'triggerLabel', label: 'Trigger label', type: 'text', required: true },
      { key: 'title', label: 'Title', type: 'text', required: true },
      { key: 'closeLabel', label: 'Close label', type: 'text', required: true },
      { key: 'dismissOnEscape', label: 'Dismiss with Escape', type: 'boolean', required: false },
      { key: 'dismissOnBackdrop', label: 'Dismiss from backdrop', type: 'boolean', required: false },
    ],
    variants: [
      { id: 'small', name: 'Small', values: { size: 'small' } },
      { id: 'medium', name: 'Medium', values: { size: 'medium' } },
      { id: 'large', name: 'Large', values: { size: 'large' } },
    ],
    slots: [contentSlot, actionSlot],
    accessibilityChecks: overlayChecks,
    usage: 'Use when a short task or decision must interrupt the page flow.',
    accessibility: 'The enhanced overlay traps focus, restores the trigger and supports Escape; without JavaScript it remains a details disclosure.',
  }),
  visualComponentEntry({
    id: 'base.drawer',
    name: 'Drawer',
    description: 'Supporting content presented from a governed viewport edge.',
    category: 'Interactive',
    icon: 'layout-solid',
    componentId: DRAWER.id,
    tags: ['drawer', 'panel', 'overlay', 'edge'],
    fields: [
      { key: 'triggerLabel', label: 'Trigger label', type: 'text', required: true },
      { key: 'title', label: 'Title', type: 'text', required: true },
      { key: 'closeLabel', label: 'Close label', type: 'text', required: true },
      { key: 'dismissOnEscape', label: 'Dismiss with Escape', type: 'boolean', required: false },
      { key: 'dismissOnBackdrop', label: 'Dismiss from backdrop', type: 'boolean', required: false },
    ],
    variants: [
      { id: 'start', name: 'Start edge', values: { side: 'start' } },
      { id: 'end', name: 'End edge', values: { side: 'end' } },
    ],
    slots: [contentSlot, actionSlot],
    accessibilityChecks: overlayChecks,
    usage: 'Use for supporting navigation or detail that can be dismissed without losing page context.',
    accessibility: 'The enhanced drawer shares the dialog focus and dismissal contract and remains an inline disclosure without JavaScript.',
  }),
  visualComponentEntry({
    id: 'base.carousel',
    name: 'Carousel',
    description: 'A controlled sequence of governed content slides.',
    category: 'Interactive',
    icon: 'list-box-solid',
    componentId: CAROUSEL.id,
    tags: ['carousel', 'slides', 'gallery', 'featured'],
    fields: [
      { key: 'label', label: 'Accessible label', type: 'text', required: true },
      { key: 'previousLabel', label: 'Previous label', type: 'text', required: true },
      { key: 'nextLabel', label: 'Next label', type: 'text', required: true },
      { key: 'autoplay', label: 'Autoplay', type: 'boolean', required: false },
      { key: 'interval', label: 'Autoplay interval', type: 'number', required: false },
    ],
    slots: [{
      id: 'slides',
      name: 'Slides',
      description: 'Ordered components presented as carousel slides.',
      minItems: 1,
      maxItems: 12,
    }],
    accessibilityChecks: [
      accessibleNameCheck('label'),
      behaviorCheck(
        'a11y.keyboard-contract',
        'keyboard',
        'Previous, next and arrow-key controls move through slides.',
        'Run the carousel runtime keyboard behavior suite after implementation changes.',
      ),
      behaviorCheck(
        'a11y.announcement-contract',
        'semantic',
        'User-initiated slide changes announce the current position.',
        'Keep the polite status region and meaningful carousel label.',
      ),
      behaviorCheck(
        'a11y.motion-control',
        'motion',
        'Autoplay pauses for interaction and is disabled for reduced motion.',
        'Do not bypass the runtime reduced-motion and pause checks.',
      ),
      behaviorCheck(
        'a11y.no-javascript-fallback',
        'semantic',
        'All slides remain visible in document order without JavaScript.',
        'Only hide inactive slides after progressive enhancement.',
      ),
    ],
    usage: 'Use sparingly when related content benefits from sequential presentation.',
    accessibility: 'Prefer manual controls. Autoplay pauses on focus or pointer interaction and is disabled for reduced-motion users.',
  }),
]
