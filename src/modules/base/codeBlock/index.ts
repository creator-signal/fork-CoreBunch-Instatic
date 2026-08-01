/**
 * base.code-block — accessible preformatted code.
 *
 * Code remains text, never executable markup. The publisher escapes the
 * textarea value before this renderer receives it, while the language token
 * is reduced to a safe class/attribute vocabulary.
 */
import type { ModuleDefinition } from '@core/module-engine'
import { registry } from '@core/module-engine'
import { Value } from '@core/utils/typeboxHelpers'
import { FileTextSolidIcon } from 'pixel-art-icons/icons/file-text-solid'
import { CodeBlockEditor } from './CodeBlockEditor'
import { normalizeCodeLanguage } from './language'
import { CodeBlockPropsSchema, type CodeBlockStoredProps } from './props'

const CODE_BLOCK_CSS = [
  '[data-wrap="true"] { white-space: pre-wrap; overflow-wrap: anywhere; }',
  '[data-wrap="false"] { white-space: pre; overflow: auto; }',
].join('\n')

export const CodeBlockModule: ModuleDefinition<CodeBlockStoredProps> = {
  id: 'base.code-block',
  name: 'Code / Preformatted Text',
  description: 'Whitespace-preserving text with optional language metadata.',
  category: 'Typography',
  version: '1.0.0',
  icon: FileTextSolidIcon,
  trusted: true,
  canHaveChildren: false,

  schema: {
    code: {
      type: 'textarea',
      label: 'Code or preformatted text',
      rows: 10,
    },
    language: {
      type: 'text',
      label: 'Language',
      placeholder: 'text, html, css, javascript…',
      normalize: 'identifier',
    },
    label: {
      type: 'text',
      label: 'Accessible label',
      placeholder: 'Code example',
    },
    wrap: {
      type: 'toggle',
      label: 'Wrap long lines',
    },
  },

  propsSchema: CodeBlockPropsSchema,
  defaults: Value.Create(CodeBlockPropsSchema),
  component: CodeBlockEditor,
  htmlTag: 'pre',
  render: (props) => {
    const language = normalizeCodeLanguage(props.language)
    const wrap = props.wrap ? 'true' : 'false'
    const label = String(props.label ?? '').trim()
    return {
      html:
        `<pre data-language="${language}" data-wrap="${wrap}"` +
        `${label ? ` aria-label="${label}"` : ''}>` +
        `<code class="language-${language}">${String(props.code ?? '')}</code>` +
        '</pre>',
      css: CODE_BLOCK_CSS,
    }
  },
}

registry.registerOrReplace(CodeBlockModule)
