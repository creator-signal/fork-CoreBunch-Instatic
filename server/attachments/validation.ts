import { extname } from 'node:path'
import { createHash } from 'node:crypto'
import type { AttachmentPolicy } from '@core/attachments'

interface SignatureRule {
  mimeType: string
  extensions: readonly string[]
  matches: (bytes: Uint8Array) => boolean
}

function startsWith(bytes: Uint8Array, expected: readonly number[]): boolean {
  return expected.every((value, index) => bytes[index] === value)
}

function isUtf8Text(bytes: Uint8Array): boolean {
  if (bytes.includes(0)) return false
  try {
    new TextDecoder('utf-8', { fatal: true }).decode(bytes)
    return true
  } catch {
    return false
  }
}

const SIGNATURE_RULES: readonly SignatureRule[] = [
  {
    mimeType: 'application/pdf',
    extensions: ['.pdf'],
    matches: (bytes) => startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d]),
  },
  {
    mimeType: 'image/png',
    extensions: ['.png'],
    matches: (bytes) =>
      startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  },
  {
    mimeType: 'image/jpeg',
    extensions: ['.jpg', '.jpeg'],
    matches: (bytes) => startsWith(bytes, [0xff, 0xd8, 0xff]),
  },
  {
    mimeType: 'image/gif',
    extensions: ['.gif'],
    matches: (bytes) =>
      startsWith(bytes, [0x47, 0x49, 0x46, 0x38, 0x37, 0x61])
      || startsWith(bytes, [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]),
  },
  {
    mimeType: 'image/webp',
    extensions: ['.webp'],
    matches: (bytes) =>
      startsWith(bytes, [0x52, 0x49, 0x46, 0x46])
      && bytes[8] === 0x57
      && bytes[9] === 0x45
      && bytes[10] === 0x42
      && bytes[11] === 0x50,
  },
  {
    mimeType: 'text/plain',
    extensions: ['.txt'],
    matches: isUtf8Text,
  },
  {
    mimeType: 'text/csv',
    extensions: ['.csv'],
    matches: isUtf8Text,
  },
]

export type AttachmentValidationResult =
  | {
      ok: true
      bytes: Uint8Array
      extension: string
      mimeType: string
      sha256: string
    }
  | { ok: false; code: string; message: string }

export async function validateAttachmentFile(
  file: File,
  policy: AttachmentPolicy,
  authoredMaxBytes?: number,
  authoredAccept?: string,
): Promise<AttachmentValidationResult> {
  if (file.size <= 0) {
    return { ok: false, code: 'empty_file', message: 'File is empty.' }
  }
  const maxBytes = authoredMaxBytes && authoredMaxBytes > 0
    ? Math.min(policy.maxFileBytes, authoredMaxBytes)
    : policy.maxFileBytes
  if (file.size > maxBytes) {
    return {
      ok: false,
      code: 'file_too_large',
      message: `File exceeds the ${maxBytes}-byte limit.`,
    }
  }

  const extension = extname(file.name).toLowerCase()
  const rule = SIGNATURE_RULES.find((candidate) =>
    candidate.extensions.includes(extension),
  )
  if (!rule) {
    return {
      ok: false,
      code: 'unsupported_extension',
      message: 'This file extension is not allowed.',
    }
  }
  if (!policy.allowedMimeTypes.includes(rule.mimeType)) {
    return {
      ok: false,
      code: 'unsupported_mime',
      message: 'This file type is disabled by the attachment policy.',
    }
  }
  if (authoredAccept) {
    const accepted = authoredAccept
      .split(',')
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean)
    if (
      accepted.length > 0
      && !accepted.includes(extension)
      && !accepted.includes(rule.mimeType)
    ) {
      return {
        ok: false,
        code: 'field_type_restricted',
        message: 'This file type is not accepted by this field.',
      }
    }
  }
  if (file.type && file.type.toLowerCase() !== rule.mimeType) {
    return {
      ok: false,
      code: 'mime_mismatch',
      message: 'The declared file type does not match its extension.',
    }
  }

  const bytes = new Uint8Array(await file.arrayBuffer())
  if (!rule.matches(bytes)) {
    return {
      ok: false,
      code: 'signature_mismatch',
      message: 'The file content does not match its extension and MIME type.',
    }
  }
  return {
    ok: true,
    bytes,
    extension,
    mimeType: rule.mimeType,
    sha256: createHash('sha256').update(bytes).digest('hex'),
  }
}

export const SUPPORTED_ATTACHMENT_MIME_TYPES = SIGNATURE_RULES.map(
  (rule) => rule.mimeType,
)

