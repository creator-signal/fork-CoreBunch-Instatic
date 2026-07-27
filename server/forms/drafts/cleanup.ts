import type { DbClient } from '../../db/client'
import { deleteExpiredFormDrafts } from './repository'

const CLEANUP_INTERVAL_MS = 15 * 60 * 1000
let cleanupTimer: ReturnType<typeof setInterval> | null = null

export function startFormDraftCleanupTick(db: DbClient): void {
  if (cleanupTimer) return
  const run = () => {
    deleteExpiredFormDrafts(db).catch((err) => {
      console.error('[form-drafts] Cleanup tick failed:', err)
    })
  }
  run()
  cleanupTimer = setInterval(run, CLEANUP_INTERVAL_MS)
  cleanupTimer.unref?.()
}

export function stopFormDraftCleanupTick(): void {
  if (!cleanupTimer) return
  clearInterval(cleanupTimer)
  cleanupTimer = null
}
