import { describe, expect, it } from 'bun:test'
import {
  builtInVisualComponentRegistry,
  parseVisualComponent,
  resolveVisualComponent,
} from '@core/visual-components-schema'
import { collectSlotOutletNames } from '@core/visualComponents'
import { publishPage } from '@core/publisher'
import { validatePages } from '@core/persistence/validate'
import { registry } from '@core/module-engine'
import {
  creatorSignalCatalogueEntryId,
  type Page,
  type SiteDocument,
} from '@core/page-tree'
import {
  BUILT_IN_VISUAL_COMPONENT_LIBRARY_ENTRIES,
  BUILT_IN_VISUAL_COMPONENTS,
} from '@modules/base/componentLibraryVisualComponents'
import {
  BUILT_IN_INTERACTIVE_COMPONENT_LIBRARY_ENTRIES,
  BUILT_IN_INTERACTIVE_VISUAL_COMPONENTS,
} from '@modules/base/componentLibraryInteractiveVisualComponents'
import {
  BUILT_IN_DESIGN_COMPONENT_LIBRARY_ENTRIES,
  BUILT_IN_DESIGN_VISUAL_COMPONENTS,
} from '@modules/base/componentLibraryDesignVisualComponents'
import {
  BUILT_IN_FORM_VISUAL_COMPONENT_LIBRARY_ENTRIES,
  BUILT_IN_FORM_VISUAL_COMPONENTS,
} from '@modules/base/componentLibraryFormVisualComponents'
import {
  BUILT_IN_CANONICAL_VISUAL_COMPONENT_LIBRARY_ENTRIES,
  BUILT_IN_CANONICAL_VISUAL_COMPONENTS,
} from '@modules/base/componentLibraryCanonicalVisualComponents'
import { BUILT_IN_COMPONENT_LIBRARY_ENTRIES } from '@modules/base/componentLibrary'
import '@modules/base'
import { makePage, makeSite } from '../fixtures'

const publicId = creatorSignalCatalogueEntryId

