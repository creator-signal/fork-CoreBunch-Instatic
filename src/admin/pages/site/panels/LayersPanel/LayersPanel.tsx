import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { registry } from '@core/module-engine'
import { componentLibraryRegistry } from '@core/component-library'
import { resolveEditorWrapperTemplates } from '@site/canvas/canvasComposition'
import { useEditorPermissions } from '@site/editorPermissionsContext'
import { selectActiveCanvasPage, useEditorStore } from '@site/store/store'
import { DomPanel } from '@site/panels/DomPanel'
import { ComponentLayersTree } from './ComponentLayersTree'
import { ComponentLibraryDialog } from './ComponentLibraryDialog'
import { buildComponentTreeProjection } from './componentTreeProjection'
import { resolveComponentLayerSelection } from './layerSelection'
import styles from './LayersPanel.module.css'

interface LayersPanelProps {
  editable?: boolean
}

const subscribeModuleRegistry = (listener: () => void) => registry.subscribe(listener)
const getModuleRegistryGeneration = () => registry.generation()
const subscribeComponentLibrary = (listener: () => void) =>
  componentLibraryRegistry.subscribe(listener)
const getComponentLibraryGeneration = () => componentLibraryRegistry.generation()
const EMPTY_VISUAL_COMPONENTS = [] as const

/**
 * Route the Layers tab between two projections of the same active NodeTree.
 * Both trees stay mounted so each view retains its independent expansion and
 * search state without copying any page data.
 */
export function LayersPanel({ editable = true }: LayersPanelProps) {
  const permissions = useEditorPermissions()
  const [componentLibraryOpen, setComponentLibraryOpen] = useState(false)
  const mode = useEditorStore((state) => state.layersViewMode)
  const effectiveMode = permissions.canEditStructure ? mode : 'components'
  const page = useEditorStore(selectActiveCanvasPage)
  const visualComponents = useEditorStore(
    (state) => state.site?.visualComponents ?? EMPTY_VISUAL_COMPONENTS,
  )
  const selectedNodeId = useEditorStore((state) => state.selectedNodeId)
  const site = useEditorStore((state) => state.site)
  useSyncExternalStore(
    subscribeModuleRegistry,
    getModuleRegistryGeneration,
    getModuleRegistryGeneration,
  )
  useSyncExternalStore(
    subscribeComponentLibrary,
    getComponentLibraryGeneration,
    getComponentLibraryGeneration,
  )

  const moduleNames = Object.fromEntries(
    registry.list().map((definition) => [definition.id, definition.name]),
  )
  const projection = page
    ? buildComponentTreeProjection({
        page,
        wrapperTemplates: site
          ? resolveEditorWrapperTemplates(site, page)
          : [],
        moduleNames,
        visualComponents,
        catalogueEntries: componentLibraryRegistry.list(),
      })
    : null

  const previousMode = useRef(mode)
  const htmlSelectionByDocument = useRef(new Map<string, string>())
  const documentKey = page?.id ?? null

  useEffect(() => {
    if (!permissions.canEditStructure && mode !== 'components') {
      useEditorStore.getState().setLayersViewMode('components')
    }
  }, [mode, permissions.canEditStructure])

  useEffect(() => {
    if (
      effectiveMode !== 'html' ||
      previousMode.current !== 'html' ||
      !documentKey ||
      !selectedNodeId
    ) return
    htmlSelectionByDocument.current.set(documentKey, selectedNodeId)
  }, [documentKey, effectiveMode, selectedNodeId])

  useEffect(() => {
    const previous = previousMode.current
    if (previous === effectiveMode) return
    previousMode.current = effectiveMode
    if (!page || !projection) return

    if (effectiveMode === 'components') {
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
  }, [effectiveMode, page, projection, selectedNodeId])

  useEffect(() => {
    if (effectiveMode !== 'components' || !page || !projection || !selectedNodeId) return
    const visibleNodeId = resolveComponentLayerSelection(projection, selectedNodeId)
    if (!visibleNodeId || visibleNodeId === selectedNodeId) return
    htmlSelectionByDocument.current.set(page.id, selectedNodeId)
    useEditorStore.getState().selectNode(visibleNodeId)
  }, [effectiveMode, page, projection, selectedNodeId])

  return (
    <div className={styles.panel}>
      <div className={styles.viewMount} hidden={effectiveMode !== 'components'}>
        <ComponentLayersTree
          projection={projection}
          canInsert={permissions.canEditComponents}
          canMove={permissions.canEditComponents || permissions.canEditStructure}
          canOpenTemplateSource={permissions.canEditStructure}
          onOpenComponentLibrary={() => setComponentLibraryOpen(true)}
        />
      </div>
      <div className={styles.viewMount} hidden={effectiveMode !== 'html'}>
        <DomPanel editable={editable} />
      </div>
      <ComponentLibraryDialog
        open={componentLibraryOpen}
        onClose={() => setComponentLibraryOpen(false)}
      />
    </div>
  )
}
