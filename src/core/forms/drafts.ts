import { Type, type Static } from '@core/utils/typeboxHelpers'

export const FORM_DRAFT_SCHEMA_VERSION = 1

export const FormDraftModeSchema = Type.Union([
  Type.Literal('none'),
  Type.Literal('session'),
  Type.Literal('persistent'),
])

export type FormDraftMode = Static<typeof FormDraftModeSchema>

export const FormDraftBehaviorSchema = Type.Union([
  Type.Literal('include'),
  Type.Literal('session-only'),
  Type.Literal('exclude'),
])

export type FormDraftBehavior = Static<typeof FormDraftBehaviorSchema>

export const FormDraftWizardStateSchema = Type.Object(
  {
    stepId: Type.Optional(Type.String({ maxLength: 200 })),
    visitedStepIds: Type.Array(Type.String({ maxLength: 200 }), { maxItems: 100 }),
    review: Type.Boolean(),
  },
  { additionalProperties: false },
)

export type FormDraftWizardState = Static<typeof FormDraftWizardStateSchema>

const PublicFormDraftIdentitySchema = Type.Object({
  pageId: Type.String({ minLength: 1 }),
  formId: Type.String({ minLength: 1 }),
  pageToken: Type.String({ minLength: 1 }),
  draftId: Type.Optional(Type.String({ minLength: 1, maxLength: 200 })),
  recoveryToken: Type.Optional(Type.String({ minLength: 20, maxLength: 512 })),
})

export const PublicFormDraftLoadBodySchema = PublicFormDraftIdentitySchema

export const PublicFormDraftSaveBodySchema = Type.Intersect([
  PublicFormDraftIdentitySchema,
  Type.Object({
    revision: Type.Optional(Type.Integer({ minimum: 1 })),
    values: Type.Record(Type.String({ minLength: 1, maxLength: 200 }), Type.Unknown()),
    wizard: FormDraftWizardStateSchema,
  }),
])

export const PublicFormDraftDeleteBodySchema = Type.Intersect([
  PublicFormDraftIdentitySchema,
  Type.Object({
    revision: Type.Integer({ minimum: 1 }),
  }),
])

export const FormDraftCapabilityStatusSchema = Type.Object(
  {
    health: Type.Union([
      Type.Literal('available'),
      Type.Literal('unavailable'),
    ]),
    message: Type.Optional(Type.String()),
    policy: Type.Object(
      {
        enabled: Type.Boolean(),
        ttlDays: Type.Integer({ minimum: 1 }),
        maxBytes: Type.Integer({ minimum: 1 }),
      },
      { additionalProperties: false },
    ),
  },
  { additionalProperties: false },
)

export type FormDraftCapabilityStatus = Static<typeof FormDraftCapabilityStatusSchema>
