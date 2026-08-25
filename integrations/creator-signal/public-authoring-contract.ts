import type { PublicAuthoringPolicy } from '@core/page-tree'

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

export const creatorSignalPublicPatternRootModuleId = 'base.container'

export function creatorSignalPublicPatternRootProps(
  patternId: string,
): Record<string, unknown> {
  return {
    tag: 'div',
    customTag: '',
    htmlAttributes: { 'data-creator-signal-pattern': patternId },
  }
}

export const creatorSignalPublicPatternCatalogue = [
  { layoutId: 'creator-signal.site.pattern.hero', role: 'hero', ownership: 'component', entryId: 'creator-signal.site.hero' },
  { layoutId: 'creator-signal.site.pattern.home-v2-page', role: 'home-v2', ownership: 'pattern', patternId: 'creator-signal.site.pattern.home-v2-page', childEntryIds: ['creator-signal.site.campaign-hero', 'creator-signal.site.signal-strip', 'creator-signal.site.signal-comparison', 'creator-signal.site.feature-grid', 'creator-signal.site.process-steps', 'creator-signal.site.feature-grid', 'creator-signal.site.feature-grid', 'creator-signal.site.pricing-plans', 'creator-signal.site.founder-story', 'creator-signal.site.faq', 'creator-signal.site.call-to-action'] },
  { layoutId: 'creator-signal.site.pattern.early-access-page', role: 'early-access', ownership: 'pattern', patternId: 'creator-signal.site.pattern.early-access-page', childEntryIds: ['creator-signal.site.campaign-hero', 'creator-signal.site.signal-strip', 'creator-signal.site.feature-grid', 'creator-signal.site.two-column-layout', 'creator-signal.site.feature-grid', 'creator-signal.site.feature-grid', 'creator-signal.site.testimonial'] },
  { layoutId: 'creator-signal.site.pattern.content-page', role: 'content-page', ownership: 'pattern', patternId: 'creator-signal.site.pattern.content-page', childEntryIds: ['creator-signal.site.hero', 'creator-signal.site.rich-text-section', 'creator-signal.site.call-to-action'] },
  { layoutId: 'creator-signal.site.pattern.product-page', role: 'product-page', ownership: 'pattern', patternId: 'creator-signal.site.pattern.product-page', childEntryIds: ['creator-signal.site.hero', 'creator-signal.site.feature-grid', 'creator-signal.site.call-to-action'] },
  { layoutId: 'creator-signal.site.pattern.pricing-page', role: 'pricing', ownership: 'pattern', patternId: 'creator-signal.site.pattern.pricing-page', childEntryIds: ['creator-signal.site.hero', 'creator-signal.site.feature-grid', 'creator-signal.site.call-to-action'] },
  { layoutId: 'creator-signal.site.pattern.features-page', role: 'features', ownership: 'pattern', patternId: 'creator-signal.site.pattern.features-page', childEntryIds: ['creator-signal.site.hero', 'creator-signal.site.feature-grid'] },
  { layoutId: 'creator-signal.site.pattern.call-to-action', role: 'call-to-action', ownership: 'component', entryId: 'creator-signal.site.call-to-action' },
  { layoutId: 'creator-signal.site.pattern.faq', role: 'faq', ownership: 'component', entryId: 'creator-signal.site.faq' },
  { layoutId: 'creator-signal.site.pattern.contact-page', role: 'contact', ownership: 'pattern', patternId: 'creator-signal.site.pattern.contact-page', childEntryIds: ['creator-signal.site.hero', 'creator-signal.site.two-column-layout'] },
  { layoutId: 'creator-signal.site.pattern.feedback-page', role: 'feedback', ownership: 'pattern', patternId: 'creator-signal.site.pattern.feedback-page', childEntryIds: ['creator-signal.site.hero', 'creator-signal.site.two-column-layout'] },
  { layoutId: 'creator-signal.site.pattern.legal-trust-page', role: 'legal-trust', ownership: 'pattern', patternId: 'creator-signal.site.pattern.legal-trust-page', childEntryIds: ['creator-signal.site.public-document'] },
  { layoutId: 'creator-signal.site.pattern.article-content-page', role: 'article-content', ownership: 'pattern', patternId: 'creator-signal.site.pattern.article-content-page', childEntryIds: ['creator-signal.site.hero', 'creator-signal.site.rich-text-section'] },
  { layoutId: 'creator-signal.site.pattern.comparison-section', role: 'comparison-section', ownership: 'pattern', patternId: 'creator-signal.site.pattern.comparison-section', childEntryIds: ['creator-signal.site.comparison-section'] },
  { layoutId: 'creator-signal.site.pattern.empty-state', role: 'empty-state', ownership: 'pattern', patternId: 'creator-signal.site.pattern.empty-state', childEntryIds: ['creator-signal.site.recovery-state'] },
  { layoutId: 'creator-signal.site.pattern.error-state', role: 'error-state', ownership: 'pattern', patternId: 'creator-signal.site.pattern.error-state', childEntryIds: ['creator-signal.site.recovery-state'] },
  { layoutId: 'creator-signal.site.pattern.offline-state', role: 'offline-state', ownership: 'pattern', patternId: 'creator-signal.site.pattern.offline-state', childEntryIds: ['creator-signal.site.recovery-state'] },
  { layoutId: 'creator-signal.site.pattern.not-found-state', role: 'not-found-state', ownership: 'pattern', patternId: 'creator-signal.site.pattern.not-found-state', childEntryIds: ['creator-signal.site.recovery-state'] },
] as const

