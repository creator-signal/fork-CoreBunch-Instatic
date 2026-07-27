import { Type, type Static } from '@core/utils/typeboxHelpers'

const NAMESPACED_ID_PATTERN = '^[a-z0-9]+(?:[._-][a-z0-9]+)+$'
const LOCAL_ID_PATTERN = '^[a-z0-9]+(?:[._-][a-z0-9]+)*$'
const PROPERTY_KEY_PATTERN = '^[A-Za-z_$][A-Za-z0-9_$.-]*$'
const SEMVER_PATTERN =
  '^[0-9]+\\.[0-9]+\\.[0-9]+(?:-[0-9A-Za-z.-]+)?(?:\\+[0-9A-Za-z.-]+)?$'

const NamespacedIdSchema = Type.String({
  minLength: 3,
  pattern: NAMESPACED_ID_PATTERN,
})

const LocalIdSchema = Type.String({
  minLength: 1,
  pattern: LOCAL_ID_PATTERN,
})

const PropertyKeySchema = Type.String({
  minLength: 1,
  pattern: PROPERTY_KEY_PATTERN,
})

export const ComponentLibraryImplementationTypeSchema = Type.Union([
  Type.Literal('primitive'),
  Type.Literal('visual-component'),
  Type.Literal('pattern'),
  Type.Literal('template-component'),
  Type.Literal('capability-backed'),
])

export type ComponentLibraryImplementationType = Static<
  typeof ComponentLibraryImplementationTypeSchema
>

const PrimitiveImplementationSchema = Type.Object(
  {
    type: Type.Literal('primitive'),
    moduleId: NamespacedIdSchema,
    presetId: Type.Optional(LocalIdSchema),
  },
  { additionalProperties: false },
)

const VisualComponentImplementationSchema = Type.Object(
  {
    type: Type.Literal('visual-component'),
    componentId: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false },
)

const PatternImplementationSchema = Type.Object(
  {
    type: Type.Literal('pattern'),
    patternId: NamespacedIdSchema,
  },
  { additionalProperties: false },
)

const TemplateComponentImplementationSchema = Type.Object(
  {
    type: Type.Literal('template-component'),
    role: LocalIdSchema,
  },
  { additionalProperties: false },
)

const ComponentLibraryBackingImplementationSchema = Type.Union([
  PrimitiveImplementationSchema,
  VisualComponentImplementationSchema,
  PatternImplementationSchema,
  TemplateComponentImplementationSchema,
])

const CapabilityBackedImplementationSchema = Type.Object(
  {
    type: Type.Literal('capability-backed'),
    backing: ComponentLibraryBackingImplementationSchema,
  },
  { additionalProperties: false },
)

export const ComponentLibraryImplementationSchema = Type.Union([
  ComponentLibraryBackingImplementationSchema,
  CapabilityBackedImplementationSchema,
])

export type ComponentLibraryImplementation = Static<
  typeof ComponentLibraryImplementationSchema
>

export const ComponentLibrarySourceTypeSchema = Type.Union([
  Type.Literal('built-in'),
  Type.Literal('site'),
  Type.Literal('design-system'),
  Type.Literal('plugin'),
])

export type ComponentLibrarySourceType = Static<
  typeof ComponentLibrarySourceTypeSchema
>

export const ComponentLibrarySourceSchema = Type.Union([
  Type.Object(
    { type: Type.Literal('built-in') },
    { additionalProperties: false },
  ),
  Type.Object(
    { type: Type.Literal('site') },
    { additionalProperties: false },
  ),
  Type.Object(
    {
      type: Type.Literal('design-system'),
      id: NamespacedIdSchema,
      name: Type.String({ minLength: 1 }),
    },
    { additionalProperties: false },
  ),
  Type.Object(
    {
      type: Type.Literal('plugin'),
      pluginId: NamespacedIdSchema,
      name: Type.Optional(Type.String({ minLength: 1 })),
    },
    { additionalProperties: false },
  ),
])

export type ComponentLibrarySource = Static<typeof ComponentLibrarySourceSchema>

export const ComponentLibraryStatusSchema = Type.Union([
  Type.Literal('stable'),
  Type.Literal('experimental'),
  Type.Literal('deprecated'),
])

export type ComponentLibraryStatus = Static<typeof ComponentLibraryStatusSchema>

