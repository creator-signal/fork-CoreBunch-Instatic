import { describe, expect, it } from 'bun:test'
import {
  buildComponentTreeProjection,
  resolveComponentLayerSelection,
  type ComponentLayerCatalogueEntry,
} from '@site/panels/LayersPanel'
import { makeNode, makePage, makeVC } from '../fixtures'

const catalogue: ComponentLayerCatalogueEntry[] = [
  {
    id: 'site.hero',
    name: 'Hero',
    implementationType: 'pattern',
    status: 'stable',
    presets: { 'image-left': 'Hero · Image left' },
  },
  {
    id: 'instatic.heading',
    name: 'Heading',
    implementationType: 'primitive',
    status: 'stable',
  },
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
          entryVersion: '1',
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
          entryVersion: '1',
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

    expect(root.children[2]).toMatchObject({
      nodeId: 'raw',
      label: 'Custom / Freeform: Text',
      kind: 'freeform',
      readOnly: true,
    })
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
})
