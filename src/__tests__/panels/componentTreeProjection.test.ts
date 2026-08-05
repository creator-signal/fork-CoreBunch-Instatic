import { describe, expect, it } from 'bun:test'
import {
  buildComponentTreeProjection,
  resolveComponentLayerSelection,
} from '@site/panels/LayersPanel'
import type {
  ComponentLibraryEntry,
  ComponentLibraryImplementation,
} from '@core/component-library'
import { makeNode, makePage, makeVC } from '../fixtures'

function catalogueEntry(
  entry: Pick<ComponentLibraryEntry, 'id' | 'name' | 'implementation'> &
    Partial<Pick<ComponentLibraryEntry, 'presets'>>,
): ComponentLibraryEntry {
  return {
    version: '1.0.0',
    description: `${entry.name} description`,
    category: 'Test',
    tags: [],
    icon: 'square',
    source: { type: 'site' },
    status: 'stable',
    fields: [],
    variants: [],
    presets: entry.presets ?? [],
    slots: [],
    constraints: {},
    requirements: { capabilities: [], providerAdapters: [], plugins: [] },
    documentation: {},
    ...entry,
  }
}

const catalogue: ComponentLibraryEntry[] = [
  catalogueEntry({
    id: 'site.hero-component',
    name: 'Site Hero',
    implementation: {
      type: 'visual-component',
      componentId: 'hero-vc',
    },
  }),
  catalogueEntry({
    id: 'site.hero',
    name: 'Hero',
    implementation: {
      type: 'pattern',
      patternId: 'site.hero-pattern',
    } satisfies ComponentLibraryImplementation,
    presets: [{
      id: 'image-left',
      name: 'Hero · Image left',
      values: {},
    }],
  }),
  catalogueEntry({
    id: 'instatic.heading',
    name: 'Heading',
    implementation: {
      type: 'primitive',
      moduleId: 'base.text',
    },
  }),
]

function componentPage() {
  return makePage({
    id: 'home',
    title: 'Home',
    rootNodeId: 'root',
    nodes: {
      root: makeNode({
        id: 'root',
        moduleId: 'base.body',
        children: ['hero-ref', 'pattern', 'raw'],
      }),
      'hero-ref': makeNode({
        id: 'hero-ref',
        moduleId: 'base.visual-component-ref',
        props: { componentId: 'hero-vc' },
        children: ['actions-slot'],
        catalogueInstance: {
          entryId: 'site.hero-component',
          entryVersion: '1.0.0',
        },
      }),
      'actions-slot': makeNode({
        id: 'actions-slot',
        moduleId: 'base.slot-instance',
        props: { slotName: 'actions' },
        children: ['slot-button'],
      }),
      'slot-button': makeNode({
        id: 'slot-button',
        moduleId: 'base.button',
      }),
      pattern: makeNode({
        id: 'pattern',
        moduleId: 'base.container',
        children: ['implementation'],
        catalogueInstance: {
          entryId: 'site.hero',
          entryVersion: '1.0.0',
          presetId: 'image-left',
          pattern: { authorableNodeIds: ['heading'] },
        },
      }),
      implementation: makeNode({
        id: 'implementation',
        moduleId: 'base.container',
        children: ['heading', 'decoration'],
      }),
      heading: makeNode({
        id: 'heading',
        moduleId: 'base.text',
        catalogueInstance: {
          entryId: 'instatic.heading',
          entryVersion: '1.0.0',
        },
      }),
      decoration: makeNode({
        id: 'decoration',
        moduleId: 'base.svg',
      }),
      raw: makeNode({
        id: 'raw',
        moduleId: 'base.text',
      }),
    },
  })
}

