import { describe, expect, it } from 'bun:test'
import {
  applyPluginPackToSite,
  parsePluginPack,
  PluginPackError,
} from '../../../server/plugins/pack'
import type { SiteDocument } from '@core/page-tree'

const baselineSite: SiteDocument = {
  id: 'default',
  name: 'Test',
  pages: [{
    id: 'home',
    title: 'Home',
    slug: 'index',
    rootNodeId: 'root',
    nodes: {
      root: {
        id: 'root',
        moduleId: 'base.body',
        props: {},
        breakpointOverrides: {},
        children: [],
        classIds: [],
      },
    },
  }],
  breakpoints: [],
  settings: {
    framework: { name: 'none' as const },
    typography: { baseFontSize: '16px', headingScale: '1.25', lineHeight: '1.5' },
    spacing: { baseUnit: '8px' },
    seo: { titleTemplate: '{title}' },
  } as unknown as SiteDocument['settings'],
  styleRules: {},
  files: [],
  visualComponents: [],
  layouts: [],
  packageJson: { name: 'site', dependencies: {}, devDependencies: {} },
  runtime: { dependencyLock: { version: 1, packages: {}, updatedAt: 0 }, scripts: {} },
  createdAt: 0,
  updatedAt: 0,
}

describe('parsePluginPack', () => {
  it('rejects classes that are not namespaced under the plugin id', () => {
    expect(() =>
      parsePluginPack('acme.canvas', {
        classes: [{
          id: 'foreign-class',
          name: 'Foreign',
          kind: 'class',
          selector: '.Foreign',
          order: 0,
          styles: {},
          contextStyles: {},
          createdAt: 0,
          updatedAt: 0,
        }],
      }),
    ).toThrow(PluginPackError)
  })

  it('accepts classes namespaced with `<pluginId>/`', () => {
    const pack = parsePluginPack('acme.canvas', {
      classes: [{
        id: 'acme.canvas/hero',
        name: 'Hero',
        kind: 'class',
        selector: '.Hero',
        order: 0,
        styles: { color: 'red' },
        contextStyles: {},
        createdAt: 0,
        updatedAt: 0,
      }],
    })
    expect(pack.classes.map((c) => c.id)).toEqual(['acme.canvas/hero'])
  })

  it('rejects classes whose name contains whitespace or invalid CSS chars', () => {
    expect(() =>
      parsePluginPack('acme.canvas', {
        classes: [{
          id: 'acme.canvas/hero',
          name: 'My Hero Class',
          kind: 'class',
          selector: '.hero',
          order: 0,
          styles: {},
          contextStyles: {},
          createdAt: 0,
          updatedAt: 0,
        }],
      }),
    ).toThrow(/valid CSS class name/)

    expect(() =>
      parsePluginPack('acme.canvas', {
        classes: [{
          id: 'acme.canvas/hero',
          name: 'hero/with-slash',
          kind: 'class',
          selector: '.hero',
          order: 0,
          styles: {},
          contextStyles: {},
          createdAt: 0,
          updatedAt: 0,
        }],
      }),
    ).toThrow(/valid CSS class name/)
  })

  it('accepts ambient selectors whose display name is not a CSS class token', () => {
    const pack = parsePluginPack('acme.canvas', {
      classes: [{
        id: 'acme.canvas/ambient-0',
        name: '*',
        kind: 'ambient',
        selector: '*',
        order: 0,
        styles: { boxSizing: 'border-box' },
        contextStyles: {},
        createdAt: 0,
        updatedAt: 0,
      }],
    })

    expect(pack.classes[0]).toMatchObject({ kind: 'ambient', selector: '*' })
  })

  it('accepts deterministic CSS conditions and rejects mismatched ids', () => {
    const pack = parsePluginPack('acme.canvas', {
      conditions: [{
        id: 'media:(max-width: 700px)',
        label: 'Small',
        condition: { kind: 'media', query: '(max-width: 700px)' },
      }],
    })
    expect(pack.conditions).toEqual([{
      id: 'media:(max-width: 700px)',
      label: 'Small',
      condition: { kind: 'media', query: '(max-width: 700px)' },
    }])

    expect(() => parsePluginPack('acme.canvas', {
      conditions: [{
        id: 'media:wrong',
        label: 'Small',
        condition: { kind: 'media', query: '(max-width: 700px)' },
      }],
    })).toThrow(/non-deterministic CSS condition/)
  })

  it('rejects malformed Visual Component entries', () => {
    expect(() =>
      parsePluginPack('acme.canvas', {
        visualComponents: [{ id: '', name: '' }],
      }),
    ).toThrow(PluginPackError)
  })
})

