/**
 * Environment-backed MinIO/S3 media adapter.
 *
 * This adapter is host-owned rather than plugin-owned because production
 * MinIO resolves to a private address. The plugin network sandbox correctly
 * blocks private-address fetches; the trusted host adapter receives only the
 * bucket-scoped identity mounted by the deployment.
 */

import { createHash, createHmac } from 'node:crypto'
import type {
  MediaStorageAdapter,
  MediaStorageBeginWriteInput,
  MediaStorageUploadPlan,
} from '@core/plugin-sdk'

export interface MinioStorageAdapterOptions {
  endpoint: string
  publicBaseUrl: string
  bucket: string
  region: string
  prefix: string
  accessKey: string
  secretKey: string
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

function hmac(key: Buffer | string, value: string): Buffer {
  return createHmac('sha256', key).update(value).digest()
}

function awsEncode(value: string): string {
  return encodeURIComponent(value).replace(/[!'()*]/g, (character) =>
    `%${character.charCodeAt(0).toString(16).toUpperCase()}`)
}

function objectKey(options: MinioStorageAdapterOptions, input: MediaStorageBeginWriteInput): string {
  const safeName = input.suggestedStoragePath.replace(/[^a-zA-Z0-9._-]/g, '-')
  return [
    ...options.prefix.split('/').filter(Boolean),
    input.role,
    input.contentHash.slice(0, 2),
    `${input.contentHash}-${safeName}`,
  ].join('/')
}

function requestUrl(options: MinioStorageAdapterOptions, key = ''): URL {
  const endpoint = new URL(options.endpoint)
  endpoint.pathname = `/${awsEncode(options.bucket)}${key
    ? `/${key.split('/').map(awsEncode).join('/')}`
    : ''}`
  endpoint.search = ''
  endpoint.hash = ''
  return endpoint
}

function signedHeaders(
  options: MinioStorageAdapterOptions,
  method: string,
  url: URL,
  now = new Date(),
): Record<string, string> {
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '')
  const date = amzDate.slice(0, 8)
  const payloadHash = 'UNSIGNED-PAYLOAD'
  const canonicalHeaders =
    `host:${url.host}\n` +
    `x-amz-content-sha256:${payloadHash}\n` +
    `x-amz-date:${amzDate}\n`
  const signedHeaderNames = 'host;x-amz-content-sha256;x-amz-date'
  const canonicalRequest =
    `${method}\n${url.pathname}\n\n${canonicalHeaders}\n${signedHeaderNames}\n${payloadHash}`
  const scope = `${date}/${options.region}/s3/aws4_request`
  const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${scope}\n${sha256(canonicalRequest)}`
  const dateKey = hmac(`AWS4${options.secretKey}`, date)
  const regionKey = hmac(dateKey, options.region)
  const serviceKey = hmac(regionKey, 's3')
  const signingKey = hmac(serviceKey, 'aws4_request')
  const signature = createHmac('sha256', signingKey).update(stringToSign).digest('hex')
  return {
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amzDate,
    authorization:
      `AWS4-HMAC-SHA256 Credential=${options.accessKey}/${scope}, ` +
      `SignedHeaders=${signedHeaderNames}, Signature=${signature}`,
  }
}

function publicUrl(options: MinioStorageAdapterOptions, storagePath: string): string {
  return `${options.publicBaseUrl.replace(/\/+$/, '')}/${storagePath
    .split('/').map(awsEncode).join('/')}`
}

async function removeObject(
  options: MinioStorageAdapterOptions,
  storagePath: string,
): Promise<void> {
  const url = requestUrl(options, storagePath)
  const response = await fetch(url, {
    method: 'DELETE',
    headers: signedHeaders(options, 'DELETE', url),
  })
  if (!response.ok && response.status !== 404) {
    throw new Error(`[minio] DELETE failed with HTTP ${response.status}`)
  }
}

export function buildMinioStorageAdapter(
  options: MinioStorageAdapterOptions,
): MediaStorageAdapter {
  const publicOrigin = new URL(options.publicBaseUrl, 'http://instatic.local').origin
  const cspOrigins = publicOrigin === 'http://instatic.local'
    ? []
    : [
        { directive: 'img-src' as const, origin: publicOrigin },
        { directive: 'media-src' as const, origin: publicOrigin },
      ]
  return {
    id: 'instatic.minio',
    label: 'MinIO object storage',
    roles: ['original', 'variant', 'avatar', 'font'],
    servingMode: 'public-url',
    ...(cspOrigins.length > 0 ? { cspOrigins } : {}),
    beginWrite: async (input): Promise<MediaStorageUploadPlan> => {
      const storagePath = objectKey(options, input)
      const url = requestUrl(options, storagePath)
      return {
        storagePath,
        steps: [{
          method: 'PUT',
          url: url.toString(),
          headers: {
            ...signedHeaders(options, 'PUT', url),
            'content-type': input.mimeType,
          },
        }],
        expiresAt: Date.now() + 15 * 60 * 1000,
      }
    },
    finalizeWrite: async ({ storagePath }) => ({
      publicUrl: publicUrl(options, storagePath),
      metadata: {
        provider: 'minio',
        bucket: options.bucket,
        prefix: options.prefix,
      },
    }),
    abortWrite: async ({ storagePath }) => removeObject(options, storagePath),
    getReadUrl: async (storagePath) => ({
      url: publicUrl(options, storagePath),
      expiresAt: Number.MAX_SAFE_INTEGER,
    }),
    delete: async (storagePath) => removeObject(options, storagePath),
    verify: async () => {
      try {
        const url = requestUrl(options)
        const response = await fetch(url, {
          method: 'HEAD',
          headers: signedHeaders(options, 'HEAD', url),
        })
        return response.ok
          ? { ok: true }
          : {
              ok: false,
              reason: `MinIO returned HTTP ${response.status}.`,
              hint: 'Check the endpoint, bucket-scoped identity, TLS trust and bucket policy.',
            }
      } catch (error) {
        return {
          ok: false,
          reason: error instanceof Error ? error.message : 'MinIO connection failed.',
        }
      }
    },
  }
}
