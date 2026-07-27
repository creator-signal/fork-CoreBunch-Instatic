import React from 'react'
import type { ModuleComponentProps } from '@core/module-engine'
import { CanvasModulePlaceholder } from '@ui/components/CanvasModulePlaceholder'
import { FileTextSolidIcon } from 'pixel-art-icons/icons/file-text-solid'
import type { PdfViewerStoredProps } from './props'

export const PdfViewerEditor: React.FC<
  ModuleComponentProps<PdfViewerStoredProps>
> = ({ props, mcClassName, nodeWrapperProps }) => (
  <figure
    {...nodeWrapperProps}
    className={mcClassName}
    data-instatic-pdf-viewer
    data-height={props.height}
  >
    <CanvasModulePlaceholder
      icon={<FileTextSolidIcon size={16} />}
      label={props.source ? props.title : 'No PDF selected'}
    />
    {props.source ? (
      <figcaption>
        <a href={props.source}>{props.downloadLabel}</a>
      </figcaption>
    ) : null}
  </figure>
)
