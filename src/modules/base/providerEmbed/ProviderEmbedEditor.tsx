import type { ModuleComponentProps } from '@core/module-engine'
import { providerAdapterRegistry } from '@core/provider-adapters'

type ProviderEmbedProps = Record<string, unknown> & {
  adapterId: string
  kind: 'embed' | 'form-embed' | 'map' | 'media' | 'captcha'
  title: string
}

export function ProviderEmbedEditor({
  mcClassName,
  nodeWrapperProps,
  props,
}: ModuleComponentProps<ProviderEmbedProps>) {
  const preview = providerAdapterRegistry.editorPreview(
    props.adapterId,
    props.kind,
  )
  return (
    <div
      {...nodeWrapperProps}
      className={mcClassName}
      data-instatic-provider-preview=""
      data-provider-health={preview.health}
      role="status"
    >
      <strong>{preview.providerName}</strong>
      <span>{props.title ? ` · ${props.title}` : ''}</span>
      <span>{` · ${preview.message}`}</span>
    </div>
  )
}
