import { describe, expect, it } from 'bun:test'
import {
  componentLibraryRegistry,
  findComponentLibraryConversionCandidates,
} from '@core/component-library'
import { registry } from '@core/module-engine'
import { publishPage } from '@core/publisher'
import { makeNode, makePage, makeSite } from '../fixtures'
import '@modules/base/index'

describe('Component Library freeform conversion', () => {
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
      .toEqual(['base.email-input'])
    expect(candidates[0]?.metadata).toEqual({
      entryId: 'base.email-input',
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
      entryId: 'base.text-input',
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
      entryId: 'base.email-input',
      entryVersion: '1.0.0',
      presetId: 'email',
    }

    expect(publishPage(convertedPage, site, registry).html).toBe(before)
  })
})
