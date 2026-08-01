import { describe, expect, it } from 'bun:test'
import { LOOP_RUNTIME_JS } from '../../../server/publish/loopRuntime'

describe('collection load-more runtime', () => {
  it('targets current and legacy markup and announces async state changes', () => {
    expect(LOOP_RUNTIME_JS).toContain('data-instatic-loop-mode="load-more"')
    expect(LOOP_RUNTIME_JS).toContain('data-instatic-loop-mode="infinite"')
    expect(LOOP_RUNTIME_JS).toContain('data-instatic-collection-status')
    expect(LOOP_RUNTIME_JS).toContain('Loading more items.')
    expect(LOOP_RUNTIME_JS).toContain('More items loaded.')
    expect(LOOP_RUNTIME_JS).toContain(
      'More items could not be loaded. Try again.',
    )
  })
})
