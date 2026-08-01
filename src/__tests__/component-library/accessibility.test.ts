import { describe, expect, it } from 'bun:test'
import {
  analyseComponentLibraryAccessibility,
  assertComponentLibraryAccessibilityPublishable,
  componentLibraryRegistry,
  ComponentLibraryAccessibilityPublishError,
} from '@core/component-library'
import {
  DEFAULT_SITE_SETTINGS,
  createDefaultSiteExplorerOrganization,
  type Page,
  type PageNode,
  type SiteDocument,
} from '@core/page-tree'
import { normalizeSiteRuntimeConfig } from '@core/site-runtime'
import '@modules/base/index'

describe('Component Library accessibility diagnostics', () => {
  it('identifies the affected instance, rule and remediation in page order', () => {
    const page = pageWith([
      governedNode('heading-one', 'base.text', 'base.heading', {
        text: 'Page title',
        tag: 'h1',
      }),
      governedNode('heading-three', 'base.text', 'base.heading', {
        text: '',
        tag: 'h3',
      }),
    ])

    const diagnostics = analyseComponentLibraryAccessibility(
      page,
      componentLibraryRegistry,
      { blockingRuleIds: ['a11y.accessible-name'] },
    )

    expect(diagnostics).toHaveLength(2)
    expect(diagnostics[0]).toMatchObject({
      pageId: 'page',
      nodeId: 'heading-three',
      entryId: 'base.heading',
      rule: 'a11y.accessible-name',
      category: 'naming',
      blocking: true,
    })
    expect(diagnostics[0]?.remediation).toContain('text')
    expect(diagnostics[1]).toMatchObject({
      nodeId: 'heading-three',
      rule: 'a11y.heading-order',
      blocking: false,
    })
    expect(diagnostics[1]?.message).toContain('h1 to h3')
  })

  it('checks visible form labels and duplicate field IDs structurally', () => {
    const label = governedNode('label', 'base.label', 'base.form-label', {
      text: 'Email',
      targetMode: 'auto',
      targetId: '',
    })
    const first = governedNode('email-one', 'base.input', 'base.email-input', {
      inputType: 'email',
      fieldId: 'email',
    })
    const second = governedNode('email-two', 'base.input', 'base.email-input', {
      inputType: 'email',
      fieldId: 'email',
    })
    const page = pageWith([label, first, second])

    const diagnostics = analyseComponentLibraryAccessibility(
      page,
      componentLibraryRegistry,
    )

    expect(diagnostics.filter((item) => item.rule === 'a11y.unique-field-id'))
      .toHaveLength(2)
    expect(diagnostics).toContainEqual(expect.objectContaining({
      nodeId: 'email-two',
      rule: 'a11y.form-control-label',
      message: 'This form control has no visible associated label.',
    }))
    expect(diagnostics).not.toContainEqual(expect.objectContaining({
      nodeId: 'email-one',
      rule: 'a11y.form-control-label',
    }))
  })

  it('blocks publication only for rules selected by site policy', () => {
    const page = pageWith([
      governedNode('button', 'base.button', 'base.button', {
        label: '',
        href: '',
      }),
    ])
    const site = siteWith(page)

    expect(() => assertComponentLibraryAccessibilityPublishable(
      site,
      componentLibraryRegistry,
      { blockingRuleIds: [] },
    )).not.toThrow()
    expect(() => assertComponentLibraryAccessibilityPublishable(
      site,
      componentLibraryRegistry,
      { blockingRuleIds: ['a11y.accessible-name'] },
    )).toThrow(ComponentLibraryAccessibilityPublishError)
  })
})

function governedNode(
  id: string,
  moduleId: string,
  entryId: string,
  props: Record<string, unknown>,
): PageNode {
  return {
    id,
    moduleId,
    props,
    breakpointOverrides: {},
    children: [],
    parentId: 'root',
    classIds: [],
    catalogueInstance: {
      entryId,
      entryVersion: '1.0.0',
    },
  }
}

function pageWith(children: PageNode[]): Page {
  return {
    id: 'page',
    title: 'Page',
    slug: 'page',
    rootNodeId: 'root',
    nodes: {
      root: {
        id: 'root',
        moduleId: 'base.body',
        props: {},
        breakpointOverrides: {},
        children: children.map((node) => node.id),
        parentId: null,
        classIds: [],
      },
      ...Object.fromEntries(children.map((node) => [node.id, node])),
    },
  }
}

function siteWith(page: Page): SiteDocument {
  return {
    id: 'site',
    name: 'Site',
    pages: [page],
    visualComponents: [],
    layouts: [],
    breakpoints: [],
    settings: structuredClone(DEFAULT_SITE_SETTINGS),
    styleRules: {},
    files: [],
    explorer: createDefaultSiteExplorerOrganization(),
    packageJson: { dependencies: {}, devDependencies: {} },
    runtime: normalizeSiteRuntimeConfig(undefined),
    createdAt: 1,
    updatedAt: 1,
  }
}
