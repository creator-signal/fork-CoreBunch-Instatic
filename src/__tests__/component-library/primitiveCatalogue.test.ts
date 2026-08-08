import { describe, expect, it } from 'bun:test'
import { creatorSignalCatalogueEntryId } from '@core/page-tree'
import { escapeProps } from '@core/publisher'
import { CodeBlockModule } from '@modules/base/codeBlock'
import { RichTextModule } from '@modules/base/richText'
import { TableModule } from '@modules/base/table'
import { parseTableData } from '@modules/base/table/data'
import { BUILT_IN_COMPONENT_LIBRARY_ENTRIES } from '@modules/base/componentLibrary'
import '../matchers'

describe('governed editorial primitives', () => {
  it('registers rich text and code as primitives and Table as a governed definition', () => {
    const bySourceId = new Map(
      BUILT_IN_COMPONENT_LIBRARY_ENTRIES.map((entry) => [
        entry.id.replace('creator-signal.site.catalogue.', 'base.'),
        entry,
      ]),
    )

    expect(bySourceId.get('base.rich-text')?.id).toBe(
      creatorSignalCatalogueEntryId('base.rich-text'),
    )
    expect(bySourceId.get('base.rich-text')?.implementation).toEqual({
      type: 'primitive',
      moduleId: 'base.rich-text',
    })
    expect(bySourceId.get('base.code-block')?.implementation).toEqual({
      type: 'primitive',
      moduleId: 'base.code-block',
    })
    expect(bySourceId.get('base.table')?.implementation).toEqual({
      type: 'visual-component',
      componentId: 'base.vc.table',
    })
  })

  it('sanitises rich text through the publisher property contract', () => {
    const safe = escapeProps(
      {
        ...RichTextModule.defaults,
        html: '<p>Hello <strong>world</strong></p><script>alert(1)</script>',
      },
      RichTextModule.schema,
    )
    const output = RichTextModule.render(safe, [])

    expect(output.html).toContain('<strong>world</strong>')
    expect(output.html).not.toContain('<script')
    expect(output.html).toBeCleanHTML()
  })

  it('keeps code as escaped text and normalises the language token', () => {
    const safe = escapeProps(
      {
        ...CodeBlockModule.defaults,
        code: '<script>alert(1)</script>',
        language: 'Java Script!"',
        label: 'Unsafe <example>',
      },
      CodeBlockModule.schema,
    )
    const output = CodeBlockModule.render(safe, [])

    expect(output.html).toContain('language-javascript')
    expect(output.html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(output.html).not.toContain('<script')
    expect(output.html).toBeCleanHTML()
  })

  it('normalises table rows and emits explicit header scopes', () => {
    expect(parseTableData('Name | Status', 'Alpha | Active\nBeta')).toEqual({
      columns: ['Name', 'Status'],
      rows: [
        ['Alpha', 'Active'],
        ['Beta', ''],
      ],
    })

    const safe = escapeProps(
      {
        ...TableModule.defaults,
        caption: 'Project status',
        columns: 'Name | Status',
        rows: 'Alpha | Active\nBeta | Paused',
        firstColumnHeader: true,
      },
      TableModule.schema,
    )
    const output = TableModule.render(safe, [])

    expect(output.html).toContain('<caption>Project status</caption>')
    expect(output.html).toContain('<th scope="col">Name</th>')
    expect(output.html).toContain('<th scope="row">Alpha</th>')
    expect(output.html).toContain('<td>Active</td>')
    expect(output.html).toBeCleanHTML()
  })
})
