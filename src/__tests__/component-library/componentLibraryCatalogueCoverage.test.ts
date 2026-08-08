import { describe, expect, it } from 'bun:test'
import { creatorSignalCatalogueEntryId } from '@core/page-tree'
import { BUILT_IN_COMPONENT_LIBRARY_ENTRIES } from '@modules/base/componentLibrary'

const EXPECTED_SOURCE_IDS_BY_TYPE = {
  'template-component': [
    'base.template-header',
    'base.template-footer',
    'base.template-skip-link',
  ],
  primitive: [
    'base.section',
    'base.heading',
    'base.rich-text',
    'base.plain-text',
    'base.code-block',
    'base.image',
    'base.button',
    'base.link',
    'base.separator',
    'base.form-container',
    'base.text-input',
    'base.email-input',
    'base.telephone-input',
    'base.url-input',
    'base.number-input',
    'base.date-input',
    'base.text-area',
    'base.select',
    'base.checkbox',
    'base.switch',
    'base.hidden-field',
    'base.submit',
    'base.reset-button',
  ],
  'visual-component': [
    'base.navigation',
    'base.breadcrumb',
    'base.table-of-contents',
    'base.reusable-section',
    'base.table',
    'base.download',
    'base.progress-bar',
    'base.notice',
    'base.hero',
    'base.teaser',
    'base.card',
    'base.accordion',
    'base.tabs',
    'base.carousel',
    'base.media',
    'base.reusable-form-fragment',
    'base.icon',
    'base.badge',
    'base.quote',
    'base.person-profile',
    'base.dialog',
    'base.drawer',
    'base.pdf-viewer',
  ],
  pattern: [
    'base.grid',
    'base.card-grid',
    'base.list',
    'base.gallery',
    'base.form-panel',
    'base.form-accordion',
    'base.form-tabs',
    'base.checkbox-group',
    'base.radio-group',
    'base.previous-next-actions',
    'base.form-summary-review',
    'base.icon-list',
    'base.statistics',
    'base.logo-cloud',
    'base.timeline',
    'base.steps',
    'base.comparison-table',
    'base.faq-list',
    'base.empty-state',
  ],
  'capability-backed': [
    'base.language-navigation',
    'base.structured-content',
    'base.structured-content-list',
    'base.shared-content-fragment',
    'base.wizard',
    'base.file-attachment',
    'base.terms-and-conditions',
    'base.captcha',
    'base.save-draft',
    'base.search',
    'base.embed',
    'base.form-embed',
    'base.map',
    'base.share-links',
  ],
} as const

describe('issue #11 complete default catalogue', () => {
  const bySourceId = new Map(
    BUILT_IN_COMPONENT_LIBRARY_ENTRIES.map((entry) => [
      entry.id.replace('creator-signal.site.catalogue.', 'base.'),
      entry,
    ]),
  )

  for (const [type, entryIds] of Object.entries(EXPECTED_SOURCE_IDS_BY_TYPE)) {
    it(`represents every requested ${type} entry with that taxonomy`, () => {
      for (const entryId of entryIds) {
        const entry = bySourceId.get(entryId)
        expect(entry?.id, entryId).toBe(creatorSignalCatalogueEntryId(entryId))
        expect(entry?.implementation.type, entryId).toBe(type)
      }
    })
  }

  it('keeps capability contracts explicit and unavailable by default', () => {
    for (const entryId of EXPECTED_SOURCE_IDS_BY_TYPE['capability-backed']) {
      const entry = bySourceId.get(entryId)
      expect(entry?.implementation.type, entryId).toBe('capability-backed')
      expect(
        (entry?.requirements.capabilities.length ?? 0) +
          (entry?.requirements.providerAdapters.length ?? 0) +
          (entry?.requirements.plugins.length ?? 0),
        entryId,
      ).toBeGreaterThan(0)
    }
  })

  it('keeps the distinct structured-content semantics on one loop foundation', () => {
    const entries = [
      bySourceId.get('base.structured-content'),
      bySourceId.get('base.structured-content-list'),
      bySourceId.get('base.shared-content-fragment'),
    ]
    expect(entries.map((entry) => entry?.name)).toEqual([
      'Structured Content',
      'Structured Content List',
      'Shared Content Fragment',
    ])
    expect(entries.map((entry) =>
      entry?.implementation.type === 'capability-backed'
        ? entry.implementation.backing
        : null,
    )).toEqual([
      { type: 'primitive', moduleId: 'base.loop', presetId: 'single-record' },
      { type: 'primitive', moduleId: 'base.loop', presetId: 'record-collection' },
      { type: 'primitive', moduleId: 'base.loop', presetId: 'content-fragment' },
    ])
  })

  it('represents Form Embed once with governed height variants', () => {
    const formEmbed = bySourceId.get('base.form-embed')
    expect(
      BUILT_IN_COMPONENT_LIBRARY_ENTRIES.filter(
        (entry) => entry.name === 'Form Embed',
      ),
    ).toHaveLength(1)
    expect(formEmbed?.variants.map((variant) => variant.id)).toEqual([
      'responsive',
      'fixed',
      'content-driven',
    ])
  })

  it('keeps Pagination as collection configuration rather than an entry', () => {
    expect(
      BUILT_IN_COMPONENT_LIBRARY_ENTRIES.some(
        (entry) => entry.name === 'Pagination',
      ),
    ).toBe(false)
    expect(bySourceId.get('base.list')?.fields.map((field) => field.key))
      .toContain('pagination')
    expect(bySourceId.get('base.structured-content-list')?.fields.map(
      (field) => field.key,
    )).toContain('pagination')
  })
})