export const creatorSignalPublicAuthoringContract = {
  id: 'creator-signal.public-authoring',
  version: '1.5.0',
  designSystem: creatorSignalDesignSystemDependency,
  permittedComponents: [
    {
      entryId: 'creator-signal.site.hero',
      variants: ['default'],
      assetRoles: ['hero-artwork'],
      constraints: {
        allowedDocumentKinds: ['page', 'template'],
      },
    },
    {
      entryId: 'creator-signal.site.campaign-hero',
      variants: ['default'],
      assetRoles: ['hero-artwork'],
      constraints: {
        allowedDocumentKinds: ['page', 'template'],
      },
    },
    { entryId: 'creator-signal.site.header', variants: ['default'], assetRoles: [], constraints: { allowedDocumentKinds: ['page', 'template'] } },
    { entryId: 'creator-signal.site.footer', variants: ['default'], assetRoles: [], constraints: { allowedDocumentKinds: ['page', 'template'] } },
    { entryId: 'creator-signal.site.consent-banner', variants: ['default'], assetRoles: [], constraints: { allowedDocumentKinds: ['page', 'template'] } },
    { entryId: 'creator-signal.site.feature-grid', variants: ['default'], assetRoles: [], constraints: { allowedDocumentKinds: ['page', 'template'] } },
    { entryId: 'creator-signal.site.signal-strip', variants: ['default'], assetRoles: [], constraints: { allowedDocumentKinds: ['page', 'template'] } },
    { entryId: 'creator-signal.site.signal-comparison', variants: ['default'], assetRoles: ['product-artwork'], constraints: { allowedDocumentKinds: ['page', 'template'] } },
    { entryId: 'creator-signal.site.process-steps', variants: ['default'], assetRoles: [], constraints: { allowedDocumentKinds: ['page', 'template'] } },
    { entryId: 'creator-signal.site.pricing-plans', variants: ['default'], assetRoles: [], constraints: { allowedDocumentKinds: ['page', 'template'] } },
    { entryId: 'creator-signal.site.founder-story', variants: ['default'], assetRoles: ['content-image'], constraints: { allowedDocumentKinds: ['page', 'template'] } },
    { entryId: 'creator-signal.site.call-to-action', variants: ['default'], assetRoles: [], constraints: { allowedDocumentKinds: ['page', 'template'] } },
    { entryId: 'creator-signal.site.rich-text-section', variants: ['default'], assetRoles: [], constraints: { allowedDocumentKinds: ['page', 'template'] } },
    { entryId: 'creator-signal.site.testimonial', variants: ['default'], assetRoles: [], constraints: { allowedDocumentKinds: ['page', 'template'] } },
    { entryId: 'creator-signal.site.faq', variants: ['default'], assetRoles: [], constraints: { allowedDocumentKinds: ['page', 'template'] } },
    { entryId: 'creator-signal.site.comparison-section', variants: ['default'], assetRoles: [], constraints: { allowedDocumentKinds: ['page', 'template'] } },
    { entryId: 'creator-signal.site.recovery-state', variants: ['default'], assetRoles: [], constraints: { allowedDocumentKinds: ['page', 'template'] } },
    { entryId: 'creator-signal.site.public-document', variants: ['default'], assetRoles: [], constraints: { allowedDocumentKinds: ['page', 'template'] } },
    { entryId: 'creator-signal.site.mautic-form', variants: ['default'], assetRoles: [], constraints: { allowedDocumentKinds: ['page', 'template'] } },
    { entryId: 'creator-signal.site.section-intro', variants: ['default'], assetRoles: [], constraints: { allowedDocumentKinds: ['page', 'template'] } },
    { entryId: 'creator-signal.site.two-column-layout', variants: ['default'], assetRoles: [], constraints: { allowedDocumentKinds: ['page', 'template'] } },
    { entryId: 'creator-signal.site.crm-iframe-form', variants: ['default'], assetRoles: [], constraints: { allowedDocumentKinds: ['page', 'template'] } },
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
    fields: [{
      entryId: 'creator-signal.site.hero',
      fieldKey: 'creator-signal.site.hero.artwork',
      role: 'hero-artwork',
      treatment: 'contain',
    }, {
      entryId: 'creator-signal.site.campaign-hero',
      fieldKey: 'artwork',
      role: 'hero-artwork',
      treatment: 'cover',
    }, {
      entryId: 'creator-signal.site.signal-comparison',
      fieldKey: 'artwork',
      role: 'product-artwork',
      treatment: 'cover',
    }, {
      entryId: 'creator-signal.site.founder-story',
      fieldKey: 'portrait',
      role: 'content-image',
      treatment: 'cover',
    }],
    essentialTextInImages: false,
  },
  content: {
    headingHierarchy: 'semantic',
    headingLevels: ['h1', 'h2', 'h3'],
    requiredAlternativeTextForInformativeImages: true,
  },
} as const

