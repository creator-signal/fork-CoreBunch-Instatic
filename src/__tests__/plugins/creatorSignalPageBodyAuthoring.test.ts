import { describe, expect, it } from 'bun:test'
import '@modules/base'
import type { Page } from '@core/page-tree'
import { buildComponentTreeProjection } from '@site/panels/LayersPanel'
import {
  creatorSignalComponentLibraryEntries,
} from '../../../integrations/creator-signal/component-library'
import mauticForm from '../../../integrations/creator-signal/modules/mautic-form'
import {
  creatorSignalNotFoundAuthoringReference,
  creatorSignalPageAuthoringReference,
  creatorSignalPageBodyComponentBoundaries,
  type CreatorSignalPageBodyComponentReference,
  pack,
} from '../../../integrations/creator-signal/pack/site'
import { creatorSignalRenderProfile } from '../../../integrations/creator-signal/pack/design-system'
import { creatorSignalPublicRouteSlugs } from '../../../integrations/creator-signal/pack/routes'
import { twoColumnSlotIds } from '../../../integrations/creator-signal/pack/two-column-component'

const publicPages = pack.pages.filter((page) => !page.template)
const entryById = new Map(
  creatorSignalComponentLibraryEntries.map((entry) => [entry.id, entry]),
)

const managedFormRoutes = [
  '/contact',
  '/wishlist',
  '/early-access',
  '/waitlist',
  '/beta',
  '/ask-a-question',
  '/feature-request',
  '/report-an-error',
] as const

function pageForRoute(route: string): Page {
  const slug = route === '/' ? 'index' : route.slice(1)
  const page = publicPages.find((candidate) => candidate.slug === slug)
  if (!page) throw new Error(`Missing page for ${route}`)
  return page
}

function pageComponentRootIds(page: Page): string[] {
  const body = page.nodes[page.rootNodeId]
  if (!body || body.moduleId !== 'base.body') throw new Error(`Page ${page.slug} has no body root`)
  return body.children
}

function componentReference(
  page: Page,
  nodeId: string,
): CreatorSignalPageBodyComponentReference {
  const node = page.nodes[nodeId]
  if (!node?.catalogueInstance) throw new Error(`Missing catalogue instance at ${nodeId}`)
  const entryId = node.catalogueInstance.entryId
  const boundary = creatorSignalPageBodyComponentBoundaries[entryId]
  if (!boundary) throw new Error(`Missing page-body boundary for ${entryId}`)
  if (boundary !== 'layout-container') return { entryId, boundary }

  const slots: Record<string, CreatorSignalPageBodyComponentReference[]> = {}
  for (const slotId of node.children) {
    const slot = page.nodes[slotId]
    if (slot?.moduleId !== 'base.slot-instance' || typeof slot.props.slotName !== 'string') {
      throw new Error(`Layout ${entryId} has a non-slot child`)
    }
    slots[slot.props.slotName] = slot.children.map((childId) => componentReference(page, childId))
  }
  return { entryId, boundary, slots }
}

