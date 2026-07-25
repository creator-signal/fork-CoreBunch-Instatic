/**
 * Pack pages — compile clean HTML (+ CSS) into an installable page and its
 * namespaced class registry.
 *
 * This is the page counterpart to `compilePackLayout`: plugin authors can
 * ship a complete starter site without hand-writing Instatic's flat node map.
 */

import { createNode, reindexNodeParents, type Page, type PageNode, type StyleRule } from '@core/page-tree'
import { importHtml } from '@core/htmlImport'
import { cssToStyleRules } from '@core/siteImport'

export interface PagePackEntry {
  /** Stable page id — auto-namespaced to `<pluginId>/page/<id>`. */
  id: string
  /** URL slug. Use `index` for the homepage and slash-separated values for nested pages. */
  slug: string
  title: string
  html: string
  css?: string
}

export interface CompiledPackPage {
  page: Page
  classes: StyleRule[]
}

export interface CompiledPackPages {
  pages: Page[]
  classes: StyleRule[]
}

function namespacedPageId(pluginId: string, id: string): string {
  return id.startsWith(`${pluginId}/page/`) ? id : `${pluginId}/page/${id}`
}

function compileStyleRules(namespace: string, css: string): {
  classes: StyleRule[]
  classIdByName: Map<string, string>
} {
  const parsedRules = cssToStyleRules(css).rules
  const classIdByName = new Map<string, string>()
  let ambientIndex = 0
  const classes = parsedRules.map((rule) => {
    const id = rule.kind === 'class'
      ? `${namespace}/${rule.name}`
      : `${namespace}/ambient-${ambientIndex++}`
    if (rule.kind === 'class') classIdByName.set(rule.name, id)
    return { ...rule, id, createdAt: 0, updatedAt: 0 }
  })
  return { classes, classIdByName }
}

function deterministicNodeIds(
  pageId: string,
  nodes: Record<string, PageNode>,
  rootIds: string[],
): { nodes: Record<string, PageNode>; rootIds: string[] } {
  const ordered: string[] = []
  const seen = new Set<string>()
  const visit = (id: string) => {
    if (seen.has(id) || !nodes[id]) return
    seen.add(id)
    ordered.push(id)
    for (const childId of nodes[id].children) visit(childId)
  }
  for (const rootId of rootIds) visit(rootId)
  for (const id of Object.keys(nodes).sort()) visit(id)

  const idMap = new Map(ordered.map((id, index) => [id, `${pageId}/node-${index + 1}`]))
  const remapped: Record<string, PageNode> = {}
  for (const oldId of ordered) {
    const nextId = idMap.get(oldId)!
    remapped[nextId] = {
      ...nodes[oldId],
      id: nextId,
      children: nodes[oldId].children.flatMap((childId) => {
        const mapped = idMap.get(childId)
        return mapped ? [mapped] : []
      }),
    }
  }
  return {
    nodes: remapped,
    rootIds: rootIds.flatMap((id) => {
      const mapped = idMap.get(id)
      return mapped ? [mapped] : []
    }),
  }
}

function compileImportedPage(
  pluginId: string,
  entry: PagePackEntry,
  imported: ReturnType<typeof importHtml>,
  classIdByName: ReadonlyMap<string, string>,
): Page {
  const pageId = namespacedPageId(pluginId, entry.id)
  if (imported.rootIds.length === 0) {
    throw new Error(`[plugin-sdk] Pack page "${pageId}" HTML produced no elements.`)
  }

  for (const node of Object.values(imported.nodes)) {
    node.classIds = node.classIds.flatMap((name) => {
      const id = classIdByName.get(name)
      return id ? [id] : []
    })
  }

  const stable = deterministicNodeIds(pageId, imported.nodes, imported.rootIds)
  const body = createNode('base.body')
  body.id = `${pageId}/body`
  body.children = stable.rootIds
  const nodes: Record<string, PageNode> = { [body.id]: body, ...stable.nodes }
  reindexNodeParents(nodes)

  return {
    id: pageId,
    slug: entry.slug,
    title: entry.title,
    rootNodeId: body.id,
    nodes,
  }
}

function requirePackPageDom(entryId: string): void {
  if (typeof DOMParser !== 'undefined') return
  throw new Error(
    `[plugin-sdk] Pack page "${entryId}" needs a DOM to compile its HTML. ` +
      'Build the plugin with `instatic-plugin build`.',
  )
}

export function compilePackPage(pluginId: string, entry: PagePackEntry): CompiledPackPage {
  requirePackPageDom(entry.id)
  const imported = importHtml(entry.html)
  const { classes, classIdByName } = compileStyleRules(
    namespacedPageId(pluginId, entry.id),
    [entry.css, imported.styleCss].filter(Boolean).join('\n\n'),
  )
  return {
    page: compileImportedPage(pluginId, entry, imported, classIdByName),
    classes,
  }
}

/**
 * Compile a complete site against one shared CSS registry.
 *
 * Instatic style rules are site-global. Compiling the same stylesheet once per
 * page creates duplicate ambient selectors that all publish on every route.
 * Site packs should use this builder so every page links to the same reusable
 * classes and the ambient rules are emitted exactly once.
 */
export function compilePackPages(
  pluginId: string,
  entries: PagePackEntry[],
  sharedCss = '',
): CompiledPackPages {
  for (const entry of entries) requirePackPageDom(entry.id)
  const importedPages = entries.map((entry) => ({
    entry,
    imported: importHtml(entry.html),
  }))
  const css = [
    sharedCss,
    ...importedPages.flatMap(({ entry, imported }) => [entry.css, imported.styleCss]),
  ].filter(Boolean).join('\n\n')
  const { classes, classIdByName } = compileStyleRules(`${pluginId}/site`, css)

  return {
    pages: importedPages.map(({ entry, imported }) =>
      compileImportedPage(pluginId, entry, imported, classIdByName)),
    classes,
  }
}
