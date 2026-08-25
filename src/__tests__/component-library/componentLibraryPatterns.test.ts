import { describe, expect, it } from 'bun:test'
import {
  ComponentLibraryPatternRegistry,
  type ComponentLibraryPatternDefinition,
} from '@core/component-library'

const VALID_PATTERN: ComponentLibraryPatternDefinition = {
  id: 'test.pattern',
  rootKey: 'root',
  nodes: [
    {
      key: 'root',
      moduleId: 'base.container',
      props: { tag: 'section' },
      children: ['content'],
    },
    {
      key: 'content',
      moduleId: 'base.text',
      props: { text: 'Pattern content', tag: 'p' },
      children: [],
    },
  ],
  authorableNodeKeys: ['content'],
}

describe('Component Library pattern registry', () => {
  it('materializes fresh structured subtrees and remaps authorable node IDs', () => {
    const registry = new ComponentLibraryPatternRegistry()
    registry.registerOrReplace(VALID_PATTERN)

    const first = registry.materialize('test.pattern', {
      entryId: 'test.entry',
      entryVersion: '1.0.0',
    })!
    const second = registry.materialize('test.pattern', {
      entryId: 'test.entry',
      entryVersion: '1.0.0',
    })!
    const firstRoot = first.nodes[first.rootIds[0]!]!
    const firstContent = first.nodes[firstRoot.children[0]!]!

    expect(first.rootIds[0]).not.toBe(second.rootIds[0])
    expect(firstContent.props.text).toBe('Pattern content')
    expect(firstRoot.catalogueInstance).toEqual({
      entryId: 'test.entry',
      entryVersion: '1.0.0',
      pattern: {
        authorableNodeIds: [firstContent.id],
      },
    })
  })

  it('expands recipe patterns into independently authorable component roots', () => {
    const registry = new ComponentLibraryPatternRegistry()
    registry.registerOrReplace({
      ...VALID_PATTERN,
      materialization: 'children',
    })

    const fragment = registry.materialize('test.pattern', {
      entryId: 'test.entry',
      entryVersion: '1.0.0',
    })!

    expect(fragment.rootIds).toHaveLength(1)
    expect(Object.values(fragment.nodes)).toHaveLength(1)
    expect(fragment.nodes[fragment.rootIds[0]!]!).toMatchObject({
      moduleId: 'base.text',
      props: { text: 'Pattern content', tag: 'p' },
    })
    expect(Object.values(fragment.nodes).some((node) =>
      node.catalogueInstance?.entryId === 'test.entry')).toBe(false)
  })

  it('rejects missing references and authorable keys before registration', () => {
    const registry = new ComponentLibraryPatternRegistry()
    expect(() =>
      registry.registerOrReplace({
        ...VALID_PATTERN,
        nodes: [{
          ...VALID_PATTERN.nodes[0]!,
          children: ['missing'],
        }],
      }),
    ).toThrow('references missing node')
    expect(() =>
      registry.registerOrReplace({
        ...VALID_PATTERN,
        authorableNodeKeys: ['missing'],
      }),
    ).toThrow('exposes missing node')
  })
})
