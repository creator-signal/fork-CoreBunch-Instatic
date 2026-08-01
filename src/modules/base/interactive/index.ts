import type { ModuleDefinition } from '@core/module-engine'
import { registry } from '@core/module-engine'
import { Value } from '@core/utils/typeboxHelpers'
import { LayoutSolidIcon } from 'pixel-art-icons/icons/layout-solid'
import { ListBoxSolidIcon } from 'pixel-art-icons/icons/list-box-solid'
import { CarouselEditor, OverlayEditor } from './InteractiveEditors'
import { INTERACTIVE_RUNTIME_JS } from './interactiveRuntimeJs'
import {
  CarouselPropsSchema,
  OverlayPropsSchema,
  type CarouselProps,
  type OverlayProps,
} from './props'

export const INTERACTIVE_CSS = `
[data-instatic-overlay] > [data-instatic-overlay-panel] {
  padding: var(--space-l);
  border: 1px solid var(--border-primary);
  border-radius: 0.5rem;
  background: var(--bg-surface);
  color: var(--text-body);
}
[data-instatic-overlay-header] {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-m);
}
[data-instatic-overlay][data-instatic-overlay-enhanced][open] {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: grid;
  place-items: center;
  padding: var(--space-l);
  background: color-mix(in srgb, var(--text-body) 45%, transparent);
}
[data-instatic-overlay][data-instatic-overlay-enhanced] > summary {
  cursor: pointer;
}
[data-instatic-overlay][data-instatic-overlay-enhanced][open] > summary {
  display: none;
}
[data-instatic-overlay][data-instatic-overlay-enhanced][open] > [data-instatic-overlay-panel] {
  width: min(100%, 42rem);
  max-height: calc(100vh - 3rem);
  overflow: auto;
}
[data-instatic-overlay][data-instatic-overlay-size="small"][data-instatic-overlay-enhanced][open] > [data-instatic-overlay-panel] {
  width: min(100%, 28rem);
}
[data-instatic-overlay][data-instatic-overlay-size="large"][data-instatic-overlay-enhanced][open] > [data-instatic-overlay-panel] {
  width: min(100%, 64rem);
}
[data-instatic-overlay][data-instatic-overlay-kind="drawer"][data-instatic-overlay-enhanced][open] {
  place-items: stretch start;
  padding: 0;
}
[data-instatic-overlay][data-instatic-overlay-kind="drawer"][data-instatic-overlay-side="end"][data-instatic-overlay-enhanced][open] {
  place-items: stretch end;
}
[data-instatic-overlay][data-instatic-overlay-kind="drawer"][data-instatic-overlay-enhanced][open] > [data-instatic-overlay-panel] {
  width: min(90vw, 28rem);
  max-height: none;
  border-radius: 0;
}
[data-instatic-carousel-track] {
  display: grid;
  gap: var(--space-m);
}
[data-instatic-carousel-controls] {
  display: none;
  gap: var(--space-s);
  margin-block-start: var(--space-m);
}
[data-instatic-carousel][data-instatic-carousel-enhanced] [data-instatic-carousel-controls] {
  display: flex;
}
[data-instatic-visually-hidden] {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}
@media (prefers-reduced-motion: reduce) {
  [data-instatic-overlay],
  [data-instatic-carousel] {
    scroll-behavior: auto;
    transition: none;
  }
}
`.trim()

export const OverlayModule: ModuleDefinition<OverlayProps> = {
  id: 'base.overlay',
  name: 'Overlay',
  description: 'A progressively enhanced dialog or edge drawer.',
  category: 'Interactive',
  version: '1.0.0',
  icon: LayoutSolidIcon,
  trusted: true,
  canHaveChildren: true,
  schema: {
    kind: {
      type: 'select',
      label: 'Kind',
      options: [
        { label: 'Dialog', value: 'dialog' },
        { label: 'Drawer', value: 'drawer' },
      ],
    },
    triggerLabel: { type: 'text', label: 'Trigger label' },
    title: { type: 'text', label: 'Accessible title' },
    closeLabel: { type: 'text', label: 'Close label' },
    side: {
      type: 'select',
      label: 'Drawer side',
      options: [
        { label: 'Start', value: 'start' },
        { label: 'End', value: 'end' },
      ],
    },
    size: {
      type: 'select',
      label: 'Size',
      options: [
        { label: 'Small', value: 'small' },
        { label: 'Medium', value: 'medium' },
        { label: 'Large', value: 'large' },
      ],
    },
    dismissOnEscape: { type: 'toggle', label: 'Dismiss with Escape' },
    dismissOnBackdrop: { type: 'toggle', label: 'Dismiss from backdrop' },
  },
  propsSchema: OverlayPropsSchema,
  defaults: Value.Create(OverlayPropsSchema),
  component: OverlayEditor,
  htmlTag: 'details',
  render: (props, children) => ({
    html:
      `<details data-instatic-overlay data-instatic-overlay-kind="${props.kind}" ` +
      `data-instatic-overlay-side="${props.side}" ` +
      `data-instatic-overlay-size="${props.size}" ` +
      `data-instatic-overlay-dismiss-escape="${props.dismissOnEscape}" ` +
      `data-instatic-overlay-dismiss-backdrop="${props.dismissOnBackdrop}">` +
      `<summary data-instatic-overlay-trigger>${props.triggerLabel}</summary>` +
      `<div data-instatic-overlay-panel aria-label="${props.title}">` +
      `<header data-instatic-overlay-header><strong>${props.title}</strong>` +
      `<button type="button" data-instatic-overlay-close aria-label="${props.closeLabel}">×</button>` +
      `</header>${children.join('')}</div></details>`,
    css: INTERACTIVE_CSS,
    js: INTERACTIVE_RUNTIME_JS,
  }),
}

export const CarouselModule: ModuleDefinition<CarouselProps> = {
  id: 'base.carousel',
  name: 'Carousel',
  description: 'A progressively enhanced collection of content slides.',
  category: 'Interactive',
  version: '1.0.0',
  icon: ListBoxSolidIcon,
  trusted: true,
  canHaveChildren: true,
  schema: {
    label: { type: 'text', label: 'Accessible label' },
    previousLabel: { type: 'text', label: 'Previous label' },
    nextLabel: { type: 'text', label: 'Next label' },
    autoplay: { type: 'toggle', label: 'Autoplay' },
    interval: { type: 'number', label: 'Autoplay interval (milliseconds)' },
  },
  propsSchema: CarouselPropsSchema,
  defaults: Value.Create(CarouselPropsSchema),
  component: CarouselEditor,
  htmlTag: 'section',
  render: (props, children) => ({
    html:
      `<section data-instatic-carousel data-instatic-carousel-autoplay="${props.autoplay}" ` +
      `data-instatic-carousel-interval="${props.interval}" ` +
      `aria-roledescription="carousel" aria-label="${props.label}">` +
      `<p data-instatic-carousel-status data-instatic-visually-hidden aria-live="polite"></p>` +
      `<div data-instatic-carousel-track>${children.join('')}</div>` +
      `<div data-instatic-carousel-controls>` +
      `<button type="button" data-instatic-carousel-action="previous" aria-label="${props.previousLabel}">Previous</button>` +
      `<button type="button" data-instatic-carousel-action="next" aria-label="${props.nextLabel}">Next</button>` +
      `</div></section>`,
    css: INTERACTIVE_CSS,
    js: INTERACTIVE_RUNTIME_JS,
  }),
}

registry.registerOrReplace(OverlayModule)
registry.registerOrReplace(CarouselModule)
