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
import '@modules/base'
import { makePage, makeSite } from '../fixtures'

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
            entryId: 'base.dialog',
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

  it('publishes breadcrumb slot links as one labelled ordered navigation list', () => {
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
            entryId: 'base.breadcrumb',
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

    const result = publishPage(page, site, registry)

    expect(result.html).toContain(
      '<nav data-instatic-component="breadcrumb" data-variant="default" aria-label="Page path">',
    )
    expect(result.html).toContain(
      '<ol itemscope itemtype="https://schema.org/BreadcrumbList">' +
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
            entryId: 'base.table',
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
            entryId: 'base.media',
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
