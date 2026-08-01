import { describe, expect, it } from 'bun:test'
import {
  ComponentLibraryMigrationRegistry,
  ComponentLibraryRegistry,
  compareComponentLibraryVersions,
  findComponentLibraryUsages,
  migrateComponentLibraryInstance,
  planComponentLibraryMigration,
  resolveComponentLibraryInstanceStatus,
  type ComponentLibraryEntry,
} from '@core/component-library'
import { makeNode, makePage, makeSite, makeVC } from '../fixtures'

function definition(
  version: string,
  overrides: Partial<ComponentLibraryEntry> = {},
): ComponentLibraryEntry {
  return {
    id: 'site.notice',
    version,
    name: 'Notice',
    description: 'A governed notice.',
    category: 'Content',
    tags: ['notice'],
    icon: 'warning',
    source: { type: 'site' },
    status: 'stable',
    implementation: { type: 'primitive', moduleId: 'base.container' },
    fields: [],
    variants: [],
    presets: [],
    slots: [],
    constraints: {},
    requirements: { capabilities: [], providerAdapters: [], plugins: [] },
    documentation: {},
    ...overrides,
  }
}

function instance(version = '1.0.0') {
  return makeNode({
    id: 'notice',
    moduleId: 'base.container',
    props: { message: 'Hello', legacyTone: 'info' },
    catalogueInstance: {
      entryId: 'site.notice',
      entryVersion: version,
    },
  })
}

function migrations(): ComponentLibraryMigrationRegistry {
  const registry = new ComponentLibraryMigrationRegistry()
  registry.register({
    entryId: 'site.notice',
    fromVersion: '1.0.0',
    toVersion: '1.1.0',
    migrate: (data) => ({
      ...data,
      props: {
        ...data.props,
        text: data.props.message,
        dismissible: false,
      },
    }),
  })
  registry.register({
    entryId: 'site.notice',
    fromVersion: '1.1.0',
    toVersion: '2.0.0',
    migrate: (data) => {
      const { message: _message, legacyTone, ...props } = data.props
      return {
        ...data,
        props: {
          ...props,
          tone: legacyTone === 'info' ? 'neutral' : legacyTone,
        },
      }
    },
  })
  return registry
}

describe('Component Library definition versions', () => {
  it('compares semantic versions including prereleases', () => {
    expect(compareComponentLibraryVersions('1.9.0', '1.10.0')).toBeLessThan(0)
    expect(compareComponentLibraryVersions('2.0.0-beta.2', '2.0.0-beta.10')).toBeLessThan(0)
    expect(compareComponentLibraryVersions('2.0.0-rc.1', '2.0.0')).toBeLessThan(0)
    expect(compareComponentLibraryVersions('2.0.0+one', '2.0.0+two')).toBe(0)
  })

  it('retains replaced definitions for pinning and rollback', () => {
    const registry = new ComponentLibraryRegistry()
    registry.register(definition('1.0.0'))
    registry.registerOrReplace(definition('2.0.0'))

    expect(registry.getOrThrow('site.notice').version).toBe('2.0.0')
    expect(registry.getVersion('site.notice', '1.0.0')?.version).toBe('1.0.0')
    expect(registry.listVersions('site.notice').map((entry) => entry.version))
      .toEqual(['1.0.0', '2.0.0'])

    registry.unregister('site.notice')
    expect(registry.getVersion('site.notice', '1.0.0')).toBeUndefined()
  })
})

describe('Component Library instance migration', () => {
  it('runs a validated multi-step migration without mutating the source', () => {
    const source = instance()
    const result = migrateComponentLibraryInstance(
      source,
      definition('2.0.0'),
      migrations(),
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.path).toEqual([
      { fromVersion: '1.0.0', toVersion: '1.1.0' },
      { fromVersion: '1.1.0', toVersion: '2.0.0' },
    ])
    expect(result.node.props).toEqual({
      text: 'Hello',
      dismissible: false,
      tone: 'neutral',
    })
    expect(result.node.catalogueInstance?.entryVersion).toBe('2.0.0')
    expect(source.props).toEqual({ message: 'Hello', legacyTone: 'info' })
    expect(source.catalogueInstance?.entryVersion).toBe('1.0.0')
  })

  it('keeps pinned and failed instances unchanged with actionable errors', () => {
    const pinned = instance()
    pinned.catalogueInstance = {
      ...pinned.catalogueInstance!,
      pinnedVersion: '1.0.0',
    }
    expect(resolveComponentLibraryInstanceStatus(
      pinned.catalogueInstance,
      definition('2.0.0'),
    )).toBe('version-pinned')

    const result = migrateComponentLibraryInstance(
      pinned,
      definition('2.0.0'),
      migrations(),
    )
    expect(result).toEqual({
      ok: false,
      error: 'Instance is pinned to 1.0.0.',
    })
    expect(pinned.catalogueInstance.entryVersion).toBe('1.0.0')
  })

  it('rejects invalid migration graphs and missing upgrade paths', () => {
    const registry = new ComponentLibraryMigrationRegistry()
    expect(() => registry.register({
      entryId: 'site.notice',
      fromVersion: '2.0.0',
      toVersion: '1.0.0',
      migrate: (data) => data,
    })).toThrow('must move to a newer version')

    expect(migrateComponentLibraryInstance(
      instance(),
      definition('2.0.0'),
      registry,
    )).toEqual({
      ok: false,
      error: 'No migration path from 1.0.0 to 2.0.0.',
    })
  })

  it('discovers page and Visual Component usages and previews bulk impact', () => {
    const page = makePage({
      id: 'home',
      title: 'Home',
      rootNodeId: 'page-root',
      nodes: {
        'page-root': makeNode({
          id: 'page-root',
          moduleId: 'base.body',
          children: ['notice'],
        }),
        notice: instance(),
      },
    })
    const vcNotice = instance()
    vcNotice.id = 'vc-notice'
    vcNotice.catalogueInstance = {
      ...vcNotice.catalogueInstance!,
      pinnedVersion: '1.0.0',
    }
    const component = makeVC({
      id: 'card',
      name: 'Card',
      tree: {
        rootNodeId: 'vc-root',
        nodes: {
          'vc-root': makeNode({
            id: 'vc-root',
            moduleId: 'base.container',
            children: ['vc-notice'],
          }),
          'vc-notice': vcNotice,
        },
      },
    })
    const site = makeSite({
      pages: [page],
      visualComponents: [component],
    })

    const usages = findComponentLibraryUsages(site, 'site.notice')
    expect(usages.map((usage) => [
      usage.documentKind,
      usage.documentName,
      usage.nodeId,
    ])).toEqual([
      ['page', 'Home', 'notice'],
      ['visual-component', 'Card', 'vc-notice'],
    ])

    const plan = planComponentLibraryMigration(
      site,
      definition('2.0.0'),
      migrations(),
    )
    expect(plan.changes).toHaveLength(1)
    expect(plan.changes[0]?.usage.nodeId).toBe('notice')
    expect(plan.failures).toEqual([{
      usage: usages[1],
      error: 'Instance is pinned to 1.0.0.',
    }])
    expect(site.pages[0]?.nodes.notice?.catalogueInstance?.entryVersion)
      .toBe('1.0.0')
  })
})