describe('Creator Signal route-wide page-body authoring boundary', () => {
  it('audits every public route, body component and nested slot fill', () => {
    expect(creatorSignalPageAuthoringReference.map((reference) =>
      reference.route === '/' ? 'index' : reference.route.slice(1),
    )).toEqual(creatorSignalPublicRouteSlugs)
    expect(creatorSignalPageAuthoringReference.filter((reference) =>
      reference.migration === 'preview-0.6.0-to-0.7.0',
    ).map((reference) => reference.route)).toEqual(managedFormRoutes)
    expect(creatorSignalNotFoundAuthoringReference.migration).toBe('none')

    for (const reference of creatorSignalPageAuthoringReference) {
      const page = pageForRoute(reference.route)
      const actualTree = pageComponentRootIds(page).map((nodeId) => componentReference(page, nodeId))
      expect(actualTree, reference.route).toEqual(reference.componentTree)
      expect(actualTree.map((node) => node.entryId), reference.route)
        .toEqual(reference.componentEntryIds)
    }
  })

  it('projects every route as direct selectable components without page-pattern rows', () => {
    for (const reference of creatorSignalPageAuthoringReference) {
      const page = pageForRoute(reference.route)
      const projection = buildComponentTreeProjection({
        page,
        moduleNames: {},
        visualComponents: pack.visualComponents,
        catalogueEntries: creatorSignalComponentLibraryEntries,
      })
      const pageRow = projection.roots[0]
      expect(pageRow?.kind, reference.route).toBe('page')
      expect(pageRow?.children.map((row) => row.entryId), reference.route)
        .toEqual(reference.componentEntryIds)
      expect(pageRow?.children.some((row) => row.kind === 'pattern'), reference.route)
        .toBe(false)
      expect(pageRow?.children.every((row) => row.readOnly === false), reference.route)
        .toBe(true)
    }
  })

  it('resolves every pack-owned catalogue node to its current entry and permits only real slot structure', () => {
    for (const page of [...publicPages, pack.pages.find((candidate) =>
      candidate.template?.target.kind === 'notFound')!]) {
      const visit = (nodeId: string, parentBoundary?: string): void => {
        const node = page.nodes[nodeId]
        expect(node, `${page.slug}:${nodeId}`).toBeDefined()
        if (node.moduleId === 'base.slot-instance') {
          expect(parentBoundary, `${page.slug}:${nodeId}`).toBe('layout-container')
          expect([twoColumnSlotIds.left, twoColumnSlotIds.right]).toContain(node.props.slotName)
          expect(node.children.length, `${page.slug}:${nodeId}`).toBeGreaterThan(0)
          for (const childId of node.children) visit(childId)
          return
        }

        const instance = node.catalogueInstance
        expect(instance, `${page.slug}:${nodeId}`).toBeDefined()
        const entry = entryById.get(instance!.entryId)
        expect(entry, `${page.slug}:${instance!.entryId}`).toBeDefined()
        expect(instance!.entryVersion, `${page.slug}:${instance!.entryId}`).toBe(entry!.version)
        const boundary = creatorSignalPageBodyComponentBoundaries[instance!.entryId]
        expect(boundary, `${page.slug}:${instance!.entryId}`).toBeDefined()

        if (boundary === 'layout-container') {
          expect(node.children.map((childId) => page.nodes[childId]?.props.slotName))
            .toEqual([twoColumnSlotIds.left, twoColumnSlotIds.right])
        } else {
          expect(node.children, `${page.slug}:${instance!.entryId}`).toEqual([])
        }
        if (boundary === 'provider-component') {
          expect(node.props).not.toHaveProperty('eyebrow')
          expect(node.props).not.toHaveProperty('heading')
          expect(node.props).not.toHaveProperty('introduction')
        }
        for (const childId of node.children) visit(childId, boundary)
      }

      expect(Object.values(page.nodes).some((node) => node.catalogueInstance?.pattern))
        .toBe(false)
      for (const childId of pageComponentRootIds(page)) visit(childId)
    }
  })

  it('keeps all managed form routes as copy-first responsive columns with provider-only forms', () => {
    for (const route of managedFormRoutes) {
      const page = pageForRoute(route)
      const layout = pageComponentRootIds(page).map((nodeId) => page.nodes[nodeId]).find(
        (node) => node?.catalogueInstance?.entryId === 'creator-signal.site.two-column-layout',
      )!
      const [left, right] = layout.children.map((nodeId) => page.nodes[nodeId])
      expect(left?.props.slotName, route).toBe(twoColumnSlotIds.left)
      expect(right?.props.slotName, route).toBe(twoColumnSlotIds.right)
      expect(page.nodes[left!.children[0]!]?.catalogueInstance?.entryId, route)
        .toBe('creator-signal.site.section-intro')
      const provider = page.nodes[right!.children[0]!]
      expect(provider?.catalogueInstance?.entryId, route).toBe('creator-signal.site.mautic-form')
      expect(provider?.props, route).not.toHaveProperty('eyebrow')
      expect(provider?.props, route).not.toHaveProperty('heading')
      expect(provider?.props, route).not.toHaveProperty('introduction')
    }

    const moduleOutput = mauticForm.render(mauticForm.defaults, [])
    expect(moduleOutput.html).not.toContain('cs-mautic-copy')
    expect(moduleOutput.css).not.toContain('.cs-mautic {\n  display: grid;')
    expect(creatorSignalRenderProfile.stylesheet).toContain(
      '[data-plugin-module="creator-signal.site.two-column-layout-shell"] > [data-plugin-children="true"] { grid-template-columns: 1fr;',
    )
  })
})
