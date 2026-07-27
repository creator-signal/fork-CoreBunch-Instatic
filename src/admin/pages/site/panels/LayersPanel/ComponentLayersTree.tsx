import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragMoveEvent,
} from '@dnd-kit/core'
import { selectActiveCanvasPage, useEditorStore } from '@site/store/store'
import { isNarrowEditorChromeViewport } from '@site/layout/responsiveChrome'
import {
  TreeChevron,
  TreeContainer,
  TreeIconSlot,
  TreeLabel,
  TreeLabelGroup,
  TreeRow,
  treeDropStyles,
} from '@site/ui/Tree'
import { ModuleIcon } from '@site/ui/ModuleIcon'
import { SearchBar } from '@ui/components/SearchBar'
import { SkeletonTree } from '@ui/components/Skeleton'
import { TagPill } from '@ui/components/TagPill'
import { Button } from '@ui/components/Button'
import { pushToast } from '@ui/components/Toast'
import { cn } from '@ui/cn'
import { PlusIcon } from 'pixel-art-icons/icons/plus'
import type { PageTreeDropPosition } from '@core/page-tree'
import type {
  ComponentLayerRow,
  ComponentTreeProjection,
} from './componentTreeProjection'
import { ComponentLayersExpansionStore } from './componentLayersExpansionStore'
import {
  resolveComponentLayerDrop,
  type ComponentLayerDropResolution,
} from './componentLayersDnd'
import { getDomDropZone } from '@site/panels/DomPanel/domPanelDnd'
import styles from './ComponentLayersTree.module.css'

interface ComponentLayersTreeProps {
  projection: ComponentTreeProjection | null
  canInsert?: boolean
  canMove?: boolean
  onOpenComponentLibrary: () => void
}

export function ComponentLayersTree({
  projection,
  canInsert = true,
  canMove = true,
  onOpenComponentLibrary,
}: ComponentLayersTreeProps) {
  const page = useEditorStore(selectActiveCanvasPage)
  const selectedNodeId = useEditorStore((state) => state.selectedNodeId)
  const focusedPanel = useEditorStore((state) => state.focusedPanel)
  const setFocusedPanel = useEditorStore((state) => state.setFocusedPanel)
  const [searchQuery, setSearchQuery] = useState('')
  const [expansionStore] = useState(() => new ComponentLayersExpansionStore())
  const [dropState, setDropState] = useState<ComponentLayerDropState | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const treeRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
  )

  const rows = projection ? flattenRows(projection.roots) : []
  const normalizedQuery = searchQuery.trim().toLowerCase()
  const searchRows = normalizedQuery
    ? rows.filter((row) => [
        row.label,
        row.entryId,
        row.presetId,
        row.kind,
        row.status,
      ].some((value) => value?.toLowerCase().includes(normalizedQuery)))
    : []

  useEffect(() => {
    if (focusedPanel !== 'domTree') return
    const panel = panelRef.current
    if (!panel || panel.contains(document.activeElement)) return
    panel.focus({ preventScroll: true })
  }, [focusedPanel])

  useEffect(() => {
    if (!projection || !selectedNodeId) return
    const ancestorKeys = componentLayerAncestorKeys(projection.roots, selectedNodeId)
    for (const key of ancestorKeys) expansionStore.expand(key)
    requestAnimationFrame(() => {
      treeRef.current
        ?.querySelector(`[data-node-id="${selectedNodeId}"]`)
        ?.scrollIntoView({ behavior: 'auto', block: 'nearest' })
    })
  }, [expansionStore, projection, selectedNodeId])

  const selectNode = (nodeId: string): void => {
    useEditorStore.getState().selectNode(nodeId, undefined, {
      preservePropertiesPanelCollapse: isNarrowEditorChromeViewport(),
    })
  }

  const resolveDrop = (
    event: DragMoveEvent | DragEndEvent,
  ): ComponentLayerDropState | null => {
    if (!page || !event.over) return null
    const position = dropPosition(event)
    const activeId = String(event.active.id)
    const overId = String(event.over.id)
    return {
      activeId,
      overId,
      position,
      resolution: resolveComponentLayerDrop({
        page,
        draggedId: activeId,
        overId,
        position,
      }),
    }
  }

  const handleDragEnd = (event: DragEndEvent): void => {
    const finalDrop = resolveDrop(event)
    setDropState(null)
    if (!finalDrop) return
    if (!finalDrop.resolution.allowed) {
      pushToast({
        kind: 'warning',
        title: 'Cannot move component',
        body: finalDrop.resolution.reason,
        location: 'component-layers',
      })
      return
    }
    const target = finalDrop.resolution.target
    try {
      useEditorStore.getState().moveNode(
        finalDrop.activeId,
        target.parentId,
        target.index,
      )
    } catch (error) {
      console.warn('[ComponentLayers] Ignored stale drag/drop target:', error)
    }
  }

  return (
    <div
      ref={panelRef}
      data-panel=""
      data-testid={projection ? 'component-layers-panel-ready' : 'component-layers-panel'}
      role="complementary"
      aria-label="Component layers panel"
      tabIndex={-1}
      onFocus={() => setFocusedPanel('domTree')}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        if (event.key === 'F6') {
          event.preventDefault()
          useEditorStore.getState().cycleFocusedPanel()
        }
        if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
          event.preventDefault()
          searchInputRef.current?.focus()
        }
      }}
      className={styles.panel}
    >
      <div className={styles.searchRow}>
        <SearchBar
          ref={searchInputRef}
          data-testid="component-layers-search"
          value={searchQuery}
          onValueChange={setSearchQuery}
          placeholder="Search components…"
          aria-label="Search component layers"
          className={styles.search}
        />
        {canInsert ? (
          <Button
            variant="secondary"
            size="sm"
            iconOnly
            aria-label="Open Component Library"
            tooltip="Add from Component Library"
            onClick={onOpenComponentLibrary}
          >
            <PlusIcon size={13} aria-hidden="true" />
          </Button>
        ) : null}
      </div>

      <div className={styles.treeArea}>
        {!projection ? (
          <SkeletonTree ariaLabel="Loading component layers" />
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragMove={(event) => setDropState(resolveDrop(event))}
            onDragEnd={handleDragEnd}
            onDragCancel={() => setDropState(null)}
          >
            <TreeContainer
              ariaLabel="Component page hierarchy"
              testId="component-layers-tree"
              containerRef={treeRef}
              data-instatic-layer-tree="true"
            >
              {normalizedQuery ? (
                searchRows.length > 0
                  ? searchRows.map((row) => (
                      <ComponentLayerTreeRow
                        key={row.key}
                        row={row}
                        depth={0}
                        selectedNodeId={selectedNodeId}
                        onToggle={() => {}}
                        onSelect={selectNode}
                        canMove={false}
                        dropState={null}
                        searchResult
                      />
                    ))
                  : <div className={styles.empty}>No component layers match</div>
              ) : (
                projection.roots.map((row) => (
                  <ComponentLayerBranch
                    key={row.key}
                    row={row}
                    depth={0}
                    selectedNodeId={selectedNodeId}
                    expansionStore={expansionStore}
                    onSelect={selectNode}
                    canMove={canMove}
                    dropState={dropState}
                  />
                ))
              )}
            </TreeContainer>
          </DndContext>
        )}
      </div>
    </div>
  )
}

