import { access, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { dirname, join, relative, resolve } from 'node:path'
import { assertPathWithin } from '../util/pathWithin'
import type { AttachmentStorageAdapter } from './types'

function safeSegment(value: string, label: string): string {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) {
    throw new Error(`Unsafe attachment ${label}`)
  }
  return value
}

function safeExtension(value: string): string {
  if (!/^\.[a-z0-9]{1,12}$/.test(value)) {
    throw new Error('Unsafe attachment extension')
  }
  return value
}

export function createLocalAttachmentStorage(
  rootDir: string,
): AttachmentStorageAdapter {
  const root = resolve(rootDir)

  const targetFor = (
    siteId: string,
    attachmentId: string,
    state: 'quarantine' | 'active',
    extension: string,
  ): string => {
    const target = join(
      root,
      safeSegment(siteId, 'site id'),
      safeSegment(attachmentId, 'id'),
      `${state}${safeExtension(extension)}`,
    )
    assertPathWithin(root, target)
    return target
  }

  const resolveStoredPath = (storagePath: string): string => {
    const target = resolve(root, storagePath)
    assertPathWithin(root, target)
    return target
  }

  const lifecycleSibling = (target: string): string | null => {
    const alternate = target.replace(
      /([/\\])(quarantine|active)(\.[a-z0-9]+)$/i,
      (_match, separator: string, state: string, extension: string) =>
        `${separator}${state.toLowerCase() === 'active' ? 'quarantine' : 'active'}${extension}`,
    )
    return alternate === target ? null : alternate
  }

  const isNotFound = (err: unknown): boolean =>
    err instanceof Error && 'code' in err && err.code === 'ENOENT'

  return {
    id: 'local-private',
    async health() {
      try {
        await mkdir(root, { recursive: true })
        return { health: 'available' }
      } catch (err) {
        return {
          health: 'unavailable',
          message: err instanceof Error ? err.message : String(err),
        }
      }
    },
    async putQuarantined({ siteId, attachmentId, extension, bytes }) {
      const target = targetFor(siteId, attachmentId, 'quarantine', extension)
      await mkdir(dirname(target), { recursive: true })
      await writeFile(target, bytes, { flag: 'wx' })
      return relative(root, target).replace(/\\/g, '/')
    },
    async activate(storagePath) {
      const source = resolveStoredPath(storagePath)
      if (/([/\\])active(\.[a-z0-9]+)$/i.test(source)) {
        await access(source)
        return relative(root, source).replace(/\\/g, '/')
      }
      const activeName = lifecycleSibling(source)
      if (!activeName) throw new Error('Attachment is not in quarantine')
      assertPathWithin(root, activeName)
      try {
        await rename(source, activeName)
      } catch (err) {
        // A process may have moved the bytes before its DB update completed.
        // Treat the already-active sibling as the same idempotent transition.
        if (!isNotFound(err)) throw err
        await access(activeName)
      }
      return relative(root, activeName).replace(/\\/g, '/')
    },
    async read(storagePath) {
      const target = resolveStoredPath(storagePath)
      let bytes: Uint8Array
      try {
        bytes = await readFile(target)
      } catch (err) {
        const sibling = lifecycleSibling(target)
        if (!isNotFound(err) || !sibling) throw err
        assertPathWithin(root, sibling)
        bytes = await readFile(sibling)
      }
      return new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    },
    async delete(storagePath) {
      const target = resolveStoredPath(storagePath)
      await rm(target, { force: true })
      const sibling = lifecycleSibling(target)
      if (sibling) {
        assertPathWithin(root, sibling)
        await rm(sibling, { force: true })
      }
      await rm(dirname(target), { recursive: false }).catch(() => {})
    },
  }
}