const ComponentLibraryFieldTypeSchema = Type.Union([
  Type.Literal('text'),
  Type.Literal('rich-text'),
  Type.Literal('number'),
  Type.Literal('boolean'),
  Type.Literal('select'),
  Type.Literal('url'),
  Type.Literal('image'),
  Type.Literal('media'),
  Type.Literal('color'),
  Type.Literal('design-token'),
])

export const ComponentLibraryFieldSchema = Type.Object(
  {
    /** Canonical backing prop key; camelCase module properties are valid. */
    key: PropertyKeySchema,
    label: Type.String({ minLength: 1 }),
    description: Type.Optional(Type.String()),
    type: ComponentLibraryFieldTypeSchema,
    required: Type.Boolean(),
    advanced: Type.Optional(Type.Boolean()),
  },
  { additionalProperties: false },
)

export type ComponentLibraryField = Static<typeof ComponentLibraryFieldSchema>

const ComponentLibraryOptionSchema = Type.Object(
  {
    id: LocalIdSchema,
    name: Type.String({ minLength: 1 }),
    description: Type.Optional(Type.String()),
    values: Type.Record(Type.String(), Type.Unknown()),
  },
  { additionalProperties: false },
)

export const ComponentLibrarySlotSchema = Type.Object(
  {
    id: LocalIdSchema,
    name: Type.String({ minLength: 1 }),
    description: Type.Optional(Type.String()),
    allowedEntryIds: Type.Optional(
      Type.Array(NamespacedIdSchema, { uniqueItems: true }),
    ),
    allowedImplementationTypes: Type.Optional(Type.Array(
      ComponentLibraryImplementationTypeSchema,
      { uniqueItems: true },
    )),
    minItems: Type.Integer({ minimum: 0 }),
    maxItems: Type.Optional(Type.Integer({ minimum: 0 })),
  },
  { additionalProperties: false },
)

export type ComponentLibrarySlot = Static<typeof ComponentLibrarySlotSchema>

export const ComponentLibraryConstraintsSchema = Type.Object(
  {
    allowedParentEntryIds: Type.Optional(
      Type.Array(NamespacedIdSchema, { uniqueItems: true }),
    ),
    allowedChildEntryIds: Type.Optional(
      Type.Array(NamespacedIdSchema, { uniqueItems: true }),
    ),
  },
  { additionalProperties: false },
)

export type ComponentLibraryConstraints = Static<
  typeof ComponentLibraryConstraintsSchema
>

export const ComponentLibraryRequirementsSchema = Type.Object(
  {
    capabilities: Type.Array(NamespacedIdSchema, { uniqueItems: true }),
    providerAdapters: Type.Array(NamespacedIdSchema, { uniqueItems: true }),
    plugins: Type.Array(NamespacedIdSchema, { uniqueItems: true }),
  },
  { additionalProperties: false },
)

export type ComponentLibraryRequirements = Static<
  typeof ComponentLibraryRequirementsSchema
>

export const ComponentLibraryDocumentationSchema = Type.Object(
  {
    usage: Type.Optional(Type.String()),
    accessibility: Type.Optional(Type.String()),
    url: Type.Optional(Type.String({ minLength: 1 })),
  },
  { additionalProperties: false },
)

export const ComponentLibraryAccessibilityRuleSchema = Type.Union([
  Type.Literal('a11y.accessible-name'),
  Type.Literal('a11y.heading-order'),
  Type.Literal('a11y.form-control-label'),
  Type.Literal('a11y.unique-field-id'),
  Type.Literal('a11y.keyboard-contract'),
  Type.Literal('a11y.focus-contract'),
  Type.Literal('a11y.announcement-contract'),
  Type.Literal('a11y.no-javascript-fallback'),
  Type.Literal('a11y.provider-fallback'),
  Type.Literal('a11y.image-alternative'),
  Type.Literal('a11y.motion-control'),
  Type.Literal('a11y.contrast'),
  Type.Literal('a11y.touch-target'),
])

export type ComponentLibraryAccessibilityRule = Static<
  typeof ComponentLibraryAccessibilityRuleSchema
>

export const ComponentLibraryAccessibilityCategorySchema = Type.Union([
  Type.Literal('semantic'),
  Type.Literal('keyboard'),
  Type.Literal('focus'),
  Type.Literal('naming'),
  Type.Literal('heading'),
  Type.Literal('form'),
  Type.Literal('media'),
  Type.Literal('motion'),
  Type.Literal('contrast'),
  Type.Literal('touch'),
  Type.Literal('provider'),
])

export type ComponentLibraryAccessibilityCategory = Static<
  typeof ComponentLibraryAccessibilityCategorySchema