describe('Components Layers projection', () => {
  it('projects the existing page tree without copying component content', () => {
    const page = componentPage()
    const projection = buildComponentTreeProjection({
      page,
      moduleNames: {
        'base.body': 'Body',
        'base.button': 'Button',
        'base.container': 'Container',
        'base.svg': 'SVG',
        'base.text': 'Text',
      },
      visualComponents: [makeVC({ id: 'hero-vc', name: 'Site Hero' })],
      catalogueEntries: catalogue,
    })

    expect(projection.roots).toHaveLength(1)
    const root = projection.roots[0]
    expect(root).toMatchObject({
      nodeId: 'root',
      label: 'Home',
      kind: 'page',
    })

    const component = root.children[0]
    expect(component).toMatchObject({
      nodeId: 'hero-ref',
      label: 'Site Hero',
      kind: 'visualComponent',
    })
    expect(component.children[0]).toMatchObject({
      nodeId: 'actions-slot',
      label: 'Slot: actions',
      kind: 'slot',
    })

    const pattern = root.children[1]
    expect(pattern).toMatchObject({
      nodeId: 'pattern',
      label: 'Hero · Image left',
      kind: 'pattern',
      entryId: 'site.hero',
      presetId: 'image-left',
    })
    expect(pattern.children.map((row) => row.nodeId)).toEqual(['heading'])
    expect(pattern.children[0]).toMatchObject({
      label: 'Heading',
      kind: 'primitive',
    })

    expect(root.children.map((row) => row.nodeId)).toEqual([
      'hero-ref',
      'pattern',
    ])
    expect(root.children.find((row) => row.nodeId === 'raw')).toBeUndefined()
  })

  it('does not populate Components view for imported-only freeform content', () => {
    const page = makePage({
      id: 'imported-page',
      title: 'Imported page',
      rootNodeId: 'root',
      nodes: {
        root: makeNode({
          id: 'root',
          moduleId: 'base.body',
          children: ['container', 'visual-ref'],
        }),
        container: makeNode({
          id: 'container',
          moduleId: 'base.container',
          children: ['copy', 'link'],
        }),
        copy: makeNode({ id: 'copy', moduleId: 'base.text' }),
        link: makeNode({ id: 'link', moduleId: 'base.link' }),
        'visual-ref': makeNode({
          id: 'visual-ref',
          moduleId: 'base.visual-component-ref',
          props: { componentId: 'hero-vc' },
          children: ['raw-slot'],
        }),
        'raw-slot': makeNode({
          id: 'raw-slot',
          moduleId: 'base.slot-instance',
          props: { slotName: 'actions' },
        }),
      },
    })

    const projection = buildComponentTreeProjection({
      page,
      moduleNames: {
        'base.body': 'Body',
        'base.container': 'Container',
        'base.link': 'Link',
        'base.text': 'Text',
      },
      visualComponents: [makeVC({ id: 'hero-vc', name: 'Site Hero' })],
      catalogueEntries: catalogue,
    })

    expect(projection.roots).toEqual([])
    expect(resolveComponentLayerSelection(projection, 'container')).toBeNull()
    expect(resolveComponentLayerSelection(projection, 'copy')).toBeNull()
    expect(resolveComponentLayerSelection(projection, 'visual-ref')).toBeNull()
    expect(resolveComponentLayerSelection(projection, 'raw-slot')).toBeNull()
  })

  it('finds explicit components nested beneath unclassified layout wrappers', () => {
    const page = makePage({
      id: 'nested-page',
      title: 'Nested page',
      rootNodeId: 'root',
      nodes: {
        root: makeNode({
          id: 'root',
          moduleId: 'base.body',
          children: ['layout'],
        }),
        layout: makeNode({
          id: 'layout',
          moduleId: 'base.container',
          children: ['governed-copy', 'visual-ref'],
        }),
        'governed-copy': makeNode({
          id: 'governed-copy',
          moduleId: 'base.text',
          children: ['implementation-copy'],
          catalogueInstance: {
            entryId: 'instatic.heading',
            entryVersion: '1.0.0',
          },
        }),
        'implementation-copy': makeNode({
          id: 'implementation-copy',
          moduleId: 'base.text',
        }),
        'visual-ref': makeNode({
          id: 'visual-ref',
          moduleId: 'base.visual-component-ref',
          props: { componentId: 'hero-vc' },
        }),
      },
    })

    const projection = buildComponentTreeProjection({
      page,
      moduleNames: {},
      visualComponents: [makeVC({ id: 'hero-vc', name: 'Site Hero' })],
      catalogueEntries: catalogue,
    })

    expect(projection.roots).toHaveLength(1)
    expect(projection.roots[0].children.map((row) => row.nodeId)).toEqual([
      'governed-copy',
    ])
    expect(resolveComponentLayerSelection(projection, 'layout')).toBeNull()
    expect(resolveComponentLayerSelection(projection, 'visual-ref')).toBeNull()
    expect(resolveComponentLayerSelection(projection, 'implementation-copy')).toBe(
      'governed-copy',
    )
  })

  it('maps hidden implementation descendants to their visible pattern boundary', () => {
    const projection = buildComponentTreeProjection({
      page: componentPage(),
      moduleNames: {},
      visualComponents: [],
      catalogueEntries: catalogue,
    })

    expect(resolveComponentLayerSelection(projection, 'implementation')).toBe('pattern')
    expect(resolveComponentLayerSelection(projection, 'decoration')).toBe('pattern')
    expect(resolveComponentLayerSelection(projection, 'heading')).toBe('heading')
    expect(resolveComponentLayerSelection(projection, 'actions-slot')).toBe('actions-slot')
    expect(resolveComponentLayerSelection(projection, 'not-present')).toBeNull()
  })

  it('surfaces missing definitions rather than silently omitting page content', () => {
    const projection = buildComponentTreeProjection({
      page: componentPage(),
      moduleNames: { 'base.text': 'Text' },
      visualComponents: [],
      catalogueEntries: [],
    })
    const [component, pattern] = projection.roots[0].children

    expect(component).toMatchObject({
      nodeId: 'hero-ref',
      label: 'Missing Visual Component',
      status: 'missing-component',
    })
    expect(pattern).toMatchObject({
      nodeId: 'pattern',
      label: 'Missing library entry: site.hero',
      status: 'missing-library-entry',
    })
  })

  it('splices template-owned branches around the active page in publish order', () => {
    const page = componentPage()
    const template = makePage({
      id: 'global-layout',
      title: 'Global layout',
      template: {
        enabled: true,
        target: { kind: 'everywhere' },
        priority: 0,
      },
      rootNodeId: 'layout-root',
      nodes: {
        'layout-root': makeNode({
          id: 'layout-root',
          moduleId: 'base.body',
          children: ['header', 'outlet', 'footer'],
        }),
        header: makeNode({
          id: 'header',
          moduleId: 'base.container',
          catalogueInstance: {
            entryId: 'base.container',
            entryVersion: '1.0.0',
          },
        }),
        outlet: makeNode({
          id: 'outlet',
          moduleId: 'base.outlet',
        }),
        footer: makeNode({
          id: 'footer',
          moduleId: 'base.container',
          catalogueInstance: {
            entryId: 'base.container',
            entryVersion: '1.0.0',
          },
        }),
      },
    })
    const baseContainer = catalogueEntry({
      id: 'base.container',
      name: 'Container',
      implementation: {
        type: 'primitive',
        moduleId: 'base.container',
      },
    })

    const projection = buildComponentTreeProjection({
      page,
      wrapperTemplates: [template],
      moduleNames: {
        'base.body': 'Body',
        'base.container': 'Container',
      },
      visualComponents: [],
      catalogueEntries: [...catalogue, baseContainer],
    })

    const root = projection.roots[0]
    expect(root).toMatchObject({
      key: 'template:global-layout:layout-root',
      label: 'Global layout template',
      kind: 'templateComponent',
      sourcePageId: 'global-layout',
      readOnly: true,
    })
    expect(root.children.map((row) => row.nodeId)).toEqual([
      'header',
      'root',
      'footer',
    ])
    expect(root.children[0]).toMatchObject({
      label: 'Container',
      sourcePageId: 'global-layout',
      readOnly: true,
    })
    expect(root.children[1]).toMatchObject({
      label: 'Home',
      kind: 'page',
      readOnly: false,
    })
    expect(root.children[1].sourcePageId).toBeUndefined()
    expect(root.children[2]).toMatchObject({
      label: 'Container',
      sourcePageId: 'global-layout',
      readOnly: true,
    })
    expect(resolveComponentLayerSelection(projection, 'heading')).toBe('heading')
  })
})
