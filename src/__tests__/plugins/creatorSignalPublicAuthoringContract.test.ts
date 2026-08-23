import { describe, expect, it } from 'bun:test'
import '@modules/base'
import {
  creatorSignalComponentEntries,
  creatorSignalComponentLibraryEntries,
  creatorSignalPatternEntries,
} from '../../../integrations/creator-signal/component-library'
import { creatorSignalCompositionCss } from '../../../integrations/creator-signal/pack/design-system'
import {
  creatorSignalDesignSystemDependency,
  creatorSignalPublicPatternCatalogue,
  creatorSignalPublicAuthoringContract,
  creatorSignalPublicAuthoringPolicy,
  isCreatorSignalComponentPermitted,
  isCreatorSignalPatternPermitted,
  isCreatorSignalVariantPermitted,
} from '../../../integrations/creator-signal/public-authoring-contract'
import { pack } from '../../../integrations/creator-signal/pack/site'
import { verifyCreatorSignalDesignSystem } from '../../../scripts/sync-creator-signal-design-system'

describe('Creator Signal public authoring contract', () => {
  it('versions the freely authorable reference-design contract', () => {
    expect(creatorSignalPublicAuthoringContract.version).toBe('1.2.0')
  })

  it('depends on generated master design-system adapters instead of copied token values', () => {
    expect(creatorSignalDesignSystemDependency).toEqual({
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
    })

    const serialized = JSON.stringify(creatorSignalPublicAuthoringContract)
    expect(serialized).not.toMatch(/#[0-9a-f]{3,8}\b/i)
    expect(serialized).not.toMatch(/\brgb(?:a)?\(/i)
  })

  it('verifies the pinned upstream snapshot and keeps authored CSS token-only', async () => {
    expect(await verifyCreatorSignalDesignSystem()).toEqual({
      files: 23,
      revision: '1afc33bd5a8037bb2ec79fb512423268b9b771bb',
    })

    expect(creatorSignalCompositionCss).toContain('var(--cs-surface-canvas)')
    expect(creatorSignalCompositionCss).toContain('var(--cs-type-heading1-family)')
    expect(creatorSignalCompositionCss).not.toMatch(/#[0-9a-f]{3,8}\b/i)
    expect(creatorSignalCompositionCss).not.toMatch(/\brgb(?:a)?\(/i)
    expect(creatorSignalCompositionCss).not.toMatch(/Georgia|Times New Roman|Avenir Next/i)
  })

  it('allow-lists every Creator Signal catalogue entry and only governed variants', () => {
    for (const entry of creatorSignalComponentEntries) {
      expect(isCreatorSignalComponentPermitted(entry.id)).toBe(true)
      expect(entry.variants.length).toBeGreaterThan(0)
      for (const variant of entry.variants) {
        expect(isCreatorSignalVariantPermitted(entry.id, variant.id)).toBe(true)
      }
    }
    for (const entry of creatorSignalPatternEntries) {
      expect(isCreatorSignalPatternPermitted(entry.id)).toBe(true)
      expect(entry.implementation).toEqual({ type: 'pattern', patternId: entry.id })
    }

    expect(isCreatorSignalComponentPermitted('creator-signal.site.unapproved')).toBe(false)
    expect(isCreatorSignalVariantPermitted('creator-signal.site.hero', 'custom')).toBe(false)
  })

  it('does not expose freeform starter layouts outside the governed catalogue', () => {
    const patternOwnedIds = creatorSignalPublicPatternCatalogue
      .filter((pattern) => pattern.ownership === 'pattern')
      .map((pattern) => pattern.layoutId)
    const componentMappings = creatorSignalPublicPatternCatalogue
      .filter((pattern) => pattern.ownership === 'component')

    expect(pack.layouts).toEqual([])
    expect(creatorSignalPatternEntries.map((entry) => entry.id)).toEqual(patternOwnedIds)
    for (const layoutId of creatorSignalPublicAuthoringContract.permittedPatterns.map(
      (pattern) => pattern.layoutId,
    )) {
      expect(isCreatorSignalPatternPermitted(layoutId)).toBe(true)
    }
    for (const mapping of componentMappings) {
      expect(creatorSignalComponentLibraryEntries.some(
        (entry) => entry.id === mapping.entryId,
      )).toBe(true)
    }
    expect(isCreatorSignalPatternPermitted('freeform-brand-experiment')).toBe(false)
  })

  it('uses semantic styling, theme, responsive and asset roles', () => {
    expect(creatorSignalPublicAuthoringContract.semanticStyling).toMatchObject({
      colours: 'design-token-only',
      typography: 'design-token-only',
      spacing: 'design-token-only',
      radius: 'design-token-only',
      shadows: 'design-token-only',
      motion: 'design-token-only',
    })
    expect(creatorSignalPublicAuthoringContract.themes).toEqual({
      modes: ['system', 'light', 'dark'],
      defaultMode: 'system',
      tokenSource: 'design-system',
    })
    expect(creatorSignalPublicAuthoringContract.responsive).toEqual({
      breakpointSource: 'design-system',
      authoring: 'semantic-only',
      previewStates: ['mobile', 'tablet', 'desktop'],
    })
    expect(creatorSignalPublicAuthoringContract.assets.source).toBe('instatic-media')
    expect(creatorSignalPublicAuthoringContract.assets.essentialTextInImages).toBe(false)
    expect(creatorSignalPublicAuthoringContract.content).toMatchObject({
      headingHierarchy: 'semantic',
      requiredAlternativeTextForInformativeImages: true,
    })
    expect(creatorSignalPublicAuthoringPolicy.content).toMatchObject({
      pageTitleEntryIds: [],
      primaryActionEntryIds: [],
    })
    expect(pack.publicAuthoring).toEqual(creatorSignalPublicAuthoringPolicy)
  })
})