>

export const ComponentLibraryAccessibilityCheckSchema = Type.Object(
  {
    rule: ComponentLibraryAccessibilityRuleSchema,
    category: ComponentLibraryAccessibilityCategorySchema,
    enforcement: Type.Union([
      Type.Literal('automated'),
      Type.Literal('behavior-test'),
      Type.Literal('manual'),
    ]),
    severity: Type.Union([
      Type.Literal('warning'),
      Type.Literal('error'),
    ]),
    fields: Type.Optional(
      Type.Array(PropertyKeySchema, { minItems: 1, uniqueItems: true }),
    ),
    summary: Type.String({ minLength: 1 }),
    remediation: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false },
)

export type ComponentLibraryAccessibilityCheck = Static<
  typeof ComponentLibraryAccessibilityCheckSchema
>

export const ComponentLibraryAccessibilityContractSchema = Type.Object(
  {
    checks: Type.Array(ComponentLibraryAccessibilityCheckSchema),
  },
  { additionalProperties: false },
)

export type ComponentLibraryAccessibilityContract = Static<
  typeof ComponentLibraryAccessibilityContractSchema
>

export const ComponentLibraryPreviewSchema = Type.Object(
  {
    type: Type.Union([Type.Literal('wireframe'), Type.Literal('image')]),
    reference: Type.String({ minLength: 1 }),
    alt: Type.Optional(Type.String()),
  },
  { additionalProperties: false },
)

export const ComponentLibraryEntrySchema = Type.Object(
  {
    id: NamespacedIdSchema,
    version: Type.String({ pattern: SEMVER_PATTERN }),
    name: Type.String({ minLength: 1 }),
    description: Type.String({ minLength: 1 }),
    category: Type.String({ minLength: 1 }),
    tags: Type.Array(Type.String({ minLength: 1 }), { uniqueItems: true }),
    icon: LocalIdSchema,
    source: ComponentLibrarySourceSchema,
    status: ComponentLibraryStatusSchema,
    replacementEntryId: Type.Optional(NamespacedIdSchema),
    implementation: ComponentLibraryImplementationSchema,
    fields: Type.Array(ComponentLibraryFieldSchema),
    variants: Type.Array(ComponentLibraryOptionSchema),
    presets: Type.Array(ComponentLibraryOptionSchema),
    slots: Type.Array(ComponentLibrarySlotSchema),
    constraints: ComponentLibraryConstraintsSchema,
    requirements: ComponentLibraryRequirementsSchema,
    documentation: ComponentLibraryDocumentationSchema,
    accessibility: Type.Optional(ComponentLibraryAccessibilityContractSchema),
    preview: Type.Optional(ComponentLibraryPreviewSchema),
  },
  { additionalProperties: false },
)

export type ComponentLibraryEntry = Static<typeof ComponentLibraryEntrySchema>

export const ComponentLibraryDependencyHealthSchema = Type.Union([
  Type.Literal('available'),
  Type.Literal('degraded'),
  Type.Literal('unavailable'),
])

export type ComponentLibraryDependencyHealth = Static<
  typeof ComponentLibraryDependencyHealthSchema
>

export const ComponentLibraryDependencyStateSchema = Type.Object(
  {
    capabilities: Type.Record(Type.String(), ComponentLibraryDependencyHealthSchema),
    providerAdapters: Type.Record(Type.String(), ComponentLibraryDependencyHealthSchema),
    plugins: Type.Record(Type.String(), ComponentLibraryDependencyHealthSchema),
  },
  { additionalProperties: false },
)

export type ComponentLibraryDependencyState = Static<
  typeof ComponentLibraryDependencyStateSchema
>

export const ComponentLibraryDependencyIssueSchema = Type.Object(
  {
    kind: Type.Union([
      Type.Literal('capability'),
      Type.Literal('provider-adapter'),
      Type.Literal('plugin'),
    ]),
    id: NamespacedIdSchema,
    health: ComponentLibraryDependencyHealthSchema,
  },
  { additionalProperties: false },
)

export type ComponentLibraryDependencyIssue = Static<
  typeof ComponentLibraryDependencyIssueSchema
>

export const ComponentLibraryAvailabilitySchema = Type.Object(
  {
    health: ComponentLibraryDependencyHealthSchema,
    issues: Type.Array(ComponentLibraryDependencyIssueSchema),
  },
  { additionalProperties: false },
)

export type ComponentLibraryAvailability = Static<
  typeof ComponentLibraryAvailabilitySchema
>
