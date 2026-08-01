import { describe, expect, it } from 'bun:test'
import { componentLibraryRegistry } from '@core/component-library'
import { PageSchema } from '@core/page-tree'
import { Value } from '@core/utils/typeboxHelpers'
import {
  pack,
  textShowcasePages,
} from '../../../integrations/component-showcase/pack/site'
import plugin from '../../../integrations/component-showcase/instatic-plugin.config'
import { catalogueEntriesForPage } from '../../../integrations/component-showcase/pack/textPageBuilder'
import '@modules/base'

describe('Plain Text component showcase pack', () => {
  it('requests the host permission required to import a site pack', () => {
    expect(plugin.manifest.permissions).toContain('visualComponents.register')
    expect(plugin.pack).toBe(pack)
  })

  it('ships focused pages for every Plain Text acceptance concern', () => {
    expect(textShowcasePages.map((page) => page.slug)).toEqual([
      'index',
      'samples/properties',
      'samples/semantics',
      'samples/composition',
      'samples/content-safety',
      'samples/accessibility',
    ])
    expect(pack.pages).toEqual(textShowcasePages)
  })

  it('persists valid page trees with governed catalogue metadata', () => {
    for (const page of textShowcasePages) {
      expect(Value.Check(PageSchema, page)).toBe(true)
      const entryIds = catalogueEntriesForPage(page)
      expect(entryIds).toContain('base.plain-text')
      expect(entryIds).not.toContain('Custom / Freeform')
      for (const node of Object.values(page.nodes)) {
        if (node.id === page.rootNodeId) continue
        expect(node.catalogueInstance).toBeTruthy()
        expect(
          componentLibraryRegistry.getVersion(
            node.catalogueInstance!.entryId,
            node.catalogueInstance!.entryVersion,
          ),
        ).toBeTruthy()
      }
    }
  })

  it('uses the canonical module, preset and all documented semantic samples', () => {
    const textNodes = textShowcasePages.flatMap((page) =>
      Object.values(page.nodes).filter(
        (node) => node.catalogueInstance?.entryId === 'base.plain-text',
      ))
    expect(textNodes.length).toBeGreaterThan(20)
    expect(textNodes.every((node) => node.moduleId === 'base.text')).toBe(true)
    expect(
      textNodes.every(
        (node) => node.catalogueInstance?.presetId === 'paragraph',
      ),
    ).toBe(true)
    const tags = new Set(textNodes.map((node) => node.props.tag))
    for (const tag of [
      'p',
      'h1',
      'h2',
      'small',
      'strong',
      'em',
      'span',
      'div',
      'figcaption',
      'none',
    ]) {
      expect(tags).toContain(tag)
    }
  })

  it('keeps every assigned style class inside the plugin pack', () => {
    const classIds = new Set(pack.classes.map((style) => style.id))
    for (const page of textShowcasePages) {
      for (const node of Object.values(page.nodes)) {
        for (const assignedClassId of node.classIds) {
          expect(classIds).toContain(assignedClassId)
        }
      }
    }
  })
})
