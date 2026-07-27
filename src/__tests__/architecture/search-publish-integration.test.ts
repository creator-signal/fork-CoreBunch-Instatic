import { describe, expect, it } from 'bun:test'
import { readFileSync } from 'node:fs'

describe('search publish lifecycle architecture', () => {
  const source = readFileSync('server/publish/publishSite.ts', 'utf8')

  it('refreshes the derived index only after the publish version becomes current', () => {
    const bump = source.indexOf('bumpPublishVersion()')
    const reindex = source.indexOf('searchIndexService.reindex(publishedSite)')
    expect(bump).toBeGreaterThan(-1)
    expect(reindex).toBeGreaterThan(bump)
  })

  it('keeps a search refresh failure from rolling back committed publication', () => {
    expect(source).toContain('searchIndexService.markStale(publishedSite.id)')
    expect(source).toContain('[publish:site] search index refresh failed:')
  })
})
