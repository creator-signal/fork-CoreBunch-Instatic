import React from 'react'
import type { ModuleComponentProps } from '@core/module-engine'
import { normalizeCodeLanguage } from './language'
import type { CodeBlockStoredProps } from './props'

export const CodeBlockEditor: React.FC<
  ModuleComponentProps<CodeBlockStoredProps>
> = ({ props, mcClassName, nodeWrapperProps }) => (
  <pre
    {...nodeWrapperProps}
    className={mcClassName}
    aria-label={props.label || undefined}
    data-language={normalizeCodeLanguage(props.language)}
    data-wrap={props.wrap ? 'true' : 'false'}
    style={{ whiteSpace: props.wrap ? 'pre-wrap' : 'pre' }}
  >
    <code className={`language-${normalizeCodeLanguage(props.language)}`}>
      {props.code}
    </code>
  </pre>
)
