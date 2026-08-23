import { describe, expect, it } from 'bun:test'
import {
  COMPONENT_LIBRARY_ACCESSIBILITY_RULES,
  analyseSiteComponentLibraryAccessibility,
  assertComponentLibraryAccessibilityPublishable,
  componentLibraryRegistry,
  ComponentLibraryAccessibilityPublishError,
  ComponentLibraryRegistry,
} from '@core/component-library'
import { executeAgentTool } from '@site/agent'
import { useEditorStore } from '@site/store/store'
import { makeSite } from '../publisher/helpers'
import { mcpToolsForCapabilities } from '../../../server/ai/mcp/registry'
import { siteTools } from '../../../server/ai/tools/site'
import {
  creatorSignalAccessibilityContracts,
} from '../../../integrations/creator-signal/accessibility-contract'
import {
  creatorSignalComponentLibraryEntries,
} from '../../../integrations/creator-signal/component-library'
import { pack } from '../../../integrations/creator-signal/pack/site'

const registry = new ComponentLibraryRegistry()
for (const entry of creatorSignalComponentLibraryEntries) registry.register(entry)

const FULL_AUTHORING_CAPABILITIES: Parameters<typeof mcpToolsForCapabilities>[0] = [
  'ai.chat',
  'ai.tools.write',
  'site.read',
  'site.components.edit',
  'pages.publish',
]

function creatorSignalSite(blockingRuleIds: string[] = []) {
  return makeSite({
    pages: structuredClone(pack.pages),
    visualComponents: structuredClone(pack.visualComponents),
    settings: {
      shortcuts: {},
      accessibility: { blockingRuleIds },
    },
  })
}

describe('Creator Signal entry-specific accessibility gates', () => {
  it('declares every accessibility rule as applicable or explicitly not applicable for all 34 entries', () => {
    expect(creatorSignalComponentLibraryEntries).toHaveLength(34)
    expect(Object.keys(creatorSignalAccessibilityContracts).sort()).toEqual(
      creatorSignalComponentLibraryEntries.map((entry) => entry.id).sort(),
    )

    for (const entry of creatorSignalComponentLibraryEntries) {
      const contract = entry.accessibility
      if (!contract) throw new Error(`${entry.id} has no accessibility contract`)
      const applicable = contract.checks.map((check) => check.rule)
      const notApplicable = contract.notApplicable?.map((check) => check.rule) ?? []
      expect([...applicable, ...notApplicable].sort(), entry.id).toEqual(
        [...COMPONENT_LIBRARY_ACCESSIBILITY_RULES].sort(),
      )
      expect(new Set([...applicable, ...notApplicable]).size, entry.id).toBe(
        COMPONENT_LIBRARY_ACCESSIBILITY_RULES.length,
      )
      for (const check of contract.checks) {
        expect(check.summary, `${entry.id}/${check.rule}`).toBeTruthy()
        expect(check.remediation, `${entry.id}/${check.rule}`).toBeTruthy()
        const fields = new Set(entry.fields.map((field) => field.key))
        for (const field of check.fields ?? []) {
          expect(fields.has(field), `${entry.id}/${check.rule} references ${field}`).toBe(true)
        }
      }
      for (const check of contract.notApplicable ?? []) {
        expect(check.rationale, `${entry.id}/${check.rule}`).toBeTruthy()
      }
    }
  })

  it('returns actionable instance-and-field diagnostics and blocks only configured rules', () => {
    const site = creatorSignalSite(['a11y.accessible-name'])
    const template = site.pages.find((page) => page.slug === 'creator-signal-site-template')
    const header = template && Object.values(template.nodes).find(
      (node) => node.catalogueInstance?.entryId === 'creator-signal.site.header',
    )
    if (!header) throw new Error('Creator Signal shared header was not installed')
    header.props.brandName = ''

    const diagnostics = analyseSiteComponentLibraryAccessibility(site, registry, {
      blockingRuleIds: ['a11y.accessible-name'],
    })
    expect(diagnostics).toContainEqual(expect.objectContaining({
      pageId: template.id,
      nodeId: header.id,
      entryId: 'creator-signal.site.header',
      field: 'brandName',
      rule: 'a11y.accessible-name',
      severity: 'error',
      blocking: true,
      remediation: expect.any(String),
    }))
    expect(() => assertComponentLibraryAccessibilityPublishable(site, registry, {
      blockingRuleIds: [],
    })).not.toThrow()
    expect(() => assertComponentLibraryAccessibilityPublishable(site, registry, {
      blockingRuleIds: ['a11y.accessible-name'],
    })).toThrow(ComponentLibraryAccessibilityPublishError)
  })

  it('exposes the same draft diagnostic tool to editor and MCP callers', () => {
    const editorTool = siteTools.find((tool) => tool.name === 'site_check_accessibility')
    const mcpTool = mcpToolsForCapabilities(FULL_AUTHORING_CAPABILITIES)
      .find((tool) => tool.name === 'site_check_accessibility')
    expect(editorTool).toMatchObject({ execution: 'browser', mutates: false })
    expect(mcpTool).toMatchObject({ execution: 'browser', mutates: false })
    expect(mcpTool?.inputSchema).toBe(editorTool?.inputSchema)
  })

  it('returns the field-level policy decision through the editor bridge used by MCP', async () => {
    for (const entry of creatorSignalComponentLibraryEntries) {
      componentLibraryRegistry.registerOrReplace(entry)
    }
    const site = creatorSignalSite(['a11y.accessible-name'])
    const template = site.pages.find((page) => page.slug === 'creator-signal-site-template')!
    const header = Object.values(template.nodes).find(
      (node) => node.catalogueInstance?.entryId === 'creator-signal.site.header',
    )!
    header.props.brandName = ''
    useEditorStore.setState({
      site,
      activePageId: template.id,
      activeDocument: null,
    })

    const result = await executeAgentTool('site_check_accessibility', {})
    expect(result.ok).toBe(true)
    expect(result.data).toMatchObject({
      policy: { blockingRuleIds: ['a11y.accessible-name'] },
    })
    const data = result.data as { blockingDiagnostics: Array<Record<string, unknown>> }
    expect(data.blockingDiagnostics).toContainEqual(expect.objectContaining({
      nodeId: header.id,
      field: 'brandName',
      rule: 'a11y.accessible-name',
      blocking: true,
    }))
  })
})
