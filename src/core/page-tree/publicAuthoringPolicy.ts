/**
 * Declarative public-authoring policy stored with a site.
 *
 * The policy names the Component Library surface that may produce public
 * output. It contains no executable integration code, so the same data is
 * consumed by editor write guards, HTTP saves and the publisher.
 */
import { Type, type Static } from '@core/utils/typeboxHelpers'

const NAMESPACED_ID_PATTERN = '^[a-z0-9]+(?:[._/-][a-z0-9]+)+$'
const SEMVER_PATTERN =
  '^[0-9]+\\.[0-9]+\\.[0-9]+(?:-[0-9A-Za-z.-]+)?(?:\\+[0-9A-Za-z.-]+)?$'

const NamespacedIdSchema = Type.String({
  minLength: 3,
  pattern: NAMESPACED_ID_PATTERN,
})

export const PublicAuthoringAssetFieldPolicySchema = Type.Object(
  {
    entryId: NamespacedIdSchema,
    fieldKey: Type.String({ minLength: 1 }),
    /** Semantic role is fixed by the component; authors select only the asset. */
    role: Type.String({ minLength: 1 }),
    /** Visual treatment is fixed by the component implementation. */
    treatment: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false },
)

export type PublicAuthoringAssetFieldPolicy = Static<
  typeof PublicAuthoringAssetFieldPolicySchema
>

export const PublicAuthoringTemplatePolicySchema = Type.Object(
  {
    pageId: Type.String({ minLength: 1 }),
    requiredEntryIds: Type.Array(NamespacedIdSchema, {
      uniqueItems: true,
    }),
  },
  { additionalProperties: false },
)

export const PublicAuthoringPatternPolicySchema = Type.Object(
  {
    entryId: NamespacedIdSchema,
    rootModuleId: NamespacedIdSchema,
    rootProps: Type.Record(Type.String(), Type.Unknown()),
    childEntryIds: Type.Array(NamespacedIdSchema, { uniqueItems: false }),
  },
  { additionalProperties: false },
)

export const PublicAuthoringPolicySchema = Type.Object(
  {
    id: NamespacedIdSchema,
    version: Type.String({ pattern: SEMVER_PATTERN }),
    ownerPluginId: NamespacedIdSchema,
    allowedComponentEntryIds: Type.Array(NamespacedIdSchema, {
      minItems: 1,
      uniqueItems: true,
    }),
    allowedPatternEntryIds: Type.Array(NamespacedIdSchema, {
      minItems: 1,
      uniqueItems: true,
    }),
    /** Exact public pattern compositions, independent of editor-only state. */
    patterns: Type.Array(PublicAuthoringPatternPolicySchema, {
      minItems: 1,
      uniqueItems: true,
    }),
    allowedVariants: Type.Record(
      NamespacedIdSchema,
      Type.Array(Type.String({ minLength: 1 }), {
        minItems: 1,
        uniqueItems: true,
      }),
    ),
    /** Ungoverned nodes are limited to transparent document scaffolding. */
    allowedStructuralModuleIds: Type.Array(NamespacedIdSchema, {
      minItems: 1,
      uniqueItems: true,
    }),
    /** Pack-owned Visual Components cannot be edited through authoring. */
    protectedVisualComponentIds: Type.Array(NamespacedIdSchema, {
      uniqueItems: true,
    }),
    templates: Type.Array(PublicAuthoringTemplatePolicySchema, {
      uniqueItems: true,
    }),
    appearance: Type.Object(
      {
        mode: Type.Literal('component-owned'),
      },
      { additionalProperties: false },
    ),
    assets: Type.Object(
      {
        roles: Type.Array(Type.String({ minLength: 1 }), {
          minItems: 1,
          uniqueItems: true,
        }),
        treatments: Type.Array(Type.String({ minLength: 1 }), {
          minItems: 1,
          uniqueItems: true,
        }),
        fields: Type.Array(PublicAuthoringAssetFieldPolicySchema, {
          uniqueItems: true,
        }),
      },
      { additionalProperties: false },
    ),
    content: Type.Object(
      {
        pageTitleEntryIds: Type.Array(NamespacedIdSchema, {
          uniqueItems: true,
        }),
        primaryActionEntryIds: Type.Array(NamespacedIdSchema, {
          uniqueItems: true,
        }),
        headingLevels: Type.Array(
          Type.Union([
            Type.Literal('h1'),
            Type.Literal('h2'),
            Type.Literal('h3'),
            Type.Literal('h4'),
            Type.Literal('h5'),
            Type.Literal('h6'),
          ]),
          { minItems: 1, uniqueItems: true },
        ),
        /** Omit to let the author compose page titles freely. */
        pageTitleCount: Type.Optional(Type.Integer({ minimum: 1, maximum: 1 })),
        /** Omit to let the author compose calls to action freely. */
        primaryActionMaxCount: Type.Optional(Type.Integer({ minimum: 1 })),
      },
      { additionalProperties: false },
    ),
  },
  { additionalProperties: false },
)

export type PublicAuthoringPolicy = Static<
  typeof PublicAuthoringPolicySchema
>