export type CreatorSignalPublicAuthoringContract =
  typeof creatorSignalPublicAuthoringContract

/**
 * Site-owned policy installed with the technical pack. Every list is derived
 * from the public contract above so the integration has one machine-readable
 * authoring source of truth.
 */
export const creatorSignalPublicAuthoringPolicy: PublicAuthoringPolicy = {
  id: creatorSignalPublicAuthoringContract.id,
  version: creatorSignalPublicAuthoringContract.version,
  ownerPluginId: 'creator-signal.site',
  allowedComponentEntryIds:
    creatorSignalPublicAuthoringContract.permittedComponents.map((entry) => entry.entryId),
  allowedPatternEntryIds:
    creatorSignalPublicAuthoringContract.permittedPatterns
      .filter((entry) => entry.ownership === 'pattern')
      .map((entry) => entry.patternId),
  patterns: creatorSignalPublicAuthoringContract.permittedPatterns
    .filter((entry) => entry.ownership === 'pattern')
    .map((entry) => ({
      entryId: entry.patternId,
      rootModuleId: creatorSignalPublicPatternRootModuleId,
      rootProps: creatorSignalPublicPatternRootProps(entry.patternId),
      childEntryIds: [...entry.childEntryIds],
    })),
  allowedVariants: Object.fromEntries([
    ...creatorSignalPublicAuthoringContract.permittedComponents.map((entry) => [
      entry.entryId,
      [...entry.variants],
    ]),
    ...creatorSignalPublicAuthoringContract.permittedPatterns
      .filter((entry) => entry.ownership === 'pattern')
      .map((entry) => [entry.patternId, ['default']]),
  ]),
  allowedStructuralModuleIds: ['base.body', 'base.container', 'base.outlet', 'base.slot-instance'],
  protectedVisualComponentIds: [
    'creator-signal.site/component/hero',
    'creator-signal.site/component/two-column-layout',
  ],
  templates: [{
    pageId: 'creator-signal.site/page/site-template',
    requiredEntryIds: [],
  }],
  appearance: { mode: 'component-owned' },
  assets: {
    roles: [...creatorSignalPublicAuthoringContract.assets.roles],
    treatments: [...creatorSignalPublicAuthoringContract.assets.treatments],
    fields: creatorSignalPublicAuthoringContract.assets.fields.map((field) => ({ ...field })),
  },
  content: {
    pageTitleEntryIds: creatorSignalPublicAuthoringContract.permittedComponents
      .filter((entry) =>
        'headingRole' in entry.constraints &&
        entry.constraints.headingRole === 'page-title',
      )
      .map((entry) => entry.entryId),
    primaryActionEntryIds: creatorSignalPublicAuthoringContract.permittedComponents
      .filter((entry) =>
        'actionRole' in entry.constraints &&
        entry.constraints.actionRole === 'primary',
      )
      .map((entry) => entry.entryId),
    headingLevels: [...creatorSignalPublicAuthoringContract.content.headingLevels],
  },
}

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
