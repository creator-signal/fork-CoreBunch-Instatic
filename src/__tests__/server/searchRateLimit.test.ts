import { afterEach, describe, expect, it } from 'bun:test'
import {
  consumeSearchRequest,
  searchRequestRateLimit,
} from '../../../server/search/rateLimit'

const KEY = 'search:203.0.113.25'

afterEach(() => {
  searchRequestRateLimit.reset(KEY)
})

describe('public search rate limit', () => {
  it('allows a bounded anonymous request window and returns a safe retry delay', () => {
    const request = new Request('https://example.test/_instatic/hole/search', {
      headers: { 'x-bun-socket-ip': '203.0.113.25' },
    })

    for (let count = 0; count < 60; count += 1) {
      expect(consumeSearchRequest(request).ok).toBe(true)
    }
    const blocked = consumeSearchRequest(request)
    expect(blocked.ok).toBe(false)
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0)
    expect(blocked.retryAfterSeconds).toBeLessThanOrEqual(60)
  })

  it('does not trust caller-supplied forwarded addresses without a trusted peer', () => {
    const request = new Request('https://example.test/_instatic/hole/search', {
      headers: {
        'x-bun-socket-ip': '203.0.113.25',
        'x-forwarded-for': '198.51.100.9',
      },
    })

    expect(consumeSearchRequest(request).ok).toBe(true)
    expect(searchRequestRateLimit.size()).toBeGreaterThan(0)
  })
})
