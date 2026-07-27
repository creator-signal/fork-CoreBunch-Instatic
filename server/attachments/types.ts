import type {
  AttachmentHealth,
  AttachmentPolicy,
  AttachmentScanStatus,
  AttachmentStatus,
} from '@core/attachments'

export interface AttachmentRecord {
  id: string
  pageId: string
  formId: string
  fieldId: string
  originalName: string
  extension: string
  mimeType: string
  sizeBytes: number
  sha256: string
  status: AttachmentStatus
  scanStatus: AttachmentScanStatus
  scanMessage: string | null
  storageAdapterId: string
  storagePath: string | null
  referenceTokenHash: string
  dataRowId: string | null
  createdAt: string
  scannedAt: string | null
  expiresAt: string
  claimedAt: string | null
  retentionUntil: string | null
  deletedAt: string | null
}

export interface AttachmentStorageAdapter {
  readonly id: string
  health(): Promise<{ health: AttachmentHealth; message?: string }>
  putQuarantined(input: {
    attachmentId: string
    extension: string
    bytes: Uint8Array
  }): Promise<string>
  activate(storagePath: string): Promise<string>
  read(storagePath: string): Promise<Uint8Array>
  delete(storagePath: string): Promise<void>
}

export type AttachmentScanResult =
  | { status: 'clean' }
  | { status: 'rejected'; reason: string }
  | { status: 'unavailable'; reason: string }
  | { status: 'error'; reason: string }

export interface AttachmentScanner {
  readonly id: string
  health(): Promise<{ health: AttachmentHealth; message?: string }>
  scan(input: {
    bytes: Uint8Array
    filename: string
    mimeType: string
    sha256: string
  }): Promise<AttachmentScanResult>
}

export interface AttachmentRuntime {
  policy: AttachmentPolicy
  storage: AttachmentStorageAdapter
  scanner: AttachmentScanner
}
