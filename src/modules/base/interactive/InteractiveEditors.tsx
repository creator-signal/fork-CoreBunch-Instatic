import type { ModuleComponentProps } from '@core/module-engine'
import type { CarouselProps, OverlayProps } from './props'

export function OverlayEditor({
  children,
  mcClassName,
  nodeWrapperProps,
  props,
}: ModuleComponentProps<OverlayProps>) {
  return (
    <details
      {...nodeWrapperProps}
      className={mcClassName}
      data-instatic-overlay=""
      data-instatic-overlay-kind={props.kind}
      data-instatic-overlay-side={props.side}
      data-instatic-overlay-size={props.size}
      open
    >
      <summary data-instatic-overlay-trigger="">{props.triggerLabel}</summary>
      <div
        data-instatic-overlay-panel=""
        role="dialog"
        aria-modal="false"
        aria-label={props.title}
      >
        <header data-instatic-overlay-header="">
          <strong>{props.title}</strong>
          <button type="button" disabled aria-label={props.closeLabel}>
            ×
          </button>
        </header>
        {children}
      </div>
    </details>
  )
}

export function CarouselEditor({
  children,
  mcClassName,
  nodeWrapperProps,
  props,
}: ModuleComponentProps<CarouselProps>) {
  return (
    <section
      {...nodeWrapperProps}
      className={mcClassName}
      data-instatic-carousel=""
      aria-roledescription="carousel"
      aria-label={props.label}
    >
      <div data-instatic-carousel-track="">{children}</div>
      <div data-instatic-carousel-controls="">
        <button type="button" disabled aria-label={props.previousLabel}>
          Previous
        </button>
        <button type="button" disabled aria-label={props.nextLabel}>
          Next
        </button>
      </div>
    </section>
  )
}