describe('built-in Visual Components', () => {
  it('registers valid immutable definitions for every catalogue entry', () => {
    const definitions = [
      ...BUILT_IN_VISUAL_COMPONENTS,
      ...BUILT_IN_INTERACTIVE_VISUAL_COMPONENTS,
      ...BUILT_IN_DESIGN_VISUAL_COMPONENTS,
      ...BUILT_IN_FORM_VISUAL_COMPONENTS,
      ...BUILT_IN_CANONICAL_VISUAL_COMPONENTS,
    ]
    for (const definition of definitions) {
      expect(parseVisualComponent(definition)).not.toBeNull()
      expect(builtInVisualComponentRegistry.get(definition.id)).toBe(definition)
      expect(resolveVisualComponent([], definition.id)).toBe(definition)
    }

    const componentIds = new Set(
      definitions.map((definition) => definition.id),
    )
    const entries = [
      ...BUILT_IN_VISUAL_COMPONENT_LIBRARY_ENTRIES,
      ...BUILT_IN_INTERACTIVE_COMPONENT_LIBRARY_ENTRIES,
      ...BUILT_IN_DESIGN_COMPONENT_LIBRARY_ENTRIES.filter(
        (entry) => entry.implementation.type === 'visual-component',
      ),
      ...BUILT_IN_FORM_VISUAL_COMPONENT_LIBRARY_ENTRIES,
      ...BUILT_IN_CANONICAL_VISUAL_COMPONENT_LIBRARY_ENTRIES,
    ]
    for (const entry of entries) {
      expect(entry.implementation.type).toBe('visual-component')
      if (entry.implementation.type === 'visual-component') {
        expect(componentIds.has(entry.implementation.componentId)).toBe(true)
      }
    }
  })

  it('only exposes slots on explicit composition containers', () => {
    const definitions = [
      ...BUILT_IN_VISUAL_COMPONENTS,
      ...BUILT_IN_INTERACTIVE_VISUAL_COMPONENTS,
      ...BUILT_IN_DESIGN_VISUAL_COMPONENTS,
      ...BUILT_IN_FORM_VISUAL_COMPONENTS,
      ...BUILT_IN_CANONICAL_VISUAL_COMPONENTS,
    ]
    const byId = new Map(definitions.map((definition) => [definition.id, definition]))

    for (const entry of BUILT_IN_COMPONENT_LIBRARY_ENTRIES) {
      if (entry.slots.length > 0) expect(entry.composition).toBe('container')
      if (entry.composition === 'leaf') expect(entry.slots).toEqual([])
      if ((entry.constraints.allowedChildEntryIds?.length ?? 0) > 0) {
        expect(entry.composition).toBe('container')
      }
      if (entry.implementation.type !== 'visual-component') continue
      const definition = byId.get(entry.implementation.componentId)
      if (entry.composition === 'leaf' && definition) {
        expect(collectSlotOutletNames(definition.tree)).toEqual([])
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
            entryId: publicId('base.hero'),
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

  it('publishes interactive slot content through the shared overlay runtime', () => {
    const page = makePage({
      nodes: {
        root: {
          id: 'root',
          moduleId: 'base.body',
          props: {},
          breakpointOverrides: {},
          children: ['dialog'],
          classIds: [],
          parentId: null,
        },
        dialog: {
          id: 'dialog',
          moduleId: 'base.visual-component-ref',
          props: {
            componentId: 'base.vc.dialog',
            propOverrides: {
              triggerLabel: 'Open policy',
              title: 'Policy details',
            },
          },
          breakpointOverrides: {},
          children: ['content-slot', 'actions-slot'],
          classIds: [],
          parentId: 'root',
          catalogueInstance: {
            entryId: publicId('base.dialog'),
            entryVersion: '1.0.0',
          },
        },
        'content-slot': {
          id: 'content-slot',
          moduleId: 'base.slot-instance',
          props: { slotName: 'content' },
          breakpointOverrides: {},
          children: ['dialog-copy'],
          classIds: [],
          parentId: 'dialog',
        },
        'actions-slot': {
          id: 'actions-slot',
          moduleId: 'base.slot-instance',
          props: { slotName: 'actions' },
          breakpointOverrides: {},
          children: [],
          classIds: [],
          parentId: 'dialog',
        },
        'dialog-copy': {
          id: 'dialog-copy',
          moduleId: 'base.text',
          props: {
            ...registry.get('base.text')!.defaults,
            text: 'The governed policy content.',
            tag: 'p',
          },
          breakpointOverrides: {},
          children: [],
          classIds: [],
          parentId: 'content-slot',
        },
      },
    }) as Page
    const site = makeSite({
      pages: [page],
      visualComponents: [],
    }) as SiteDocument

    const result = publishPage(page, site, registry)

    expect(result.html).toContain('data-instatic-overlay')
    expect(result.html).toContain('Open policy')
    expect(result.html).toContain('aria-label="Policy details"')
    expect(result.html).toContain('<p>The governed policy content.</p>')
    expect(result.jsModuleIds).toContain('base.overlay')
  })

  it('migrates breadcrumb slot links into one typed ordered navigation list', () => {
    const page = makePage({
      nodes: {
        root: {
          id: 'root',
          moduleId: 'base.body',
          props: {},
          breakpointOverrides: {},
          children: ['breadcrumb'],
          classIds: [],
          parentId: null,
        },
        breadcrumb: {
          id: 'breadcrumb',
          moduleId: 'base.visual-component-ref',
          props: {
            componentId: 'base.vc.breadcrumb',
            propOverrides: { label: 'Page path' },
          },
          breakpointOverrides: {},
          children: ['items-slot'],
          classIds: [],
          parentId: 'root',
          catalogueInstance: {
            entryId: publicId('base.breadcrumb'),
            entryVersion: '1.0.0',
          },
        },
        'items-slot': {
          id: 'items-slot',
          moduleId: 'base.slot-instance',
          props: { slotName: 'items' },
          breakpointOverrides: {},
          children: ['home', 'news'],
          classIds: [],
          parentId: 'breadcrumb',
        },
        home: {
          id: 'home',
          moduleId: 'base.link',
          props: {
            ...registry.get('base.link')!.defaults,
            text: 'Home',
            href: '/',
          },
          breakpointOverrides: {},
          children: [],
          classIds: [],
          parentId: 'items-slot',
        },
        news: {
          id: 'news',
          moduleId: 'base.link',
          props: {
            ...registry.get('base.link')!.defaults,
            text: 'News',
            href: '/news',
          },
          breakpointOverrides: {},
          children: [],
          classIds: [],
          parentId: 'items-slot',
        },
      },
    }) as Page
    const site = makeSite({ pages: [page], visualComponents: [] }) as SiteDocument

    const [migratedPage] = validatePages(site, [page], [])
    expect(migratedPage).toBeDefined()
    const migratedBreadcrumb = migratedPage!.nodes.breadcrumb!
    expect(migratedBreadcrumb.catalogueInstance?.entryVersion).toBe('2.0.0')
    expect(migratedBreadcrumb.children).toEqual([])
    expect(migratedBreadcrumb.props.propOverrides).toMatchObject({
      items: [
        { label: 'Home', href: '/', current: false },
        { label: 'News', href: '/news', current: true },
      ],
    })

    const migratedSite = { ...site, pages: [migratedPage!] }
    const result = publishPage(migratedPage!, migratedSite, registry)

    expect(result.html).toContain(
      '<nav data-instatic-component="breadcrumb" data-variant="default" aria-label="Page path">',
    )
    expect(result.html).toContain(
      '<ol data-instatic-link-collection="breadcrumb" itemscope itemtype="https://schema.org/BreadcrumbList">' +
      '<li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">' +
      '<a itemprop="item" href="/" target="_self">' +
      '<span itemprop="name">Home</span></a>' +
      '<meta itemprop="position" content="1"></li>' +
      '<li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">' +
      '<a itemprop="item" href="/news" target="_self" aria-current="page">' +
      '<span itemprop="name">News</span></a>' +
      '<meta itemprop="position" content="2"></li></ol>',
    )
  })

  it('publishes canonical Table and hosted Media definitions', () => {
    const page = makePage({
      nodes: {
        root: {
          id: 'root',
          moduleId: 'base.body',
          props: {},
          breakpointOverrides: {},
          children: ['table', 'media'],
          classIds: [],
          parentId: null,
        },
        table: {
          id: 'table',
          moduleId: 'base.visual-component-ref',
          props: {
            componentId: 'base.vc.table',
            propOverrides: {
              caption: 'Release status',
              columns: 'Release | State',
              rows: 'Catalogue | Ready',
              firstColumnHeader: true,
            },
          },
          breakpointOverrides: {},
          children: [],
          classIds: [],
          parentId: 'root',
          catalogueInstance: {
            entryId: publicId('base.table'),
            entryVersion: '1.0.0',
          },
        },
        media: {
          id: 'media',
          moduleId: 'base.visual-component-ref',
          props: {
            componentId: 'base.vc.media',
            propOverrides: {
              kind: 'video',
              source: '/uploads/demo.mp4',
              title: 'Product demonstration',
              captionsUrl: '/uploads/demo.vtt',
              captionsLanguage: 'en-AU',
              captionsLabel: 'English captions',
            },
          },
          breakpointOverrides: {},
          children: [],
          classIds: [],
          parentId: 'root',
          catalogueInstance: {
            entryId: publicId('base.media'),
            entryVersion: '1.0.0',
            variantId: 'hosted-video',
          },
        },
      },
    }) as Page
    const site = makeSite({ pages: [page], visualComponents: [] }) as SiteDocument

    const result = publishPage(page, site, registry)

    expect(result.html).toContain('<caption>Release status</caption>')
    expect(result.html).toContain('<th scope="row">Catalogue</th>')
    expect(result.html).toContain('<video src="/uploads/demo.mp4"')
    expect(result.html).toContain(
      '<track kind="captions" src="/uploads/demo.vtt" srclang="en-AU" label="English captions" default>',
    )
  })

  it('upgrades empty legacy leaf slots without materializing new slots', () => {
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
            entryId: publicId('base.hero'),
            entryVersion: '1.0.0',
          },
        },
      },
    })
    const site = makeSite({ pages: [page], visualComponents: [] })

    const [validated] = validatePages(site, [page], [])
    const hero = validated!.nodes.hero!

    expect(hero).toBeDefined()
    expect(hero.children).toEqual([])
    expect(hero.catalogueInstance?.entryVersion).toBe('2.0.0')
    expect(hero.props.propOverrides).toMatchObject({ actions: [] })
  })

  it('preserves an unexpected legacy slot subtree instead of deleting it', () => {
    const page = makePage({
      nodes: {
        root: {
          id: 'root',
          moduleId: 'base.body',
          props: {},
          breakpointOverrides: {},
          children: ['navigation'],
          classIds: [],
        },
        navigation: {
          id: 'navigation',
          moduleId: 'base.visual-component-ref',
          props: { componentId: 'base.vc.navigation', propOverrides: {} },
          breakpointOverrides: {},
          children: ['items-slot'],
          classIds: [],
          catalogueInstance: {
            entryId: publicId('base.navigation'),
            entryVersion: '1.0.0',
          },
        },
        'items-slot': {
          id: 'items-slot',
          moduleId: 'base.slot-instance',
          props: { slotName: 'items' },
          breakpointOverrides: {},
          children: ['unexpected'],
          classIds: [],
        },
        unexpected: {
          id: 'unexpected',
          moduleId: 'base.text',
          props: { text: 'Preserve me', tag: 'p' },
          breakpointOverrides: {},
          children: [],
          classIds: [],
        },
      },
    })
    const site = makeSite({ pages: [page], visualComponents: [] })

    const [validated] = validatePages(site, [page], [])

    expect(validated!.nodes.navigation?.catalogueInstance?.entryVersion).toBe('1.0.0')
    expect(validated!.nodes.navigation?.children).toEqual(['items-slot'])
    expect(validated!.nodes['items-slot']?.children).toEqual(['unexpected'])
    expect(validated!.nodes.unexpected?.props.text).toBe('Preserve me')
  })
})
