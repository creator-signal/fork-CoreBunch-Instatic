import { beforeEach, describe, expect, it } from 'bun:test'
import { useEditorStore } from '@site/store/store'

function resetStore() {
  // clearSite resets the collaboration documents and their undo managers.
  useEditorStore.getState().clearSite()
  useEditorStore.setState({
    site: null,
    activePageId: null,
    selectedNodeId: null,
    selectedNodeIds: [],
    hoveredNodeId: null,
    activeDocument: null,
    canUndo: false,
    canRedo: false,
  } as Parameters<typeof useEditorStore.setState>[0])
}

beforeEach(resetStore)

describe('page SEO authoring action', () => {
  it('persists governed page metadata and marks the site as changed', () => {
    const site = useEditorStore.getState().createSite('Metadata site')
    const pageId = site.pages[0].id

    useEditorStore.getState().updatePageSeo(pageId, {
      title: 'Search title',
      robots: { index: false, follow: true, archive: false },
      openGraph: { type: 'article', imageUrl: '/media/card.jpg' },
    })

    expect(useEditorStore.getState().site?.pages[0].seo).toEqual({
      title: 'Search title',
      robots: { index: false, follow: true, archive: false },
      openGraph: { type: 'article', imageUrl: '/media/card.jpg' },
    })
    expect(useEditorStore.getState().canUndo).toBe(true)

    useEditorStore.getState().undo()
    expect(useEditorStore.getState().site?.pages[0].seo).toBeUndefined()
  })

  it('removes page overrides when the author resets to site defaults', () => {
    const site = useEditorStore.getState().createSite('Metadata site')
    const pageId = site.pages[0].id
    useEditorStore.getState().updatePageSeo(pageId, { title: 'Override' })

    useEditorStore.getState().updatePageSeo(pageId, undefined)

    expect(useEditorStore.getState().site?.pages[0].seo).toBeUndefined()
  })
})