interface ComponentLayerBranchProps {
  row: ComponentLayerRow
  depth: number
  selectedNodeId: string | null
  expansionStore: ComponentLayersExpansionStore
  onSelect: (nodeId: string) => void
  canMove: boolean
  dropState: ComponentLayerDropState | null
}

function ComponentLayerBranch(props: ComponentLayerBranchProps) {
  const expanded = useSyncExternalStore(
    props.expansionStore.subscribe,
    () => props.expansionStore.isExpanded(props.row.key),
    () => true,
  )
  return (
    <>
      <ComponentLayerTreeRow
        row={props.row}
        depth={props.depth}
        selectedNodeId={props.selectedNodeId}
        onSelect={props.onSelect}
        canMove={props.canMove}
        dropState={props.dropState}
        expanded={expanded}
        onToggle={() => props.expansionStore.toggle(props.row.key)}
      />
      {expanded && props.row.children.map((child) => (
        <ComponentLayerBranch
          key={child.key}
          {...props}
          row={child}
          depth={props.depth + 1}
        />
      ))}
    </>
  )
}

interface ComponentLayerTreeRowProps {
  row: ComponentLayerRow
  depth: number
  selectedNodeId: string | null
  onSelect: (nodeId: string) => void
  expanded?: boolean
  onToggle: () => void
  canMove: boolean
  dropState: ComponentLayerDropState | null
  searchResult?: boolean
}

