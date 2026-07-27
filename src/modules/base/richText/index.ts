/**
 * base.rich-text — sanitised formatted editorial content.
 *
 * The `richtext` property type applies the same DOMPurify policy at editor,
 * persistence and publisher boundaries. The wrapper is deliberately limited
 * to three non-heading semantic containers; headings remain separate
 * catalogue primitives so document outline diagnostics can reason about them.
 */
import type { ModuleDefinition } from '@core/module-engine'
import { registry } from '@core/module-engine'
import { Value } from '@core/utils/typeboxHelpers'
import { TextStartTIcon } from 'pixel-art-icons/icons/text-start-t'
import { RichTextEditor } from './RichTextEditor'
import { RichTextPropsSchema, type RichTextStoredProps } from './props'

export const RichTextModule: ModuleDefinition<RichTextStoredProps> = {
  id: 'base.rich-text',
  name: 'Rich Text',
  description: 'Sanitised formatted editorial content.',
  category: 'Typography',
  version: '1.0.0',
  icon: TextStartTIcon,
  trusted: true,
  canHaveChildren: false,

  schema: {
    html: {
      type: 'richtext',
      label: 'Content',
      description: 'Paragraphs, links, lists, quotations and inline formatting.',
    },
    tag: {
      type: 'select',
      label: 'Semantic wrapper',
      category: 'content',
      options: [
        { label: 'Generic content', value: 'div' },
        { label: 'Self-contained article', value: 'article' },
        { label: 'Section', value: 'section' },
      ],
    },
  },

  propsSchema: RichTextPropsSchema,
  defaults: Value.Create(RichTextPropsSchema),
  component: RichTextEditor,
  htmlTag: (props) =>
    props.tag === 'article' || props.tag === 'section' ? props.tag : 'div',
  render: (props) => ({
    html: `<${props.tag}>${String(props.html ?? '')}</${props.tag}>`,
  }),
}

registry.registerOrReplace(RichTextModule)
