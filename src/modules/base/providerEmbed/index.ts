import type {
  CspSourceRequirement,
  ModuleDefinition,
  RenderOutput,
} from '@core/module-engine'
import { registry } from '@core/module-engine'
import {
  providerAdapterRegistry,
  type ProviderAdapterMetadata,
  type ProviderIframePlan,
} from '@core/provider-adapters'
import '@core/provider-adapters/builtins'
import { Type, Value, type Static } from '@core/utils/typeboxHelpers'
import { LayoutSolidIcon } from 'pixel-art-icons/icons/layout-solid'
import { ProviderEmbedEditor } from './ProviderEmbedEditor'
import { PROVIDER_EMBED_RUNTIME_JS } from './providerEmbedRuntimeJs'

const ProviderEmbedPropsSchema = Type.Object({
  adapterId: Type.String({ default: '' }),
  kind: Type.Union(
    [
      Type.Literal('embed'),
      Type.Literal('form-embed'),
      Type.Literal('map'),
      Type.Literal('media'),
      Type.Literal('captcha'),
    ],
    { default: 'embed' },
  ),
  sourceUrl: Type.String({ default: '' }),
  title: Type.String({ default: 'Provider content' }),
  fallbackText: Type.String({ default: 'Provider content unavailable.' }),
  heightMode: Type.Union([
    Type.Literal('responsive'),
    Type.Literal('fixed'),
    Type.Literal('content-driven'),
  ], { default: 'responsive' }),
  height: Type.Number({ default: 480 }),
})

type ProviderEmbedProps = Static<typeof ProviderEmbedPropsSchema>

export const ProviderEmbedModule: ModuleDefinition<ProviderEmbedProps> = {
  id: 'base.provider-embed',
  name: 'Provider embed',
  description: 'A policy-validated external provider boundary.',
  category: 'Interactive',
  version: '1.0.0',
  icon: LayoutSolidIcon,
  trusted: true,
  canHaveChildren: false,
  schema: {
    adapterId: {
      type: 'text',
      label: 'Provider adapter',
      hidden: true,
    },
    kind: {
      type: 'select',
      label: 'Provider kind',
      hidden: true,
      options: [
        { label: 'Embed', value: 'embed' },
        { label: 'Form embed', value: 'form-embed' },
        { label: 'Map', value: 'map' },
        { label: 'Media', value: 'media' },
        { label: 'CAPTCHA', value: 'captcha' },
      ],
    },
    sourceUrl: { type: 'url', label: 'Provider URL' },
    title: { type: 'text', label: 'Accessible title' },
    fallbackText: { type: 'text', label: 'Fallback text' },
    heightMode: {
      type: 'select',
      label: 'Height mode',
      options: [
        { label: 'Responsive', value: 'responsive' },
        { label: 'Fixed', value: 'fixed' },
        { label: 'Content driven', value: 'content-driven' },
      ],
    },
    height: { type: 'number', label: 'Fallback height' },
  },
  propsSchema: ProviderEmbedPropsSchema,
  defaults: Value.Create(ProviderEmbedPropsSchema),
  component: ProviderEmbedEditor,
  htmlTag: 'div',
  render: (props) => renderProviderEmbed(props),
}

registry.registerOrReplace(ProviderEmbedModule)

function renderProviderEmbed(props: ProviderEmbedProps): RenderOutput {
  const resolution = providerAdapterRegistry.resolve(props.adapterId, {
    kind: props.kind,
    config:
      props.kind === 'captcha'
        ? { siteKey: props.sourceUrl }
        : { url: props.sourceUrl },
    title: props.title,
  })
  if (!('plan' in resolution)) {
    return {
      html:
        `<div data-instatic-provider-state="${resolution.status}" role="status">` +
        `${props.fallbackText || attribute(resolution.message)}</div>`,
    }
  }
  if (resolution.plan.type !== 'iframe') {
    return {
      html:
        '<div data-instatic-provider-state="unavailable" role="status">' +
        `${props.fallbackText || attribute(resolution.adapter.fallbackText)}</div>`,
    }
  }
  return iframeOutput(
    resolution.adapter,
    resolution.plan,
    resolution.status,
    resolution.message,
    props.heightMode,
    props.height,
  )
}

function iframeOutput(
  adapter: ProviderAdapterMetadata,
  plan: ProviderIframePlan,
  status: 'ready' | 'degraded',
  message: string | undefined,
  heightMode: ProviderEmbedProps['heightMode'],
  height: number,
): RenderOutput {
  const policy = adapter.iframePolicy
  if (!policy) {
    return {
      html:
        '<div data-instatic-provider-state="invalid" role="status">' +
        `${adapter.fallbackText}</div>`,
    }
  }
  const origin = new URL(plan.src).origin
  const loadLabel = `Load ${adapter.name}`
  const notice =
    status === 'degraded' && message
      ? `<p role="status">${attribute(message)}</p>`
      : ''
  const html =
    `<div data-instatic-provider-embed data-instatic-provider-adapter="${attribute(adapter.id)}" ` +
    `data-instatic-provider-consent="${adapter.consentCategory}" ` +
    `data-instatic-provider-src="${attribute(plan.src)}" ` +
    `data-instatic-provider-title="${plan.title}" ` +
    `data-instatic-provider-sandbox="${policy.sandbox.join(' ')}" ` +
    `data-instatic-provider-referrer="${policy.referrerPolicy}" ` +
    `data-instatic-provider-allow="${policy.permissions.join('; ')}" ` +
    `data-instatic-provider-aspect="${attribute(plan.aspectRatio)}" ` +
    `data-instatic-provider-height-mode="${heightMode}" ` +
    `data-instatic-provider-height="${boundedHeight(height)}">` +
    `<button type="button" data-instatic-provider-load>${attribute(loadLabel)}</button>` +
    `<p>${attribute(adapter.fallbackText)}</p>${notice}</div>`
  const cspSources: CspSourceRequirement[] = [
    { directive: 'frame-src', sources: [origin] },
  ]
  return {
    html,
    js: PROVIDER_EMBED_RUNTIME_JS,
    cspSources,
  }
}

function boundedHeight(value: number): number {
  return Math.max(160, Math.min(2_000, Math.round(value || 480)))
}

function attribute(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}
