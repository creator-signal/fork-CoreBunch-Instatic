import { describe, expect, it } from 'bun:test'
import { componentLibraryRegistry } from '@core/component-library'
import { registry } from '@core/module-engine'
import type { Page, PageNode } from '@core/page-tree'
import { makeNode, makePage } from '../fixtures'
import { validatePageWriteDiff } from '../../../server/handlers/cms/pageDiff'

const COMPONENT_CAPABILITIES = ['site.components.edit'] as const

function governedEmailNode(id = 'email'): PageNode {
  const definition = registry.get('base.input')
  if (!definition) throw new Error('base.input is not registered')
  return makeNode({
    id,
    moduleId: 'base.input',
    props: {
      ...definition.defaults,
      inputType: 'email',
    },
    catalogueInstance: {
      entryId: 'base.email-input',
      entryVersion: '1.0.0',
      presetId: 'email',
    },
  })
}

function validate(previous: Page, next: Page): void {
  validatePageWriteDiff({
    previousPages: [previous],
    changedPages: [next],
    deletedPageIds: new Set(),
    capabilities: COMPONENT_CAPABILITIES,
  })
}

function pageWith(node: PageNode): Page {
  return makePage({
    nodes: {
      root: makeNode({
        id: 'root',
        moduleId: 'base.body',
        children: [node.id],
      }),
      [node.id]: node,
    },
  })
}

describe('Component Library page diff policy', () => {
  it('allows a governed primitive to be added, moved, and removed', () => {
    const empty = makePage()
    const inserted = pageWith(governedEmailNode())

    expect(() => validate(empty, inserted)).not.toThrow()
    expect(() => validate(inserted, empty)).not.toThrow()

    const sibling = governedEmailNode('second-email')
    const beforeMove = makePage({
      nodes: {
        root: makeNode({
          id: 'root',
          moduleId: 'base.body',
          children: ['email', sibling.id],
        }),
        email: governedEmailNode(),
        [sibling.id]: sibling,
      },
    })
    const afterMove = structuredClone(beforeMove)
    afterMove.nodes.root!.children = [sibling.id, 'email']
    expect(() => validate(beforeMove, afterMove)).not.toThrow()
  })

  it('allows declared fields while rejecting raw structure and style changes', () => {
    const previous = pageWith(governedEmailNode())
    const fieldEdit = structuredClone(previous)
    fieldEdit.nodes.email!.props.placeholder = 'you@example.com'
    expect(() => validate(previous, fieldEdit)).not.toThrow()

    const internalEdit = structuredClone(previous)
    internalEdit.nodes.email!.props.inputType = 'text'
    expect(() => validate(previous, internalEdit)).toThrow(/forbidden structure change/)

    const styleEdit = structuredClone(previous)
    styleEdit.nodes.email!.classIds = ['unapproved-class']
    expect(() => validate(previous, styleEdit)).toThrow(/forbidden style change/)

    const identityEdit = structuredClone(previous)
    identityEdit.nodes.email!.catalogueInstance = {
      entryId: 'base.text-input',
      entryVersion: '1.0.0',
      presetId: 'text',
    }
    expect(() => validate(previous, identityEdit)).toThrow(/catalogue identity changed/)
  })

  it('rejects raw nodes disguised as component-only additions', () => {
    const previous = makePage()
    const next = makePage({
      nodes: {
        root: makeNode({
          id: 'root',
          moduleId: 'base.body',
          children: ['raw'],
        }),
        raw: makeNode({
          id: 'raw',
          moduleId: 'base.input',
          props: { arbitrary: 'unsafe' },
        }),
      },
    })

    expect(() => validate(previous, next)).toThrow(/forbidden structure change/)
  })

  it('requires option metadata and values to move together', () => {
    componentLibraryRegistry.registerOrReplace({
      ...componentLibraryRegistry.getOrThrow('base.email-input'),
      id: 'test.governed-input',
      implementation: {
        type: 'primitive',
        moduleId: 'base.input',
        presetId: 'email',
      },
      presets: [
        { id: 'email', name: 'Email', values: { inputType: 'email' } },
        { id: 'text', name: 'Text', values: { inputType: 'text' } },
      ],
    })
    try {
      const previousNode = governedEmailNode()
      previousNode.catalogueInstance = {
        entryId: 'test.governed-input',
        entryVersion: '1.0.0',
        presetId: 'email',
      }
      const previous = pageWith(previousNode)
      const approved = structuredClone(previous)
      approved.nodes.email!.catalogueInstance!.presetId = 'text'
      approved.nodes.email!.props.inputType = 'text'
      expect(() => validate(previous, approved)).not.toThrow()

      const metadataOnly = structuredClone(previous)
      metadataOnly.nodes.email!.catalogueInstance!.presetId = 'text'
      expect(() => validate(previous, metadataOnly)).toThrow(/catalogue identity changed/)
    } finally {
      componentLibraryRegistry.unregister('test.governed-input')
    }
  })
})
