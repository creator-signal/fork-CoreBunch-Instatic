import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { useEditorStore } from '@site/store/store'
import { isNarrowEditorChromeViewport } from '@site/layout/responsiveChrome'
import {
  TreeChevron,
  TreeContainer,
  TreeIconSlot,
  TreeLabel,
  TreeLabelGroup,
  TreeRow,
} from '@site/ui/Tree'
import { ModuleIcon } from '@site/ui/ModuleIcon'
import { SearchBar } from '@ui/components/SearchBar'
import { SkeletonTree } from '@ui/components/Skeleton'
import { TagPill } from '@ui/components/TagPill'
import { Button } from '@ui/components/Button'
import { PlusIcon } from 'pixel-art-icons/icons/plus'
import type {
  ComponentLayerRow,
  ComponentTreeProjection,
} from './componentTreeProjection'
import { ComponentLayersExpansionStore } from './componentLayersExpansionStore'
import styles from './ComponentLayersTree.module.css'

interface ComponentLayersTreeProps {
  projection: ComponentTreeProjection | null
  onOpenComponentLibrary: () => void
}

export function ComponentLayersTree({
  projection,
  onOpenComponentLibrary,
}: ComponentLayersTreeProps) {
  const selectedNodeId = useEditorStore((state) => state.selectedNodeId)
  const focusedPanel = useEditorStore((state) => state.focusedPanel)
  const setFocusedPanel = useEditorStore((state) => state.setFocusedPanel)
  const [searchQuery, setSearchQuery] = useState('')
  const [expansionStore] = useState(() => new ComponentLayersExpansionStore())
  const panelRef = useRef<HTMLDivElement>(null)
  const treeRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

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
      </div>

      <div className={styles.treeArea}>
        {!projection ? (
          <SkeletonTree ariaLabel="Loading component layers" />
        ) : (
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
                />
              ))
            )}
          </TreeContainer>
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
  searchResult?: boolean
}

function ComponentLayerTreeRow({
  row,
  depth,
  selectedNodeId,
  expanded = true,
  onToggle,
  onSelect,
  searchResult = false,
}: ComponentLayerTreeRowProps) {
  const selected = selectedNodeId === row.nodeId
  const hasChildren = !searchResult && row.children.length > 0
  return (
    <TreeRow
      depth={depth}
      selected={selected}
      locked={row.readOnly}
      role="treeitem"
      aria-level={depth + 1}
      aria-selected={selected}
      aria-expanded={hasChildren ? expanded : undefined}
      tabIndex={0}
      data-node-id={row.nodeId}
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

function LayerBadge({ row }: { row: ComponentLayerRow }) {
  const label = row.status === 'missing-library-entry'
    ? 'missing'
    : row.status === 'missing-component'
      ? 'missing'
      : row.status === 'deprecated'
        ? 'deprecated'
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
