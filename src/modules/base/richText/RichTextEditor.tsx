import React from 'react'
import type { ModuleComponentProps } from '@core/module-engine'
import { sanitizeRichtext } from '@core/sanitize'
import type { RichTextStoredProps } from './props'

export const RichTextEditor: React.FC<
  ModuleComponentProps<RichTextStoredProps>
> = ({ props, mcClassName, nodeWrapperProps }) => {
  const tag = props.tag === 'article' || props.tag === 'section'
    ? props.tag
    : 'div'
  const html = sanitizeRichtext(props.html)

  return React.createElement(tag, {
    ...nodeWrapperProps,
    className: mcClassName,
    dangerouslySetInnerHTML: {
      __html: html || '<p>Add your rich text here.</p>',
    },
  })
}
