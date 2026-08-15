export const creatorSignalDesignSystemDependency = {
  packageName: '@creator-signal/design-system',
  repository: 'creator-signal/sales-pulse',
  packagePath: 'packages/design-system',
  adapters: {
    css: '@creator-signal/design-system/tokens.css',
    json: '@creator-signal/design-system/adapters.json',
    metadata: '@creator-signal/design-system/metadata.json',
  },
} as const

export const creatorSignalPublicAuthoringContract = {
  id: 'creator-signal.public-authoring',
  version: '1.0.0',
  designSystem: creatorSignalDesignSystemDependency,
  permittedComponents: [
    {
      entryId: 'creator-signal.site.hero',
      variants: ['default'],
      assetRoles: ['hero-artwork'],
      constraints: {
        maxInstancesPerPage: 1,
        allowedDocumentKinds: ['page'],
        headingRole: 'page-title',
        actionRole: 'primary',
      },
    },
    { entryId: 'creator-signal.site.header', variants: ['default'], assetRoles: [], constraints: { allowedDocumentKinds: ['template'], maxInstancesPerDocument: 1 } },
    { entryId: 'creator-signal.site.footer', variants: ['default'], assetRoles: [], constraints: { allowedDocumentKinds: ['template'], maxInstancesPerDocument: 1 } },
    { entryId: 'creator-signal.site.consent-banner', variants: ['default'], assetRoles: [], constraints: { allowedDocumentKinds: ['template'], maxInstancesPerDocument: 1 } },
    { entryId: 'creator-signal.site.feature-grid', variants: ['default'], assetRoles: [], constraints: { allowedDocumentKinds: ['page'] } },
    { entryId: 'creator-signal.site.call-to-action', variants: ['default'], assetRoles: [], constraints: { allowedDocumentKinds: ['page'] } },
    { entryId: 'creator-signal.site.rich-text-section', variants: ['default'], assetRoles: [], constraints: { allowedDocumentKinds: ['page'] } },
    { entryId: 'creator-signal.site.testimonial', variants: ['default'], assetRoles: [], constraints: { allowedDocumentKinds: ['page'] } },
    { entryId: 'creator-signal.site.faq', variants: ['default'], assetRoles: [], constraints: { allowedDocumentKinds: ['page'] } },
    { entryId: 'creator-signal.site.public-document', variants: ['default'], assetRoles: [], constraints: { allowedDocumentKinds: ['page'] } },
    { entryId: 'creator-signal.site.mautic-form', variants: ['default'], assetRoles: [], constraints: { allowedDocumentKinds: ['page'] } },
  ],
  permittedPatterns: [],
  semanticStyling: {
    colours: 'design-token-only',
    typography: 'design-token-only',
    spacing: 'design-token-only',
    radius: 'design-token-only',
    shadows: 'design-token-only',
    motion: 'design-token-only',
    buttonVariants: ['primary', 'secondary'],
  },
  themes: {
    modes: ['system', 'light', 'dark'],
    defaultMode: 'system',
    tokenSource: 'design-system',
  },
  responsive: {
    breakpointSource: 'design-system',
    authoring: 'semantic-only',
    previewStates: ['mobile', 'tablet', 'desktop'],
  },
  assets: {
    source: 'instatic-media',
    roles: ['hero-artwork', 'content-image', 'product-artwork', 'decorative-artwork'],
    treatments: ['default', 'contain', 'cover'],
    essentialTextInImages: false,
  },
  content: {
    headingHierarchy: 'semantic',
    pageTitleCount: 1,
    headingLevels: ['h1', 'h2', 'h3'],
    primaryActionCount: 1,
    requiredAlternativeTextForInformativeImages: true,
  },
} as const

export type CreatorSignalPublicAuthoringContract =
  typeof creatorSignalPublicAuthoringContract

export function isCreatorSignalComponentPermitted(entryId: string): boolean {
  return creatorSignalPublicAuthoringContract.permittedComponents.some(
    (component) => component.entryId === entryId,
  )
}

export function isCreatorSignalVariantPermitted(
  entryId: string,
  variantId: string,
): boolean {
  return creatorSignalPublicAuthoringContract.permittedComponents.some(
    (component) =>
      component.entryId === entryId &&
      (component.variants as readonly string[]).includes(variantId),
  )
}

export function isCreatorSignalPatternPermitted(layoutId: string): boolean {
  return creatorSignalPublicAuthoringContract.permittedPatterns.some(
    (pattern) => pattern.layoutId === layoutId,
  )
}
