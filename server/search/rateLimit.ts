import { RateLimiter } from '../auth/rateLimit'
import { clientIp } from '../auth/security'

/**
 * Public search is intentionally anonymous. Bound it per trusted client IP so
 * arbitrary query generation cannot turn the shared hole cache or index into
 * an unbounded work queue.
 */
export const searchRequestRateLimit = new RateLimiter({
  limit: 60,
  windowMs: 60 * 1000,
})

export function consumeSearchRequest(req: Request): {
  ok: boolean
  retryAfterSeconds: number
} {
  const key = `search:${clientIp(req) ?? 'unknown'}`
  const decision = searchRequestRateLimit.consume(key)
  return {
    ok: decision.ok,
    retryAfterSeconds: decision.ok
      ? 0
      : Math.max(1, Math.ceil(decision.retryAfterMs / 1000)),
  }
}
