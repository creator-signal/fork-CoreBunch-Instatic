import { describe, expect, it } from 'bun:test'
import {
  analyseCoherentRichTextConversion,
  applyCoherentRichTextConversion,
  componentLibraryRegistry,
  findComponentLibraryConversionCandidates,
} from '@core/component-library'
import type { ComponentLibraryEntry } from '@core/component-library'
import { registry } from '@core/module-engine'
import { creatorSignalCatalogueEntryId } from '@core/page-tree'
import { publishPage } from '@core/publisher'
import { makeNode, makePage, makeSite } from '../fixtures'
import '@modules/base/index'

const publicId = creatorSignalCatalogueEntryId

describe('Component Library freeform conversion', () => {
  const richTextEntry: ComponentLibraryEntry = {
    id: 'creator-signal.site.rich-text-section',
    version: '1.0.0',
    name: 'Rich Text Section',
    description: 'One coherent rich-text value.',
    category: 'Creator Signal',
    tags: ['rich-text'],
    icon: 'layout',
    source: { type: 'plugin', pluginId: 'creator-signal.site' },
    status: 'stable',
    composition: 'leaf',
    implementation: { type: 'primitive', moduleId: 'creator-signal.site.rich-text-section' },
    fields: [
      { key: 'heading', label: 'Heading', type: 'text', required: true },
      { key: 'body', label: 'Content', type: 'rich-text', required: true },
      { key: 'sectionId', label: 'Section anchor', type: 'text', required: true },
      { key: 'headingLanguage', label: 'Heading language', type: 'text', required: false },
    ],
    variants: [],
    presets: [],
    slots: [],
    constraints: {},
    requirements: { capabilities: [], providerAdapters: [], plugins: ['creator-signal.site'] },
    documentation: { usage: 'Use for coherent prose.' },
  }

  it('consolidates adjacent source-authored prose in one replacement while preserving semantics', () => {
    const heading = makeNode({
      id: 'heading',
      moduleId: 'base.text',
      props: { text: 'Working agreements', tag: 'h2', htmlAttributes: { id: 'agreements', lang: 'en-AU' } },
    })
    const paragraph = makeNode({
      id: 'paragraph',
      moduleId: 'base.text',
      props: { text: 'We communicate clearly.', tag: 'p', htmlAttributes: { id: 'intro' } },
    })
    const subheading = makeNode({
      id: 'subheading',
      moduleId: 'base.text',
      props: { text: 'How we work', tag: 'h3', htmlAttributes: {} },
    })
    const page = makePage({
      nodes: {
        root: makeNode({ id: 'root', moduleId: 'base.body', children: [heading.id, paragraph.id, subheading.id] }),
        [heading.id]: heading,
        [paragraph.id]: paragraph,
        [subheading.id]: subheading,
      },
    })
    page.nodes.heading!.parentId = 'root'
    page.nodes.paragraph!.parentId = 'root'
    page.nodes.subheading!.parentId = 'root'

    const analysis = analyseCoherentRichTextConversion(page, heading.id, richTextEntry)
    expect(analysis.eligible).toBe(true)
    if (!analysis.eligible) throw new Error(analysis.reason)
    expect(analysis.candidate.sourceNodeIds).toEqual(['heading', 'paragraph', 'subheading'])
    expect(analysis.candidate.props).toEqual({
      heading: 'Working agreements',
      body: '<p id="intro">We communicate clearly.</p><h3>How we work</h3>',
      sectionId: 'agreements',
      headingLanguage: 'en-AU',
    })

    const replacement = makeNode({
      id: 'rich-text',
      moduleId: 'creator-signal.site.rich-text-section',
      props: analysis.candidate.props,
      catalogueInstance: analysis.candidate.metadata,
    })
    expect(applyCoherentRichTextConversion(page, analysis.candidate, replacement)).toBe(true)
    expect(page.nodes.root!.children).toEqual(['rich-text'])
    expect(page.nodes['rich-text']?.catalogueInstance).toEqual(analysis.candidate.metadata)
    expect(page.nodes.heading).toBeUndefined()
    expect(page.nodes.paragraph).toBeUndefined()
  })

  it('refuses styled, structural, and unanchored source blocks without changing them', () => {
    const heading = makeNode({
      id: 'heading',
      moduleId: 'base.text',
      props: { text: 'Heading', tag: 'h2', htmlAttributes: {} },
      classIds: ['styled'],
    })
    const paragraph = makeNode({
      id: 'paragraph',
      moduleId: 'base.text',
      props: { text: 'Body', tag: 'p', htmlAttributes: {} },
    })
    const page = makePage({
      nodes: {
        root: makeNode({ id: 'root', moduleId: 'base.body', children: [heading.id, paragraph.id] }),
        [heading.id]: heading,
        [paragraph.id]: paragraph,
      },
    })
    page.nodes.heading!.parentId = 'root'
    page.nodes.paragraph!.parentId = 'root'
    const analysis = analyseCoherentRichTextConversion(page, heading.id, richTextEntry)
    expect(analysis).toEqual({
      eligible: false,
      reason: 'Styled source blocks remain unchanged because Rich Text Section owns presentation.',
    })
    expect(page.nodes.root!.children).toEqual(['heading', 'paragraph'])
  })

  it('finds only lossless primitive/preset matches', () => {
    const node = makeNode({
      id: 'email',
      moduleId: 'base.input',
      props: {
        ...registry.get('base.input')!.defaults,
        inputType: 'email',
        placeholder: 'you@example.com',
      },
    })
    const candidates = findComponentLibraryConversionCandidates(
      node,
      componentLibraryRegistry.list(),
      (moduleId) => registry.get(moduleId)?.defaults,
    )

    expect(candidates.map((candidate) => candidate.entry.id))
      .toEqual([publicId('base.email-input')])
    expect(candidates[0]?.metadata).toEqual({
      entryId: publicId('base.email-input'),
      entryVersion: '1.0.0',
      presetId: 'email',
    })
    expect(candidates[0]?.fields.find((field) => field.key === 'placeholder')?.value)
      .toBe('you@example.com')
  })

  it('preserves children and styling in the preview without claiming a rewrite', () => {
    const node = makeNode({
      id: 'container',
      moduleId: 'base.container',
      props: { ...registry.get('base.container')!.defaults },
      children: ['child'],
      classIds: ['existing'],
      inlineStyles: { color: 'red' },
    })
    const candidates = findComponentLibraryConversionCandidates(
      node,
      componentLibraryRegistry.list(),
      (moduleId) => registry.get(moduleId)?.defaults,
    )

    expect(candidates).toHaveLength(1)
    expect(candidates[0]?.retainedChildCount).toBe(1)
    expect(candidates[0]?.retainsStyling).toBe(true)
  })

  it('rejects arbitrary implementation state and already-governed nodes', () => {
    const node = makeNode({
      id: 'input',
      moduleId: 'base.input',
      props: {
        ...registry.get('base.input')!.defaults,
        inputType: 'invented',
      },
    })
    expect(findComponentLibraryConversionCandidates(
      node,
      componentLibraryRegistry.list(),
      (moduleId) => registry.get(moduleId)?.defaults,
    )).toEqual([])

    node.catalogueInstance = {
      entryId: publicId('base.text-input'),
      entryVersion: '1.0.0',
      presetId: 'text',
    }
    expect(findComponentLibraryConversionCandidates(
      node,
      componentLibraryRegistry.list(),
      (moduleId) => registry.get(moduleId)?.defaults,
    )).toEqual([])
  })

  it('does not change published output when identity is stamped', () => {
    const input = makeNode({
      id: 'email',
      moduleId: 'base.input',
      props: {
        ...registry.get('base.input')!.defaults,
        inputType: 'email',
        placeholder: 'publish@example.com',
      },
    })
    const page = makePage({
      nodes: {
        root: makeNode({
          id: 'root',
          moduleId: 'base.body',
          children: [input.id],
        }),
        [input.id]: input,
      },
    })
    const site = makeSite({ pages: [page] })
    const before = publishPage(page, site, registry).html
    const convertedPage = structuredClone(page)
    convertedPage.nodes.email!.catalogueInstance = {
      entryId: publicId('base.email-input'),
      entryVersion: '1.0.0',
      presetId: 'email',
    }

    expect(publishPage(convertedPage, site, registry).html).toBe(before)
  })
})
