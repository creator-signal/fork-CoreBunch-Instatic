/**
 * TypeBox schemas for `cms.media.*` api-call arguments (registration payloads).
 * Callbacks themselves live INSIDE the VM; only metadata crosses the host bridge.
 */

import { Type } from '@sinclair/typebox'
const MEDIA_ID_PATTERN = '^[a-z][a-z0-9-]*(?:\\.[a-z][a-z0-9-]*)+$'
const MEDIA_ROLE_VALUES = ['original', 'variant', 'avatar', 'font', 'plugin-pack'] as const
const MEDIA_CSP_ORIGIN_PATTERN =
  '^https?://[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*(?::[1-9][0-9]{0,4})?$'

const MediaRoleSchema = Type.Union(MEDIA_ROLE_VALUES.map((v) => Type.Literal(v)))

const MediaServingModeSchema = Type.Union([
  Type.Literal('public-url'),
  Type.Literal('signed-redirect'),
  Type.Literal('proxy'),
])

const MediaCspOriginSchema = Type.Object(
  {
    directive: Type.Union([
      Type.Literal('img-src'),
      Type.Literal('media-src'),
      Type.Literal('connect-src'),
    ]),
    // A complete HTTP(S) origin. Paths, credentials, query strings, and
    // fragments are excluded so adapters can widen only the intended CSP
    // source. Explicit schemes and ports keep local/object-store deployments
    // accurate instead of silently forcing HTTPS.
    origin: Type.String({ pattern: MEDIA_CSP_ORIGIN_PATTERN, maxLength: 276 }),
  },
  { additionalProperties: false },
)

export const RegisterStorageAdapterArgSchema = Type.Object(
  {
    adapterId: Type.String({ pattern: MEDIA_ID_PATTERN, maxLength: 120 }),
    label: Type.String({ minLength: 1, maxLength: 80 }),
    roles: Type.Array(MediaRoleSchema, { minItems: 1, maxItems: MEDIA_ROLE_VALUES.length }),
    servingMode: MediaServingModeSchema,
    /** Whether the plugin's adapter object exposes `getReadUrl` (for read-side dispatch). */
    hasGetReadUrl: Type.Boolean(),
    /** Whether the plugin's adapter object exposes `readStream` (proxy mode). */
    hasReadStream: Type.Boolean(),
    cspOrigins: Type.Optional(Type.Array(MediaCspOriginSchema, { maxItems: 10 })),
  },
  { additionalProperties: false },
)

export const RegisterUrlTransformerArgSchema = Type.Object(
  {
    transformerId: Type.String({ minLength: 1, maxLength: 120, pattern: '^[a-zA-Z0-9_-]+$' }),
  },
  { additionalProperties: false },
)

export const RegisterVariantDelegateArgSchema = Type.Object(
  {
    delegateId: Type.String({ pattern: MEDIA_ID_PATTERN, maxLength: 120 }),
    variantUrlTemplate: Type.String({ minLength: 1, maxLength: 500 }),
    widths: Type.Array(Type.Integer({ minimum: 16, maximum: 8192 }), { minItems: 1, maxItems: 16 }),
    formats: Type.Array(
      Type.Union([Type.Literal('webp'), Type.Literal('jpeg'), Type.Literal('avif')]),
      { minItems: 1, maxItems: 3 },
    ),
  },
  { additionalProperties: false },
)
