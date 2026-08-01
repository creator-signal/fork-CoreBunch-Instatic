import type { ModuleDefinition } from '@core/module-engine'
import { registry } from '@core/module-engine'
import { Value } from '@core/utils/typeboxHelpers'
import { FileTextSolidIcon } from 'pixel-art-icons/icons/file-text-solid'
import { safeUrl } from '@modules/base/utils/escape'
import { PdfViewerEditor } from './PdfViewerEditor'
import {
  PdfViewerPropsSchema,
  type PdfViewerStoredProps,
} from './props'

const PDF_VIEWER_CSS = `
[data-instatic-pdf-viewer] {
  display: grid;
  gap: var(--space-xs);
  margin-inline: 0;
}
[data-instatic-pdf-viewer] object {
  width: 100%;
  min-height: 30rem;
  border: 1px solid var(--border-primary);
}
[data-instatic-pdf-viewer][data-height="compact"] object { min-height: 20rem; }
[data-instatic-pdf-viewer][data-height="tall"] object { min-height: 50rem; }
`.trim()

function normalizeHeight(
  value: PdfViewerStoredProps['height'],
): PdfViewerStoredProps['height'] {
  return value === 'compact' || value === 'tall' ? value : 'standard'
}

export const PdfViewerModule: ModuleDefinition<PdfViewerStoredProps> = {
  id: 'base.pdf-viewer',
  name: 'PDF Viewer',
  description: 'An embedded PDF with native fallback and a direct download link.',
  category: 'Media',
  version: '1.0.0',
  icon: FileTextSolidIcon,
  trusted: true,
  canHaveChildren: false,
  schema: {
    source: { type: 'url', label: 'PDF file' },
    title: {
      type: 'text',
      label: 'Document title',
      description: 'Names the embedded document for assistive technology.',
    },
    fallbackText: { type: 'text', label: 'Fallback message' },
    downloadLabel: { type: 'text', label: 'Download link label' },
    height: {
      type: 'select',
      label: 'Viewer height',
      options: [
        { label: 'Compact', value: 'compact' },
        { label: 'Standard', value: 'standard' },
        { label: 'Tall', value: 'tall' },
      ],
    },
  },
  propsSchema: PdfViewerPropsSchema,
  defaults: Value.Create(PdfViewerPropsSchema),
  component: PdfViewerEditor,
  htmlTag: 'figure',
  render: (props) => {
    const source = safeUrl(props.source)
    const title = String(props.title || 'PDF document')
    const fallbackText = String(
      props.fallbackText || 'Your browser cannot display this PDF.',
    )
    const downloadLabel = String(props.downloadLabel || 'Download PDF')
    const download =
      source && source !== '#'
        ? `<a href="${source}" download>${downloadLabel}</a>`
        : ''
    const viewer =
      source && source !== '#'
        ? `<object data="${source}" type="application/pdf" aria-label="${title}">` +
          `<p>${fallbackText} ${download}</p></object>`
        : `<p>${fallbackText}</p>`
    return {
      html:
        `<figure data-instatic-pdf-viewer data-height="${normalizeHeight(props.height)}">` +
        `${viewer}<figcaption>${download}</figcaption></figure>`,
      css: PDF_VIEWER_CSS,
    }
  },
}

registry.registerOrReplace(PdfViewerModule)
