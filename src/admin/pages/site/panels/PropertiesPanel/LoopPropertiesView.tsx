/**
 * LoopPropertiesView — module-settings rows for a selected `base.loop` node.
 *
 * Slotted into the standard PropertiesPanel flow as the Module section's
 * content (alongside the ClassPicker + style sections), so the loop has
 * the same panel surface as every other module. No nested accordions —
 * just a flat list of rows like Container, Text, etc.
 *
 * Renders dynamic controls instead of a static schema because the
 * available filters and order options come from whichever
 * LoopEntitySource the author picks.
 *
 * Achromatic palette (Constraint #376). CSS Modules only (Constraint #402).
 */

import { useAsyncResource } from '@admin/lib/useAsyncResource'
import { nanoid } from 'nanoid'
import { useEditorStore } from '@site/store/store'
import { loopSourceRegistry } from '@core/loops/registry'
import { ENTRY_FIELD_FILTER_KEY, ENTRY_FIELD_SOURCE_ID } from '@core/loops'
import type { LoopEntitySource } from '@core/loops/types'
import type { DataTableListItem } from '@core/data/schemas'
import type { PropertyControl, PropertySchema } from '@core/module-engine'
import { listCmsDataTables } from '@core/persistence/cmsData'
import { getAncestors, type Page } from '@core/page-tree'
import { PropertyControlRenderer } from '@site/property-controls/PropertyControlRenderer'
import {
  CUSTOM_HTML_TAG_VALUE,
  customHtmlTagControl,
  htmlTagControl,
} from '@modules/base/utils/htmlTag'

interface LoopPropertiesViewProps {
  nodeId: string
  props: Record<string, unknown>
  activePage: Page | null
}

