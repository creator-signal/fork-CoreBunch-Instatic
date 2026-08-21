import { deepEqual } from '@core/utils/deepEqual'
import type { Page, PageNode } from '@core/page-tree'
import { ForbiddenSiteChangeError } from './siteDiff'

/**
 * Shared public chrome is authored once in its template. Typed component
 * fields remain editable, while the template shell and component identities
 * stay pack-owned so ordinary pages cannot inherit damaged or duplicate chrome.
 */
export function assertTemplateChromeFieldsOnly(
  previous: Page,
  next: Page,
  requiredEntryIds: readonly string[],
  isApprovedFieldChange: (previous: PageNode, next: PageNode, propKey: string) => boolean,
): void {
  const pagePath = `pages.${next.id}`
  if (
    previous.slug !== next.slug ||
    previous.title !== next.title ||
    previous.rootNodeId !== next.rootNodeId ||
    !deepEqual(previous.template, next.template)
  ) {
    throw new ForbiddenSiteChangeError(
      'structure',
      pagePath,
      'the shared template structure is reconciled by the owning plugin pack',
    )
  }

  const previousIds = Object.keys(previous.nodes).sort()
  const nextIds = Object.keys(next.nodes).sort()
  if (!deepEqual(previousIds, nextIds)) {
    throw new ForbiddenSiteChangeError(
      'structure',
      `${pagePath}.nodes`,
      'the shared template component tree cannot add or remove nodes',
    )
  }

  const editableEntryIds = new Set(requiredEntryIds)
  for (const nodeId of previousIds) {
    const before = previous.nodes[nodeId]!
    const after = next.nodes[nodeId]!
    const entryId = before.catalogueInstance?.entryId
    const isEditableChrome = entryId !== undefined && editableEntryIds.has(entryId)
    if (!isEditableChrome) {
      if (!deepEqual(before, after)) {
        throw new ForbiddenSiteChangeError(
          'structure',
          `${pagePath}.nodes.${nodeId}`,
          'only declared shared-chrome component fields are editable',
        )
      }
      continue
    }

    if (
      before.moduleId !== after.moduleId ||
      !deepEqual(before.children, after.children) ||
      !deepEqual(before.label, after.label) ||
      !deepEqual(before.locked, after.locked) ||
      !deepEqual(before.hidden, after.hidden) ||
      !deepEqual(before.propBindings, after.propBindings) ||
      !deepEqual(before.dynamicBindings, after.dynamicBindings) ||
      !deepEqual(before.catalogueInstance, after.catalogueInstance) ||
      !deepEqual(before.classIds, after.classIds) ||
      !deepEqual(before.inlineStyles, after.inlineStyles) ||
      !deepEqual(before.breakpointOverrides, after.breakpointOverrides)
    ) {
      throw new ForbiddenSiteChangeError(
        'structure',
        `${pagePath}.nodes.${nodeId}`,
        'shared chrome may change declared fields but not its structure or appearance',
      )
    }

    const propKeys = new Set([...Object.keys(before.props), ...Object.keys(after.props)])
    for (const propKey of propKeys) {
      if (deepEqual(before.props[propKey], after.props[propKey])) continue
      if (!isApprovedFieldChange(before, after, propKey)) {
        throw new ForbiddenSiteChangeError(
          'structure',
          `${pagePath}.nodes.${nodeId}.props.${propKey}`,
          'shared chrome may change only declared component fields',
        )
      }
    }
  }
}
