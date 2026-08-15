export const creatorSignalDesignSystemDependency = {
  packageName: '@creator-signal/design-system',
  repository: 'creator-signal/sales-pulse',
  packagePath: 'packages/design-system',
  lockPath: 'integrations/creator-signal/design-system/lock.json',
  syncCommand: 'bun run creator-signal:design-system:sync -- --source-root <sales-pulse-checkout>',
  adapters: {
    css: '@creator-signal/design-system/tokens.css',
    json: '@creator-signal/design-system/adapters.json',
    metadata: '@creator-signal/design-system/metadata.json',
  },
} as const

export const creatorSignalPublicPatternCatalogue = [
  { layoutId: 'creator-signal.site.pattern.hero', role: 'hero', ownership: 'component', entryId: 'creator-signal.site.hero' },
  { layoutId: 'creator-signal.site.pattern.content-page', role: 'content-page', ownership: 'pattern', patternId: 'creator-signal.site.pattern.content-page' },
  { layoutId: 'creator-signal.site.pattern.product-page', role: 'product-page', ownership: 'pattern', patternId: 'creator-signal.site.pattern.product-page' },
  { layoutId: 'creator-signal.site.pattern.pricing-page', role: 'pricing', ownership: 'pattern', patternId: 'creator-signal.site.pattern.pricing-page' },
  { layoutId: 'creator-signal.site.pattern.features-page', role: 'features', ownership: 'pattern', patternId: 'creator-signal.site.pattern.features-page' },
  { layoutId: 'creator-signal.site.pattern.call-to-action', role: 'call-to-action', ownership: 'component', entryId: 'creator-signal.site.call-to-action' },
  { layoutId: 'creator-signal.site.pattern.faq', role: 'faq', ownership: 'component', entryId: 'creator-signal.site.faq' },
  { layoutId: 'creator-signal.site.pattern.contact-page', role: 'contact', ownership: 'pattern', patternId: 'creator-signal.site.pattern.contact-page' },
  { layoutId: 'creator-signal.site.pattern.legal-trust-page', role: 'legal-trust', ownership: 'pattern', patternId: 'creator-signal.site.pattern.legal-trust-page' },
  { layoutId: 'creator-signal.site.pattern.article-content-page', role: 'article-content', ownership: 'pattern', patternId: 'creator-signal.site.pattern.article-content-page' },
  { layoutId: 'creator-signal.site.pattern.comparison-section', role: 'comparison-section', ownership: 'pattern', patternId: 'creator-signal.site.pattern.comparison-section' },
  { layoutId: 'creator-signal.site.pattern.empty-state', role: 'empty-state', ownership: 'pattern', patternId: 'creator-signal.site.pattern.empty-state' },
  { layoutId: 'creator-signal.site.pattern.error-state', role: 'error-state', ownership: 'pattern', patternId: 'creator-signal.site.pattern.error-state' },
  { layoutId: 'creator-signal.site.pattern.offline-state', role: 'offline-state', ownership: 'pattern', patternId: 'creator-signal.site.pattern.offline-state' },
] as const

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
    { entryId: 'creator-signal.site.comparison-section', variants: ['default'], assetRoles: [], constraints: { allowedDocumentKinds: ['page'] } },
    { entryId: 'creator-signal.site.recovery-state', variants: ['default'], assetRoles: [], constraints: { allowedDocumentKinds: ['page'], maxInstancesPerDocument: 1 } },
    { entryId: 'creator-signal.site.public-document', variants: ['default'], assetRoles: [], constraints: { allowedDocumentKinds: ['page'] } },
    { entryId: 'creator-signal.site.mautic-form', variants: ['default'], assetRoles: [], constraints: { allowedDocumentKinds: ['page'] } },
  ],
  permittedPatterns: creatorSignalPublicPatternCatalogue,
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

export function creatorSignalPatternForRole(
  role: typeof creatorSignalPublicPatternCatalogue[number]['role'],
) {
  return creatorSignalPublicPatternCatalogue.find((pattern) => pattern.role === role)!
}