function ComponentLayerTreeRow({
  row,
  depth,
  selectedNodeId,
  expanded = true,
  onToggle,
  onSelect,
  canMove,
  dropState,
  searchResult = false,
}: ComponentLayerTreeRowProps) {
  const selected = selectedNodeId === row.nodeId
  const hasChildren = !searchResult && row.children.length > 0
  const draggableEnabled =
    canMove &&
    !searchResult &&
    !row.readOnly &&
    row.kind !== 'page' &&
    row.kind !== 'slot' &&
    Boolean(row.entryId)
  const draggable = useDraggable({
    id: row.nodeId,
    disabled: !draggableEnabled,
  })
  const droppable = useDroppable({
    id: row.nodeId,
    disabled: !canMove || searchResult,
  })
  const setRowRef = (element: HTMLDivElement | null) => {
    draggable.setNodeRef(element)
    droppable.setNodeRef(element)
  }
  const activeDrop = dropState?.overId === row.nodeId ? dropState : null
  const dropClass = activeDrop
    ? !activeDrop.resolution.allowed
      ? treeDropStyles.dropInvalid
      : activeDrop.position === 'before'
        ? treeDropStyles.dropBefore
        : activeDrop.position === 'after'
          ? treeDropStyles.dropAfter
          : treeDropStyles.dropInside
    : undefined
  return (
    <TreeRow
      ref={setRowRef}
      depth={depth}
      selected={selected}
      locked={row.readOnly}
      dragging={draggable.isDragging}
      role="treeitem"
      aria-level={depth + 1}
      aria-selected={selected}
      aria-expanded={hasChildren ? expanded : undefined}
      tabIndex={0}
      data-node-id={row.nodeId}
      className={cn(dropClass)}
      {...(draggableEnabled ? draggable.attributes : {})}
      {...(draggableEnabled ? draggable.listeners : {})}
      onClick={() => onSelect(row.nodeId)}
      onMouseEnter={() => useEditorStore.getState().hoverNode(row.nodeId)}
      onMouseLeave={() => useEditorStore.getState().hoverNode(null)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelect(row.nodeId)
        }
        if (event.key === 'ArrowRight' && hasChildren && !expanded) {
          event.preventDefault()
          onToggle()
        }
        if (event.key === 'ArrowLeft' && hasChildren && expanded) {
          event.preventDefault()
          onToggle()
        }
      }}
    >
      <TreeChevron
        expanded={expanded}
        visible={hasChildren}
        onClick={(event) => {
          event.stopPropagation()
          onToggle()
        }}
      />
      <TreeIconSlot iconSize={11} iconColor="var(--text-disabled)">
        <ModuleIcon
          moduleId={row.moduleId}
          size={11}
          color="var(--text-disabled)"
        />
      </TreeIconSlot>
      <TreeLabelGroup>
        <TreeLabel>{row.label}</TreeLabel>
        <LayerBadge row={row} />
      </TreeLabelGroup>
    </TreeRow>
  )
}

interface ComponentLayerDropState {
  activeId: string
  overId: string
  position: PageTreeDropPosition
  resolution: ComponentLayerDropResolution
}

function dropPosition(event: DragMoveEvent | DragEndEvent): PageTreeDropPosition {
  const overRect = event.over?.rect
  if (!overRect) return 'inside'
  const activeRect = event.active.rect.current.translated
  const pointerY = activeRect
    ? activeRect.top + activeRect.height / 2
    : overRect.top + overRect.height / 2
  return getDomDropZone(overRect, pointerY)
}

function LayerBadge({ row }: { row: ComponentLayerRow }) {
  const label = row.status === 'missing-library-entry'
    ? 'missing'
    : row.status === 'missing-component'
      ? 'missing'
      : row.status === 'deprecated'
        ? 'deprecated'
        : row.status === 'migration-required'
          ? 'upgrade'
          : row.status === 'version-pinned'
            ? 'pinned'
            : row.status === 'version-ahead' ||
                row.status === 'invalid-preset' ||
                row.status === 'invalid-variant'
              ? 'warning'
        : row.kind === 'slot'
          ? 'slot'
          : row.kind === 'freeform'
            ? 'custom'
            : row.presetId
              ? 'preset'
              : null

  return label ? (
    <TagPill
      label={label}
      size="xs"
      aria-hidden="true"
      className={styles.badge}
    />
  ) : null
}

function flattenRows(roots: ReadonlyArray<ComponentLayerRow>): ComponentLayerRow[] {
  const rows: ComponentLayerRow[] = []
  const pending = [...roots].reverse()
  while (pending.length > 0) {
    const row = pending.pop()
    if (!row) continue
    rows.push(row)
    pending.push(...[...row.children].reverse())
  }
  return rows
}

function componentLayerAncestorKeys(
  roots: ReadonlyArray<ComponentLayerRow>,
  nodeId: string,
): string[] {
  const visit = (row: ComponentLayerRow, ancestors: string[]): string[] | null => {
    if (row.nodeId === nodeId) return ancestors
    for (const child of row.children) {
      const match = visit(child, [...ancestors, row.key])
      if (match) return match
    }
    return null
  }

  for (const root of roots) {
    const match = visit(root, [])
    if (match) return match
  }
  return []
}
