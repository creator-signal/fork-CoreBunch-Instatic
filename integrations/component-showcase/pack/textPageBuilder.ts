import type { ComponentLibraryEntry } from '@core/component-library'
import { registry } from '@core/module-engine'
import {
  creatorSignalCatalogueEntryId,
  reindexNodeParents,
  type CatalogueInstanceMetadata,
  type Page,
  type PageNode,
} from '@core/page-tree'
import { BUILT_IN_COMPONENT_LIBRARY_ENTRIES } from '@modules/base/componentLibrary'

export const SHOWCASE_PLUGIN_ID = 'instatic.component-showcase'

const entryById = new Map(
  BUILT_IN_COMPONENT_LIBRARY_ENTRIES.map((entry) => [entry.id, entry]),
)

function entry(id: string): ComponentLibraryEntry {
  const publicId = creatorSignalCatalogueEntryId(id)
  const value = entryById.get(publicId)
  if (!value) throw new Error(`Missing showcase catalogue entry "${id}".`)
  return value
}

function cloneValue<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => cloneValue(item)) as T
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, cloneValue(item)]),
    ) as T
  }
  return value
}

function metadata(component: ComponentLibraryEntry): CatalogueInstanceMetadata {
  const implementation = component.implementation.type === 'capability-backed'
    ? component.implementation.backing
    : component.implementation
  return {
    entryId: component.id,
    entryVersion: component.version,
    ...(implementation.type === 'primitive' && implementation.presetId
      ? { presetId: implementation.presetId }
      : {}),
  }
}

export class TextShowcasePageBuilder {
  readonly page: Page
  private sequence = 0

  constructor(id: string, slug: string, title: string) {
    const pageId = `${SHOWCASE_PLUGIN_ID}/page/${id}`
    const bodyId = `${pageId}/body`
    this.page = {
      id: pageId,
      slug,
      title,
      rootNodeId: bodyId,
      nodes: {
        [bodyId]: {
          id: bodyId,
          moduleId: 'base.body',
          props: cloneValue(registry.getOrThrow('base.body').defaults),
          breakpointOverrides: {},
          children: [],
          classIds: [`${SHOWCASE_PLUGIN_ID}/page`],
        },
      },
    }
  }

  addSection(
    classNames: string[] = [],
    tag: 'section' | 'header' | 'main' | 'article' | 'footer' = 'section',
  ): string {
    return this.addMappedNode(
      entry('base.section'),
      this.page.rootNodeId,
      { tag },
      classNames,
    )
  }

  addContainer(
    parentId: string,
    classNames: string[] = [],
    tag: 'div' | 'section' | 'article' | 'header' | 'footer' = 'div',
  ): string {
    return this.addMappedNode(
      entry('base.container'),
      parentId,
      { tag },
      classNames,
    )
  }

  addText(
    parentId: string,
    text: string,
    options: {
      tag?: string
      classNames?: string[]
      htmlAttributes?: Record<string, string>
    } = {},
  ): string {
    const textEntry = entry('base.plain-text')
    const id = this.nextId()
    this.page.nodes[id] = {
      id,
      moduleId: 'base.text',
      props: {
        ...cloneValue(registry.getOrThrow('base.text').defaults),
        text,
        tag: options.tag ?? 'p',
        ...(options.htmlAttributes
          ? { htmlAttributes: cloneValue(options.htmlAttributes) }
          : {}),
      },
      breakpointOverrides: {},
      children: [],
      classIds: (options.classNames ?? [])
        .map((name) => `${SHOWCASE_PLUGIN_ID}/${name}`),
      catalogueInstance: metadata(textEntry),
    }
    this.page.nodes[parentId]?.children.push(id)
    return id
  }

  finish(): Page {
    reindexNodeParents(this.page.nodes)
    return this.page
  }

  private addMappedNode(
    component: ComponentLibraryEntry,
    parentId: string,
    props: Record<string, unknown>,
    classNames: string[],
  ): string {
    const implementation = component.implementation.type === 'capability-backed'
      ? component.implementation.backing
      : component.implementation
    if (implementation.type !== 'primitive') {
      throw new Error(`Expected "${component.id}" to be a primitive.`)
    }
    const id = this.nextId()
    this.page.nodes[id] = {
      id,
      moduleId: implementation.moduleId,
      props: {
        ...cloneValue(registry.getOrThrow(implementation.moduleId).defaults),
        ...props,
      },
      breakpointOverrides: {},
      children: [],
      classIds: classNames.map((name) => `${SHOWCASE_PLUGIN_ID}/${name}`),
      catalogueInstance: metadata(component),
    }
    this.page.nodes[parentId]?.children.push(id)
    return id
  }

  private nextId(): string {
    this.sequence += 1
    return `${this.page.id}/node-${this.sequence}`
  }
}

export function catalogueEntriesForPage(page: Page): string[] {
  return Object.values(page.nodes)
    .map((node: PageNode) => node.catalogueInstance?.entryId)
    .filter((id): id is string => Boolean(id))
}
