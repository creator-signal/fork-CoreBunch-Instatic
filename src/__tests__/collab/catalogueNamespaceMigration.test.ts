import { describe, expect, it } from 'bun:test'
import * as Y from 'yjs'
import '@modules/base'
import {
  migrateCreatorSignalCatalogueNamespace,
  projectLayoutDoc,
  projectPageDoc,
  seedLayoutDoc,
  seedPageDoc,
} from '@core/collab'
import { makeNode, makePage } from '../fixtures'

const CATALOGUE_HEADING = 'creator-signal.site.catalogue.heading'

describe('Creator Signal catalogue namespace migration', () => {
  it('migrates page catalogue metadata without changing implementation IDs', () => {
    const doc = new Y.Doc()
    seedPageDoc(doc, makePage({
      id: 'page-1',
      nodes: {
        root: makeNode({
          id: 'root',
          moduleId: 'base.body',
          children: ['heading'],
        }),
        heading: makeNode({
          id: 'heading',
          moduleId: 'base.heading',
          props: { text: 'Hello', entryId: 'base.application-data' },
          catalogueInstance: {
            entryId: 'base.heading',
            entryVersion: '1.0.0',
          },
        }),
      },
    }))

    expect(migrateCreatorSignalCatalogueNamespace(doc)).toBe(true)
    const page = projectPageDoc(doc, 'page-1')
    expect(page.nodes.heading.catalogueInstance?.entryId).toBe(CATALOGUE_HEADING)
    expect(page.nodes.heading.moduleId).toBe('base.heading')
    expect(page.nodes.heading.props.entryId).toBe('base.application-data')
    expect(migrateCreatorSignalCatalogueNamespace(doc)).toBe(false)
  })

  it('migrates catalogue metadata in saved-layout snapshots only', () => {
    const doc = new Y.Doc()
    seedLayoutDoc(doc, {
      id: 'layout-1',
      name: 'Heading layout',
      rootNodeId: 'heading',
      nodes: {
        heading: makeNode({
          id: 'heading',
          moduleId: 'base.heading',
          props: { entryId: 'base.application-data' },
          catalogueInstance: {
            entryId: 'base.heading',
            entryVersion: '1.0.0',
          },
        }),
      },
      classes: {},
      createdAt: 1_700_000_000_000,
    })

    expect(migrateCreatorSignalCatalogueNamespace(doc)).toBe(true)
    const layout = projectLayoutDoc(doc, 'layout-1')
    expect(layout.nodes.heading.catalogueInstance?.entryId).toBe(CATALOGUE_HEADING)
    expect(layout.nodes.heading.moduleId).toBe('base.heading')
    expect(layout.nodes.heading.props.entryId).toBe('base.application-data')
  })
})
