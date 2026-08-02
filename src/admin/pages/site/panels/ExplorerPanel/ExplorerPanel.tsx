/**
 * ExplorerPanel — the consolidated navigation panel.
 *
 * One `<Panel>` shell hosting a top SegmentedControl that switches between the
 * Layers (DOM tree), Site (pages/templates/components), Code (stylesheets +
 * scripts), and Media tabs. Each tab renders the corresponding panel in its
 * headerless `tab` variant — this shell owns the chrome (header + tabs +
 * close). Mirrors FrameworkPanel.
 *
 * The Site and Code tabs are both served by a SINGLE `SiteExplorerPanel`
 * mount (its `sectionGroup` prop selects which sections show). Two separate
 * instances would each register their own `useDndMonitor`, double-handling
 * every explorer drag — so they deliberately share one instance + DnD scope.
 */
import { useEffect } from 'react'
import { useEditorPermissions } from '@site/editorPermissionsContext'
import { useEditorStore } from '@site/store/store'
import { Panel, type DockablePanelProps } from '@admin/shared/Panel'
import { SegmentedControl } from '@ui/components/SegmentedControl'
import { LayersPanel } from '@site/panels/LayersPanel'
import { SiteExplorerPanel } from '@site/panels/SiteExplorerPanel'
import { MediaExplorerPanel } from '@site/panels/MediaExplorerPanel'
import type {
  ExplorerPanelTab,
  LayersViewMode,
} from '@site/store/slices/uiSlice'
import styles from './ExplorerPanel.module.css'

const TABS: ReadonlyArray<{ value: ExplorerPanelTab; label: string }> = [
  { value: 'layers', label: 'Layers' },
  { value: 'site', label: 'Site' },
  { value: 'code', label: 'Code' },
  { value: 'media', label: 'Media' },
]

const LAYER_VIEWS: ReadonlyArray<{ value: LayersViewMode; label: string }> = [
  { value: 'components', label: 'Components' },
  { value: 'html', label: 'HTML' },
]

interface ExplorerPanelProps extends DockablePanelProps {
  /** Whether the caller can perform structural edits (drives DnD/insert). */
  editable?: boolean
}

export function ExplorerPanel({
  editable = true,
  mode,
  dragHandleProps,
  onToggleMode,
}: ExplorerPanelProps) {
  const permissions = useEditorPermissions()
  const tab = useEditorStore((s) => s.explorerPanelTab)
  const setTab = useEditorStore((s) => s.setExplorerPanelTab)
  const layersViewMode = useEditorStore((s) => s.layersViewMode)
  const setLayersViewMode = useEditorStore((s) => s.setLayersViewMode)
  const setOpen = useEditorStore((s) => s.setExplorerPanelOpen)
  const effectiveLayersViewMode = permissions.canEditStructure
    ? layersViewMode
    : 'components'

  useEffect(() => {
    if (!permissions.canEditStructure && layersViewMode !== 'components') {
      setLayersViewMode('components')
    }
  }, [layersViewMode, permissions.canEditStructure, setLayersViewMode])

  return (
    <Panel
      panelId="explorer"
      title="Explorer"
      testId="explorer-panel"
      onClose={() => setOpen(false)}
      mode={mode}
      dragHandleProps={dragHandleProps}
      onToggleMode={onToggleMode}
      dockLocation="left sidebar"
      body="bare"
    >
      <div className={styles.tabsRow}>
        <SegmentedControl<ExplorerPanelTab>
          value={tab}
          options={TABS}
          onChange={setTab}
          size="sm"
          activeSurface="recessed"
          fullWidth
        />
      </div>
      {tab === 'layers' && (
        <div className={styles.layersViewRow}>
          <SegmentedControl<LayersViewMode>
            value={effectiveLayersViewMode}
            options={permissions.canEditStructure
              ? LAYER_VIEWS
              : LAYER_VIEWS.filter((view) => view.value === 'components')}
            onChange={(mode) => {
              if (mode === 'html' && !permissions.canEditStructure) return
              setLayersViewMode(mode)
            }}
            size="sm"
            activeSurface="recessed"
            fullWidth
            aria-label="Layers view"
            data-testid="layers-view-control"
          />
        </div>
      )}
      <div className={styles.tabBody}>
        <div className={styles.tabMount} hidden={tab !== 'layers'}>
          <LayersPanel editable={editable} />
        </div>
        {/* Single SiteExplorerPanel serves both the Site and Code tabs; the
            `sectionGroup` prop picks which sections render. */}
        <div className={styles.tabMount} hidden={tab !== 'site' && tab !== 'code'}>
          <SiteExplorerPanel
            sectionGroup={tab === 'code' ? 'code' : 'site'}
            organizationDndEnabled={editable}
          />
        </div>
        <div className={styles.tabMount} hidden={tab !== 'media'}>
          <MediaExplorerPanel variant="tab" />
        </div>
      </div>
    </Panel>
  )
}
