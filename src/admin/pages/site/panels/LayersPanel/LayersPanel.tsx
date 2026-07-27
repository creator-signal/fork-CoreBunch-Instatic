import { useEffect, useRef, useSyncExternalStore } from 'react'
import { registry } from '@core/module-engine'
import { selectActiveCanvasPage, useEditorStore } from '@site/store/store'
import { DomPanel } from '@site/panels/DomPanel'
import { ComponentLayersTree } from './ComponentLayersTree'
import { buildComponentTreeProjection } from './componentTreeProjection'
import { resolveComponentLayerSelection } from './layerSelection'
import styles from './LayersPanel.module.css'

interface LayersPanelProps {
  editable?: boolean
}

const subscribeModuleRegistry = (listener: () => void) => registry.subscribe(listener)
const getModuleRegistryGeneration = () => registry.generation()
const EMPTY_VISUAL_COMPONENTS = [] as const

/**
 * Route the Layers tab between two projections of the same active NodeTree.
 * Both trees stay mounted so each view retains its independent expansion and
 * search state without copying any page data.
 */
export function LayersPanel({ editable = true }: LayersPanelProps) {
  const mode = useEditorStore((state) => state.layersViewMode)
  const page = useEditorStore(selectActiveCanvasPage)
  const visualComponents = useEditorStore(
    (state) => state.site?.visualComponents ?? EMPTY_VISUAL_COMPONENTS,
  )
  const selectedNodeId = useEditorStore((state) => state.selectedNodeId)
  useSyncExternalStore(
    subscribeModuleRegistry,
    getModuleRegistryGeneration,
    getModuleRegistryGeneration,
  )

  const moduleNames = Object.fromEntries(
    registry.list().map((definition) => [definition.id, definition.name]),
  )
  const projection = page
    ? buildComponentTreeProjection({ page, moduleNames, visualComponents })
    : null

  const previousMode = useRef(mode)
  const htmlSelectionByDocument = useRef(new Map<string, string>())
  const documentKey = page?.id ?? null

  useEffect(() => {
    if (
      mode !== 'html' ||
      previousMode.current !== 'html' ||
      !documentKey ||
      !selectedNodeId
    ) return
    htmlSelectionByDocument.current.set(documentKey, selectedNodeId)
  }, [documentKey, mode, selectedNodeId])

  useEffect(() => {
    const previous = previousMode.current
    if (previous === mode) return
    previousMode.current = mode
    if (!page || !projection) return

    if (mode === 'components') {
      if (selectedNodeId) {
        htmlSelectionByDocument.current.set(page.id, selectedNodeId)
      }
      const visibleNodeId = resolveComponentLayerSelection(projection, selectedNodeId)
      if (visibleNodeId && visibleNodeId !== selectedNodeId) {
        useEditorStore.getState().selectNode(visibleNodeId)
      }
      return
    }

    const exactHtmlNodeId = htmlSelectionByDocument.current.get(page.id)
    if (exactHtmlNodeId && page.nodes[exactHtmlNodeId] && exactHtmlNodeId !== selectedNodeId) {
      useEditorStore.getState().selectNode(exactHtmlNodeId)
    }
  }, [mode, page, projection, selectedNodeId])

  useEffect(() => {
    if (mode !== 'components' || !page || !projection || !selectedNodeId) return
    const visibleNodeId = resolveComponentLayerSelection(projection, selectedNodeId)
    if (!visibleNodeId || visibleNodeId === selectedNodeId) return
    htmlSelectionByDocument.current.set(page.id, selectedNodeId)
    useEditorStore.getState().selectNode(visibleNodeId)
  }, [mode, page, projection, selectedNodeId])

  return (
    <div className={styles.panel}>
      <div className={styles.viewMount} hidden={mode !== 'components'}>
        <ComponentLayersTree projection={projection} />
      </div>
      <div className={styles.viewMount} hidden={mode !== 'html'}>
        <DomPanel editable={editable} />
      </div>
    </div>
  )
}