export function LoopPropertiesView({ nodeId, props, activePage }: LoopPropertiesViewProps) {
  const updateNodeProps = useEditorStore((s) => s.updateNodeProps)

  const sources = loopSourceRegistry.list()
  const sourceMode = props.sourceMode === 'manual' ? 'manual' : 'dynamic'
  const sourceId = typeof props.sourceId === 'string' ? props.sourceId : ''
  const source: LoopEntitySource | undefined = sourceMode === 'dynamic'
    ? sources.find((s) => s.id === sourceId)
    : undefined
  const manualItems = Array.isArray(props.manualItems)
    ? props.manualItems.flatMap((item): Array<{
        id: string
        fields: Record<string, unknown>
      }> => {
        if (!item || typeof item !== 'object' || Array.isArray(item)) return []
        const candidate = item as Record<string, unknown>
        if (
          typeof candidate.id !== 'string' ||
          !candidate.fields ||
          typeof candidate.fields !== 'object' ||
          Array.isArray(candidate.fields)
        ) {
          return []
        }
        return [{
          id: candidate.id,
          fields: candidate.fields as Record<string, unknown>,
        }]
      })
    : []
  const manualItemLines = manualItems.map((item) => {
    const label =
      item.fields.label ?? item.fields.title ?? item.fields.text ?? item.id
    return String(label)
  }).join('\n')

  const filters =
    props.filters && typeof props.filters === 'object' && !Array.isArray(props.filters)
      ? (props.filters as Record<string, unknown>)
      : {}

  // Data table list — fetched lazily for the data.rows source's tableId picker.
  // Other sources resolve to `null` (no fetch); a failed load resolves to an
  // empty list so the picker degrades gracefully.
  const { data: tables } = useAsyncResource<DataTableListItem[] | null>(
    () => (
      sourceMode === 'dynamic'
      && (sourceId === 'data.rows' || sourceId === ENTRY_FIELD_SOURCE_ID)
        ? listCmsDataTables().catch(() => [])
        : Promise.resolve(null)
    ),
    [sourceMode, sourceId],
  )

  // Build the per-source filter schema with dynamic options patched in.
  function buildFilterSchema(): PropertySchema {
    if (!source) return {}
    if (source.id === 'data.rows' && tables) {
      const tableField = source.filterSchema.tableId
      if (tableField && tableField.type === 'select') {
        return {
          ...source.filterSchema,
          tableId: {
            ...tableField,
            options: [
              { label: '— Choose a table —', value: '' },
              ...tables.map((t) => ({ label: t.name, value: t.id })),
            ],
          },
        }
      }
    }
    if (source.id === ENTRY_FIELD_SOURCE_ID && tables) {
      const fieldControl = source.filterSchema[ENTRY_FIELD_FILTER_KEY]
      if (fieldControl?.type === 'select') {
        return {
          ...source.filterSchema,
          [ENTRY_FIELD_FILTER_KEY]: {
            ...fieldControl,
            options: [
              { label: '— Choose an array field —', value: '' },
              ...entryCollectionFieldOptions(activePage, nodeId, tables),
            ],
          },
        }
      }
    }
    return source.filterSchema
  }
  const filterSchema = buildFilterSchema()

  // Order options reactive to source change.
  const orderOptions: PropertyControl = {
    type: 'select',
    label: 'Order by',
    options:
      source?.orderByOptions.map((o) => ({ label: o.label, value: o.id })) ?? [
        { label: 'Default', value: '' },
      ],
  }

  function handleSourceChange(_key: string, value: unknown) {
    const nextId = typeof value === 'string' ? value : ''
    const next = loopSourceRegistry.get(nextId)
    // Reset filters and orderBy when changing source — keys don't transfer.
    updateNodeProps(nodeId, {
      sourceId: nextId,
      filters: {},
      orderBy: next?.orderByOptions[0]?.id ?? '',
      direction: next?.kind === 'contextual' ? 'asc' : 'desc',
      pagination: next?.kind === 'contextual' ? 'none' : props.pagination,
    })
  }

  function handleSourceModeChange(_key: string, value: unknown) {
    updateNodeProps(nodeId, {
      sourceMode: value === 'manual' ? 'manual' : 'dynamic',
    })
  }

  function handleManualItemsChange(_key: string, value: unknown) {
    const lines = (typeof value === 'string' ? value : '')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
    const idsByLabel = new Map<string, string[]>()
    for (const item of manualItems) {
      const label = String(
        item.fields.label ?? item.fields.title ?? item.fields.text ?? item.id,
      )
      idsByLabel.set(label, [...(idsByLabel.get(label) ?? []), item.id])
    }
    updateNodeProps(nodeId, {
      manualItems: lines.map((line) => {
        const matchingIds = idsByLabel.get(line)
        const persistedId = matchingIds?.shift()
        return {
          id: persistedId ?? `manual-${nanoid(10)}`,
          fields: {
            label: line,
            title: line,
            text: line,
          },
        }
      }),
    })
  }

  function handleFilterChange(key: string, value: unknown) {
    const nextFilters = { ...filters, [key]: value }
    updateNodeProps(nodeId, { filters: nextFilters })
  }

  function handleScalarChange(key: string, value: unknown) {
    updateNodeProps(nodeId, { [key]: value })
  }

  const tagValue = typeof props.tag === 'string' ? props.tag : 'div'
  const customTagValue = typeof props.customTag === 'string' ? props.customTag : ''
  const paginationValue =
    props.pagination === 'infinite'
      ? 'load-more'
      : typeof props.pagination === 'string'
        ? props.pagination
        : 'none'

  return (
    <>
      <PropertyControlRenderer
        propKey="tag"
        control={htmlTagControl()}
        value={tagValue}
        onChange={handleScalarChange}
      />
      {tagValue === CUSTOM_HTML_TAG_VALUE ? (
        <PropertyControlRenderer
          propKey="customTag"
          control={customHtmlTagControl()}
          value={customTagValue}
          onChange={handleScalarChange}
        />
      ) : null}

      <PropertyControlRenderer
        propKey="sourceMode"
        control={{
          type: 'select',
          label: 'Source type',
          options: [
            { label: 'Dynamic source', value: 'dynamic' },
            { label: 'Manual items', value: 'manual' },
          ],
        }}
        value={sourceMode}
        onChange={handleSourceModeChange}
      />

      {sourceMode === 'dynamic' ? (
        <PropertyControlRenderer
          propKey="sourceId"
          control={{
            type: 'select',
            label: 'Source',
            options: [
              { label: '— Pick a source —', value: '' },
              ...sources.map((s) => ({ label: s.label, value: s.id })),
            ],
          }}
          value={sourceId}
          onChange={handleSourceChange}
        />
      ) : (
        <PropertyControlRenderer
          propKey="manualItems"
          control={{
            type: 'textarea',
            label: 'Manual items',
            rows: 6,
            placeholder: 'One item per line',
          }}
          value={manualItemLines}
          onChange={handleManualItemsChange}
        />
      )}

      {source
        ? Object.entries(filterSchema).map(([key, control]) => (
            <PropertyControlRenderer
              key={key}
              propKey={key}
              control={control}
              value={filters[key]}
              onChange={handleFilterChange}
            />
          ))
        : null}

      {source ? (
        <>
          {source.kind !== 'contextual' ? (
            <>
              <PropertyControlRenderer
                propKey="query"
                control={{
                  type: 'text',
                  label: 'Query',
                  placeholder: 'Optional search query',
                }}
                value={typeof props.query === 'string' ? props.query : ''}
                onChange={handleScalarChange}
              />
              <PropertyControlRenderer
                propKey="orderBy"
                control={orderOptions}
                value={typeof props.orderBy === 'string' ? props.orderBy : ''}
                onChange={handleScalarChange}
              />
            </>
          ) : null}
          <PropertyControlRenderer
            propKey="direction"
            control={{
              type: 'select',
              label: 'Direction',
              options: source.kind === 'contextual'
                ? [
                    { label: 'Original order', value: 'asc' },
                    { label: 'Reverse order', value: 'desc' },
                  ]
                : [
                    { label: 'Descending (newest first)', value: 'desc' },
                    { label: 'Ascending (oldest first)', value: 'asc' },
                  ],
            }}
            value={
              typeof props.direction === 'string'
                ? props.direction
                : source.kind === 'contextual' ? 'asc' : 'desc'
            }
            onChange={handleScalarChange}
          />
        </>
      ) : null}

      {sourceMode === 'manual' || source ? (
        <>
          <PropertyControlRenderer
            propKey="limit"
            control={{ type: 'number', label: 'Limit', min: 1, max: 200, step: 1 }}
            value={typeof props.limit === 'number' ? props.limit : 10}
            onChange={handleScalarChange}
          />
          <PropertyControlRenderer
            propKey="offset"
            control={{ type: 'number', label: 'Offset', min: 0, max: 10000, step: 1 }}
            value={typeof props.offset === 'number' ? props.offset : 0}
            onChange={handleScalarChange}
          />
          {sourceMode === 'manual' || source?.kind !== 'contextual' ? (
            <>
              <PropertyControlRenderer
                propKey="pagination"
                control={{
                  type: 'select',
                  label: 'Pagination',
                  options: [
                    { label: 'None', value: 'none' },
                    { label: 'Numbered pages', value: 'numbered' },
                    { label: 'Previous / next', value: 'previous-next' },
                    { label: 'Load more', value: 'load-more' },
                    ...(sourceMode === 'dynamic'
                      ? [{ label: 'Cursor previous / next', value: 'cursor' }]
                      : []),
                  ],
                }}
                value={paginationValue}
                onChange={handleScalarChange}
              />
              {paginationValue !== 'none' ? (
                <PropertyControlRenderer
                  propKey="pageSize"
                  control={{ type: 'number', label: 'Page size', min: 1, max: 100, step: 1 }}
                  value={typeof props.pageSize === 'number' ? props.pageSize : 10}
                  onChange={handleScalarChange}
                />
              ) : null}
            </>
          ) : null}
        </>
      ) : null}
    </>
  )
}

