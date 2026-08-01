import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'bun:test'
import { renderComponentLibrarySpecification } from '@core/component-library/specification'
import { BUILT_IN_COMPONENT_LIBRARY_ENTRIES } from '@modules/base/componentLibrary'

const specificationPath = resolve(
  import.meta.dir,
  '../../../docs/features/component-library-specification.md',
)
const htmlContractPath = resolve(
  import.meta.dir,
  '../../../docs/reference/component-html-seo-contract.md',
)

describe('Component Library specification', () => {
  it('is generated from every executable built-in definition', () => {
    const rendered = renderComponentLibrarySpecification(
      BUILT_IN_COMPONENT_LIBRARY_ENTRIES,
    )
    expect(readFileSync(specificationPath, 'utf8')).toBe(rendered)

    for (const entry of BUILT_IN_COMPONENT_LIBRARY_ENTRIES) {
      expect(rendered).toContain(`### ${entry.name}\n`)
      expect(rendered).toContain(`- Registry ID: \`${entry.id}\``)
      for (const field of entry.fields) {
        expect(rendered).toContain(`| \`${field.key}\` | ${field.label} |`)
      }
    }
  })

  it('assigns every built-in entry to the published HTML and SEO contract', () => {
    const contract = readFileSync(htmlContractPath, 'utf8')

    for (const entry of BUILT_IN_COMPONENT_LIBRARY_ENTRIES) {
      expect(contract).toContain(`\`${entry.id}\``)
    }

    expect(contract).toContain('https://schema.org/BreadcrumbList')
    expect(contract).toContain('https://schema.org/SiteNavigationElement')
    expect(contract).toContain('ImageObject')
    expect(contract).toContain('var(--border-primary)')
    expect(contract).not.toMatch(/\bcmp-[a-z0-9_-]+/i)
  })
})
