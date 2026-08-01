import { Type, type Static } from '@core/utils/typeboxHelpers'

export const AttachmentHealthSchema = Type.Union([
  Type.Literal('available'),
  Type.Literal('degraded'),
  Type.Literal('unavailable'),
])

export type AttachmentHealth = Static<typeof AttachmentHealthSchema>

export const AttachmentStatusSchema = Type.Union([
  Type.Literal('quarantined'),
  Type.Literal('active'),
  Type.Literal('rejected'),
  Type.Literal('claimed'),
  Type.Literal('deleted'),
])

export type AttachmentStatus = Static<typeof AttachmentStatusSchema>

export const AttachmentScanStatusSchema = Type.Union([
  Type.Literal('pending'),
  Type.Literal('clean'),
  Type.Literal('rejected'),
  Type.Literal('unavailable'),
  Type.Literal('error'),
])

export type AttachmentScanStatus = Static<typeof AttachmentScanStatusSchema>

export const AttachmentReferenceSchema = Type.String({
  pattern: '^att:v1:[A-Za-z0-9_-]+:[A-Za-z0-9_-]+$',
  maxLength: 512,
})

export type AttachmentReference = Static<typeof AttachmentReferenceSchema>

export const AttachmentPolicySchema = Type.Object(
  {
    enabled: Type.Boolean(),
    allowedMimeTypes: Type.Array(Type.String()),
    maxFileBytes: Type.Integer({ minimum: 1 }),
    maxFiles: Type.Integer({ minimum: 1, maximum: 20 }),
    temporaryTtlSeconds: Type.Integer({ minimum: 60 }),
    retentionDays: Type.Integer({ minimum: 1 }),
  },
  { additionalProperties: false },
)

export type AttachmentPolicy = Static<typeof AttachmentPolicySchema>

export const AttachmentCapabilityStatusSchema = Type.Object(
  {
    health: AttachmentHealthSchema,
    storage: AttachmentHealthSchema,
    scanner: AttachmentHealthSchema,
    message: Type.Optional(Type.String()),
    policy: AttachmentPolicySchema,
  },
  { additionalProperties: false },
)

export type AttachmentCapabilityStatus = Static<
  typeof AttachmentCapabilityStatusSchema
>

export const AttachmentUploadResultSchema = Type.Object(
  {
    id: Type.String(),
    name: Type.String(),
    mimeType: Type.String(),
    sizeBytes: Type.Integer({ minimum: 1 }),
    reference: AttachmentReferenceSchema,
  },
  { additionalProperties: false },
)

export type AttachmentUploadResult = Static<typeof AttachmentUploadResultSchema>

