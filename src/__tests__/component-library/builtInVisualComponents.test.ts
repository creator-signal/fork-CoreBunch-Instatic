import { describe, expect, it } from 'bun:test'
import {
  builtInVisualComponentRegistry,
  parseVisualComponent,
  resolveVisualComponent,
} from '@core/visual-components-schema'
import { publishPage } from '@core/publisher'
import { validatePages } from '@core/persistence/validate'
import { registry } from '@core/module-engine'
import type { Page, SiteDocument } from '@core/page-tree'
import {
  BUILT_IN_VISUAL_COMPONENT_LIBRARY_ENTRIES,
  BUILT_IN_VISUAL_COMPONENTS,
} from '@modules/base/componentLibraryVisualComponents'
import '@modules/base'
import { makePage, makeSite } from '../fixtures'

describe('built-in Visual Components', () => {
  it('registers valid immutable definitions for every catalogue entry', () => {
    for (const definition of BUILT_IN_VISUAL_COMPONENTS) {
      expect(parseVisualComponent(definition)).not.toBeNull()
      expect(builtInVisualComponentRegistry.get(definition.id)).toBe(definition)
      expect(resolveVisualComponent([], definition.id)).toBe(definition)
    }

    const componentIds = new Set(
      BUILT_IN_VISUAL_COMPONENTS.map((definition) => definition.id),
    )
    for (const entry of BUILT_IN_VISUAL_COMPONENT_LIBRARY_ENTRIES) {
      expect(entry.implementation.type).toBe('visual-component')
      if (entry.implementation.type === 'visual-component') {
        expect(componentIds.has(entry.implementation.componentId)).toBe(true)
      }
    }
  })

  it('lets a site definition explicitly override a built-in ID', () => {
    const original = BUILT_IN_VISUAL_COMPONENTS[0]!
    const override = { ...original, name: 'Site Hero' }
    expect(resolveVisualComponent([override], original.id)).toBe(override)
  })

  it('publishes a built-in Hero without copying its definition into the site', () => {
    const page = makePage({
      nodes: {
        root: {
          id: 'root',
          moduleId: 'base.body',
          props: {},
          breakpointOverrides: {},
          children: ['hero'],
          classIds: [],
          parentId: null,
        },
        hero: {
          id: 'hero',
          moduleId: 'base.visual-component-ref',
          props: {
            componentId: 'base.vc.hero',
            propOverrides: {
              heading: 'Governed hero',
              body: '<p>Shared renderer.</p>',
              variant: 'image-left',
            },
          },
          breakpointOverrides: {},
          children: [],
          classIds: [],
          parentId: 'root',
          catalogueInstance: {
            entryId: 'base.hero',
            entryVersion: '1.0.0',
            variantId: 'image-left',
          },
        },
      },
    }) as Page
    const site = makeSite({
      pages: [page],
      visualComponents: [],
    }) as SiteDocument

    const result = publishPage(page, site, registry)

    expect(result.html).toContain('data-instatic-component="hero"')
    expect(result.html).toContain('Governed hero')
    expect(result.html).toContain('<p>Shared renderer.</p>')
    expect(result.html).toContain('data-variant="image-left"')
  })

  it('preserves built-in references and reconciles their managed slots on load', () => {
    const page = makePage({
      nodes: {
        root: {
          id: 'root',
          moduleId: 'base.body',
          props: {},
          breakpointOverrides: {},
          children: ['hero'],
          classIds: [],
        },
        hero: {
          id: 'hero',
          moduleId: 'base.visual-component-ref',
          props: {
            componentId: 'base.vc.hero',
            propOverrides: {},
          },
          breakpointOverrides: {},
          children: [],
          classIds: [],
          catalogueInstance: {
            entryId: 'base.hero',
            entryVersion: '1.0.0',
          },
        },
      },
    })
    const site = makeSite({ pages: [page], visualComponents: [] })

    const [validated] = validatePages(site, [page], [])
    const hero = validated!.nodes.hero!

    expect(hero).toBeDefined()
    expect(hero.children).toHaveLength(1)
    const slot = validated!.nodes[hero.children[0]!]!
    expect(slot.moduleId).toBe('base.slot-instance')
    expect(slot.props.slotName).toBe('actions')
  })
})
