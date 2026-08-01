import { Type, type Static } from '@core/utils/typeboxHelpers'

export const OverlayPropsSchema = Type.Object({
  kind: Type.Union([
    Type.Literal('dialog'),
    Type.Literal('drawer'),
  ], { default: 'dialog' }),
  triggerLabel: Type.String({ default: 'Open dialog' }),
  title: Type.String({ default: 'Dialog' }),
  closeLabel: Type.String({ default: 'Close dialog' }),
  side: Type.Union([
    Type.Literal('start'),
    Type.Literal('end'),
  ], { default: 'end' }),
  size: Type.Union([
    Type.Literal('small'),
    Type.Literal('medium'),
    Type.Literal('large'),
  ], { default: 'medium' }),
  dismissOnEscape: Type.Boolean({ default: true }),
  dismissOnBackdrop: Type.Boolean({ default: true }),
})

export const CarouselPropsSchema = Type.Object({
  label: Type.String({ default: 'Featured content' }),
  previousLabel: Type.String({ default: 'Previous slide' }),
  nextLabel: Type.String({ default: 'Next slide' }),
  autoplay: Type.Boolean({ default: false }),
  interval: Type.Number({ default: 5000, minimum: 2000, maximum: 60000 }),
})

export type OverlayProps = Static<typeof OverlayPropsSchema>
export type CarouselProps = Static<typeof CarouselPropsSchema>
