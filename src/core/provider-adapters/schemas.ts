import { Type, type Static } from '@core/utils/typeboxHelpers'

const NAMESPACED_ID_PATTERN = '^[a-z0-9]+(?:[._-][a-z0-9]+)+$'
const SEMVER_PATTERN =
  '^[0-9]+\\.[0-9]+\\.[0-9]+(?:-[0-9A-Za-z.-]+)?(?:\\+[0-9A-Za-z.-]+)?$'
const CONFIG_KEY_PATTERN = '^[A-Za-z_$][A-Za-z0-9_$.-]*$'

export const ProviderAdapterKindSchema = Type.Union([
  Type.Literal('embed'),
  Type.Literal('form-embed'),
  Type.Literal('map'),
  Type.Literal('media'),
  Type.Literal('captcha'),
])

export type ProviderAdapterKind = Static<typeof ProviderAdapterKindSchema>

export const ProviderConsentCategorySchema = Type.Union([
  Type.Literal('essential'),
  Type.Literal('preferences'),
  Type.Literal('analytics'),
  Type.Literal('marketing'),
])

export type ProviderConsentCategory = Static<
  typeof ProviderConsentCategorySchema
>

export const ProviderAdapterHealthSchema = Type.Union([
  Type.Literal('available'),
  Type.Literal('degraded'),
  Type.Literal('unavailable'),
])

export type ProviderAdapterHealth = Static<typeof ProviderAdapterHealthSchema>

const ProviderConfigFieldSchema = Type.Object(
  {
    key: Type.String({ minLength: 1, pattern: CONFIG_KEY_PATTERN }),
    label: Type.String({ minLength: 1 }),
    description: Type.Optional(Type.String()),
    type: Type.Union([
      Type.Literal('text'),
      Type.Literal('url'),
      Type.Literal('number'),
      Type.Literal('boolean'),
      Type.Literal('select'),
    ]),
    required: Type.Boolean(),
    exposure: Type.Union([
      Type.Literal('public'),
      Type.Literal('secret'),
    ]),
    options: Type.Optional(
      Type.Array(
        Type.Object(
          {
            label: Type.String({ minLength: 1 }),
            value: Type.String(),
          },
          { additionalProperties: false },
        ),
      ),
    ),
  },
  { additionalProperties: false },
)

export type ProviderConfigField = Static<typeof ProviderConfigFieldSchema>

const ProviderIframePolicySchema = Type.Object(
  {
    sandbox: Type.Array(
      Type.Union([
        Type.Literal('allow-downloads'),
        Type.Literal('allow-forms'),
        Type.Literal('allow-modals'),
        Type.Literal('allow-popups'),
        Type.Literal('allow-popups-to-escape-sandbox'),
        Type.Literal('allow-presentation'),
        Type.Literal('allow-same-origin'),
        Type.Literal('allow-scripts'),
      ]),
      { uniqueItems: true },
    ),
    referrerPolicy: Type.Union([
      Type.Literal('no-referrer'),
      Type.Literal('origin'),
      Type.Literal('strict-origin'),
      Type.Literal('strict-origin-when-cross-origin'),
    ]),
    permissions: Type.Array(
      Type.Union([
        Type.Literal('autoplay'),
        Type.Literal('encrypted-media'),
        Type.Literal('fullscreen'),
        Type.Literal('geolocation'),
        Type.Literal('picture-in-picture'),
      ]),
      { uniqueItems: true },
    ),
  },
  { additionalProperties: false },
)

export type ProviderIframePolicy = Static<typeof ProviderIframePolicySchema>

export const ProviderAdapterMetadataSchema = Type.Object(
  {
    id: Type.String({ minLength: 3, pattern: NAMESPACED_ID_PATTERN }),
    version: Type.String({ pattern: SEMVER_PATTERN }),
    name: Type.String({ minLength: 1 }),
    description: Type.String({ minLength: 1 }),
    kinds: Type.Array(ProviderAdapterKindSchema, {
      minItems: 1,
      uniqueItems: true,
    }),
    consentCategory: ProviderConsentCategorySchema,
    allowedOrigins: Type.Array(Type.String({ minLength: 1 }), {
      minItems: 1,
      uniqueItems: true,
    }),
    configFields: Type.Array(ProviderConfigFieldSchema),
    iframePolicy: Type.Optional(ProviderIframePolicySchema),
    fallbackText: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false },
)

export type ProviderAdapterMetadata = Static<
  typeof ProviderAdapterMetadataSchema
>

export interface ProviderAdapterInput {
  kind: ProviderAdapterKind
  config: Record<string, unknown>
  title: string
}

export interface ProviderIframePlan {
  type: 'iframe'
  src: string
  title: string
  aspectRatio: string
}

export interface ProviderRuntimePlan {
  type: 'runtime'
  runtimeId: string
  publicConfig: Record<string, string | number | boolean>
  title: string
}

export type ProviderRenderPlan = ProviderIframePlan | ProviderRuntimePlan

export interface ProviderAdapterDefinition extends ProviderAdapterMetadata {
  resolve(input: ProviderAdapterInput): ProviderRenderPlan
}

export interface ProviderAdapterStatus {
  health: ProviderAdapterHealth
  message?: string
}

export type ProviderAdapterResolution =
  | {
      status: 'ready' | 'degraded'
      adapter: ProviderAdapterMetadata
      plan: ProviderRenderPlan
      message?: string
    }
  | {
      status: 'unavailable' | 'invalid'
      adapter?: ProviderAdapterMetadata
      message: string
    }

export interface ProviderEditorPreview {
  adapterId: string
  providerName: string
  kind: ProviderAdapterKind
  consentCategory: ProviderConsentCategory
  health: ProviderAdapterHealth
  inert: true
  message: string
}
