import { describe, expect, it } from 'bun:test'
import { creatorSignalComponentLibraryEntries } from '../../../integrations/creator-signal/component-library'
import {
  creatorSignalDesignSystemDependency,
  creatorSignalPublicAuthoringContract,
  isCreatorSignalComponentPermitted,
  isCreatorSignalPatternPermitted,
  isCreatorSignalVariantPermitted,
} from '../../../integrations/creator-signal/public-authoring-contract'
import { pack } from '../../../integrations/creator-signal/pack/site'

describe('Creator Signal public authoring contract', () => {
  it('depends on generated master design-system adapters instead of copied token values', () => {
    expect(creatorSignalDesignSystemDependency).toEqual({
      packageName: '@creator-signal/design-system',
      repository: 'creator-signal/sales-pulse',
      packagePath: 'packages/design-system',
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

  it('allow-lists every Creator Signal catalogue entry and only governed variants', () => {
    for (const entry of creatorSignalComponentLibraryEntries) {
      expect(isCreatorSignalComponentPermitted(entry.id)).toBe(true)
      expect(entry.variants.length).toBeGreaterThan(0)
      for (const variant of entry.variants) {
        expect(isCreatorSignalVariantPermitted(entry.id, variant.id)).toBe(true)
      }
    }

    expect(isCreatorSignalComponentPermitted('creator-signal.site.unapproved')).toBe(false)
    expect(isCreatorSignalVariantPermitted('creator-signal.site.hero', 'custom')).toBe(false)
  })

  it('allow-lists the public starter patterns already exposed by the pack', () => {
    const permittedLayoutIds = creatorSignalPublicAuthoringContract.permittedPatterns
      .map((pattern) => pattern.layoutId)

    expect(pack.layouts.map((layout) => layout.id)).toEqual(permittedLayoutIds)
    for (const layoutId of permittedLayoutIds) {
      expect(isCreatorSignalPatternPermitted(layoutId)).toBe(true)
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
      pageTitleCount: 1,
      primaryActionCount: 1,
    })
  })
})
