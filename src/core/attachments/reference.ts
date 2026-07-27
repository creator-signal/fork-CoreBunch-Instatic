import type { AttachmentReference } from './schemas'

const PREFIX = 'att:v1:'

export function formatAttachmentReference(
  id: string,
  token: string,
): AttachmentReference {
  return `${PREFIX}${id}:${token}`
}

export function parseAttachmentReference(
  value: unknown,
): { id: string; token: string } | null {
  if (typeof value !== 'string' || !value.startsWith(PREFIX)) return null
  const parts = value.slice(PREFIX.length).split(':')
  if (parts.length !== 2) return null
  const [id, token] = parts
  if (!id || !token || !/^[A-Za-z0-9_-]+$/.test(id) || !/^[A-Za-z0-9_-]+$/.test(token)) {
    return null
  }
  return { id, token }
}

