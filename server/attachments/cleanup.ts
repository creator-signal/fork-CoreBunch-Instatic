import type { DbClient } from '../db/client'
import { sweepExpiredAttachments } from './service'

const CLEANUP_INTERVAL_MS = 15 * 60 * 1000

let cleanupTimer: ReturnType<typeof setInterval> | null = null

export function startAttachmentCleanupTick(db: DbClient): void {
  if (cleanupTimer) return
  const run = () => {
    sweepExpiredAttachments(db).catch((err) => {
      console.error('[attachments] Cleanup tick failed:', err)
    })
  }
  run()
  cleanupTimer = setInterval(run, CLEANUP_INTERVAL_MS)
  cleanupTimer.unref?.()
}

export function stopAttachmentCleanupTick(): void {
  if (!cleanupTimer) return
  clearInterval(cleanupTimer)
  cleanupTimer = null
}