describe('applyPluginPackToSite', () => {
  it('inserts new entries and reports replaced ids', () => {
    const pack = {
      visualComponents: [],
      pages: [],
      classes: [{
        id: 'acme.canvas/hero',
        name: 'Hero',
        kind: 'class' as const,
        selector: '.Hero',
        order: 0,
        styles: { color: 'red' },
        contextStyles: {},
        createdAt: 0,
        updatedAt: 0,
      }],
      layouts: [],
    }

    const { site, replaced } = applyPluginPackToSite('acme.canvas', baselineSite, pack)
    expect(site.styleRules['acme.canvas/hero'].name).toBe('Hero')
    expect(replaced.classes).toEqual([])
  })

  it('replaces existing classes by id and reports the replaced ids', () => {
    const pack = {
      visualComponents: [],
      pages: [],
      classes: [{
        id: 'acme.canvas/hero',
        name: 'Hero v2',
        kind: 'class' as const,
        selector: '.Hero',
        order: 0,
        styles: { color: 'blue' },
        contextStyles: {},
        createdAt: 0,
        updatedAt: 0,
      }],
      layouts: [],
    }
    const seeded: SiteDocument = {
      ...baselineSite,
      styleRules: {
        'acme.canvas/hero': {
          id: 'acme.canvas/hero',
          name: 'Hero',
          kind: 'class',
          selector: '.Hero',
          order: 0,
          styles: { color: 'red' },
          contextStyles: {},
          createdAt: 0,
          updatedAt: 0,
        },
      },
    }
    const { site, replaced } = applyPluginPackToSite('acme.canvas', seeded, pack)
    expect(site.styleRules['acme.canvas/hero'].name).toBe('Hero v2')
    expect(replaced.classes).toEqual(['acme.canvas/hero'])
  })

  it('removes stale plugin-owned classes while preserving user classes', () => {
    const seeded: SiteDocument = {
      ...baselineSite,
      styleRules: {
        'acme.canvas/page/home/legacy': {
          id: 'acme.canvas/page/home/legacy',
          name: 'legacy',
          kind: 'class',
          selector: '.legacy',
          order: 0,
          styles: { color: 'red' },
          contextStyles: {},
          createdAt: 0,
          updatedAt: 0,
        },
        'user-class': {
          id: 'user-class',
          name: 'user-class',
          kind: 'class',
          selector: '.user-class',
          order: 0,
          styles: { color: 'blue' },
          contextStyles: {},
          createdAt: 0,
          updatedAt: 0,
        },
      },
    }

    const { site, removed } = applyPluginPackToSite('acme.canvas', seeded, {
      visualComponents: [],
      pages: [],
      classes: [],
      layouts: [],
    })

    expect(removed.classes).toEqual(['acme.canvas/page/home/legacy'])
    expect(site.styleRules['acme.canvas/page/home/legacy']).toBeUndefined()
    expect(site.styleRules['user-class']).toBeDefined()
  })

  it('merges pack CSS conditions into the site registry by deterministic id', () => {
    const { site } = applyPluginPackToSite('acme.canvas', baselineSite, {
      visualComponents: [],
      pages: [],
      classes: [],
      layouts: [],
      conditions: [{
        id: 'media:(max-width: 700px)',
        label: 'Small',
        condition: { kind: 'media' as const, query: '(max-width: 700px)' },
      }],
    })

    expect(site.conditions).toEqual([{
      id: 'media:(max-width: 700px)',
      label: 'Small',
      condition: { kind: 'media', query: '(max-width: 700px)' },
    }])
  })
})

// ---------------------------------------------------------------------------
// Saved layouts in packs
// ---------------------------------------------------------------------------

function packLayout(id: string, name = 'Hero section') {
  return {
    id,
    name,
    rootNodeId: 'l-root',
    nodes: {
      'l-root': {
        id: 'l-root',
        moduleId: 'base.container',
        props: {},
        breakpointOverrides: {},
        children: [],
        classIds: [],
      },
    },
    classes: {},
    createdAt: 0,
  }
}

describe('parsePluginPack — layouts', () => {
  it('accepts plugin-namespaced layout ids', () => {
    const pack = parsePluginPack('acme.canvas', {
      layouts: [packLayout('acme.canvas/hero-section')],
    })
    expect(pack.layouts).toHaveLength(1)
    expect(pack.layouts[0].name).toBe('Hero section')
  })

  it('rejects layouts that are not namespaced under the plugin id', () => {
    expect(() =>
      parsePluginPack('acme.canvas', { layouts: [packLayout('hero-section')] }),
    ).toThrow(PluginPackError)
  })

  it('rejects malformed layout entries', () => {
    expect(() =>
      parsePluginPack('acme.canvas', { layouts: [{ id: 'acme.canvas/broken' }] }),
    ).toThrow(PluginPackError)
  })

  it('rejects layouts with an incoherent snapshot tree', () => {
    const broken = packLayout('acme.canvas/dangling')
    broken.nodes['l-root'].children = ['ghost']
    expect(() =>
      parsePluginPack('acme.canvas', { layouts: [broken] }),
    ).toThrow(PluginPackError)
  })
})

describe('applyPluginPackToSite — layouts', () => {
  it('reports replaced layout ids without merging into the site doc (caller upserts rows)', () => {
    const pack = {
      visualComponents: [],
      pages: [],
      classes: [],
      layouts: [packLayout('acme.canvas/hero-section')],
    }
    const fresh = applyPluginPackToSite('acme.canvas', baselineSite, pack)
    expect(fresh.replaced.layouts).toEqual([])
    expect(fresh.site.layouts).toEqual([])

    const seeded: SiteDocument = {
      ...baselineSite,
      layouts: [packLayout('acme.canvas/hero-section')],
    }
    const resync = applyPluginPackToSite('acme.canvas', seeded, pack)
    expect(resync.replaced.layouts).toEqual(['acme.canvas/hero-section'])
  })
})