function entryCollectionFieldOptions(
  activePage: Page | null,
  nodeId: string,
  tables: DataTableListItem[],
): Array<{ label: string; value: string }> {
  if (!activePage) return []

  const enclosingDataRowsLoop = [...getAncestors(activePage, nodeId)]
    .reverse()
    .find((node) => node.moduleId === 'base.loop' && node.props.sourceId === 'data.rows')
  const filters = enclosingDataRowsLoop?.props.filters
  const enclosingTableId =
    filters && typeof filters === 'object' && !Array.isArray(filters)
      ? (filters as Record<string, unknown>).tableId
      : null

  let contextTables: DataTableListItem[]
  if (typeof enclosingTableId === 'string' && enclosingTableId) {
    contextTables = tables.filter((table) => table.id === enclosingTableId)
  } else if (activePage.template?.target.kind === 'postTypes') {
    const slugs = new Set(activePage.template.target.tableSlugs)
    contextTables = tables.filter((table) => slugs.has(table.slug))
  } else {
    contextTables = []
  }

  const showTableName = contextTables.length > 1
  const seen = new Set<string>()
  const options: Array<{ label: string; value: string }> = []
  for (const table of contextTables) {
    for (const field of table.fields) {
      const isCollection =
        field.type === 'multiSelect' ||
        ((field.type === 'media' || field.type === 'relation') && field.allowMultiple === true)
      if (!isCollection || seen.has(field.id)) continue
      seen.add(field.id)
      options.push({
        label: showTableName ? `${table.name} → ${field.label}` : field.label,
        value: field.id,
      })
    }
  }
  return options
}
