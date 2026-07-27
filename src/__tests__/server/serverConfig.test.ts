import { describe, expect, it } from 'bun:test'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { normalizeOrigin, readServerConfig, resolvePublicOrigins } from '../../../server/config'

describe('normalizeOrigin', () => {
  it('lowercases scheme and host and strips the trailing slash', () => {
    expect(normalizeOrigin('HTTPS://CMS.Example.com/')).toBe('https://cms.example.com')
  })

  it('strips path, query, and fragment', () => {
    expect(normalizeOrigin('https://cms.example.com/admin?x=1#frag')).toBe('https://cms.example.com')
  })

  it('keeps an explicit non-default port', () => {
    expect(normalizeOrigin('http://localhost:5173')).toBe('http://localhost:5173')
  })

  it('drops a default port (URL normalizes it away)', () => {
    expect(normalizeOrigin('https://cms.example.com:443')).toBe('https://cms.example.com')
  })

  it('returns null for a bare host with no scheme', () => {
    expect(normalizeOrigin('cms.example.com')).toBeNull()
  })

  it('returns null for garbage', () => {
    expect(normalizeOrigin('not a url')).toBeNull()
    expect(normalizeOrigin('')).toBeNull()
    expect(normalizeOrigin('   ')).toBeNull()
  })
})

describe('resolvePublicOrigins', () => {
  it('parses a comma-separated PUBLIC_ORIGIN list and normalizes each entry', () => {
    expect(
      resolvePublicOrigins({
        PUBLIC_ORIGIN: 'https://CMS.example.com/, http://localhost:5173',
      }),
    ).toEqual(['https://cms.example.com', 'http://localhost:5173'])
  })

  it('drops invalid PUBLIC_ORIGIN entries but keeps valid ones', () => {
    expect(
      resolvePublicOrigins({
        PUBLIC_ORIGIN: 'https://cms.example.com, not-a-url, ',
      }),
    ).toEqual(['https://cms.example.com'])
  })

  it('deduplicates entries that normalize to the same origin', () => {
    expect(
      resolvePublicOrigins({
        PUBLIC_ORIGIN: 'https://cms.example.com, https://CMS.example.com/',
      }),
    ).toEqual(['https://cms.example.com'])
  })

  it('falls back to RENDER_EXTERNAL_URL when PUBLIC_ORIGIN is unset', () => {
    expect(resolvePublicOrigins({ RENDER_EXTERNAL_URL: 'https://app.onrender.com' })).toEqual([
      'https://app.onrender.com',
    ])
  })

  it('falls back to https://RAILWAY_PUBLIC_DOMAIN when PUBLIC_ORIGIN is unset', () => {
    expect(resolvePublicOrigins({ RAILWAY_PUBLIC_DOMAIN: 'app.up.railway.app' })).toEqual([
      'https://app.up.railway.app',
    ])
  })

  it('combines both platform vars when both are present', () => {
    expect(
      resolvePublicOrigins({
        RENDER_EXTERNAL_URL: 'https://app.onrender.com',
        RAILWAY_PUBLIC_DOMAIN: 'app.up.railway.app',
      }),
    ).toEqual(['https://app.onrender.com', 'https://app.up.railway.app'])
  })

  it('lets PUBLIC_ORIGIN win over platform vars', () => {
    expect(
      resolvePublicOrigins({
        PUBLIC_ORIGIN: 'https://www.example.com',
        RENDER_EXTERNAL_URL: 'https://app.onrender.com',
        RAILWAY_PUBLIC_DOMAIN: 'app.up.railway.app',
      }),
    ).toEqual(['https://www.example.com'])
  })

  it('returns [] when nothing is configured', () => {
    expect(resolvePublicOrigins({})).toEqual([])
  })
})

describe('readServerConfig', () => {
  it('uses self-hosted local defaults when no environment values are set', () => {
    expect(readServerConfig({})).toEqual({
      port: 3001,
      databaseUrl: 'sqlite:./.tmp/dev.db',
      uploadsDir: './uploads',
      staticDir: './dist',
      trustedProxyCidrs: [],
      publicOrigins: [],
      attachments: {
        directory: resolve('attachments'),
        scannerUrl: null,
        scannerToken: null,
        policy: {
          enabled: false,
          allowedMimeTypes: [
            'application/pdf',
            'image/png',
            'image/jpeg',
            'image/gif',
            'image/webp',
            'text/plain',
            'text/csv',
          ],
          maxFileBytes: 10 * 1024 * 1024,
          maxFiles: 5,
          temporaryTtlSeconds: 24 * 60 * 60,
          retentionDays: 90,
        },
      },
      formDrafts: {
        enabled: false,
        ttlDays: 30,
        maxBytes: 256 * 1024,
      },
      minio: null,
      starterSite: null,
    })
  })

  it('reads runtime paths, port, trusted proxies, and public origins from env', () => {
    expect(
      readServerConfig({
        PORT: '4321',
        DATABASE_URL: 'postgres://instatic:secret@postgres:5432/instatic',
        UPLOADS_DIR: '/srv/instatic/uploads',
        STATIC_DIR: '/srv/instatic/dist',
        TRUSTED_PROXY_CIDRS: '10.0.0.0/8, 192.168.0.0/16, ',
        PUBLIC_ORIGIN: 'https://CMS.example.com/, http://localhost:5173',
        RENDER_EXTERNAL_URL: 'https://ignored.onrender.com',
        RAILWAY_PUBLIC_DOMAIN: 'ignored.up.railway.app',
      }),
    ).toEqual({
      port: 4321,
      databaseUrl: 'postgres://instatic:secret@postgres:5432/instatic',
      uploadsDir: '/srv/instatic/uploads',
      staticDir: '/srv/instatic/dist',
      trustedProxyCidrs: ['10.0.0.0/8', '192.168.0.0/16'],
      publicOrigins: ['https://cms.example.com', 'http://localhost:5173'],
      attachments: {
        directory: '/srv/instatic/attachments',
        scannerUrl: null,
        scannerToken: null,
        policy: {
          enabled: false,
          allowedMimeTypes: [
            'application/pdf',
            'image/png',
            'image/jpeg',
            'image/gif',
            'image/webp',
            'text/plain',
            'text/csv',
          ],
          maxFileBytes: 10 * 1024 * 1024,
          maxFiles: 5,
          temporaryTtlSeconds: 24 * 60 * 60,
          retentionDays: 90,
        },
      },
      formDrafts: {
        enabled: false,
        ttlDays: 30,
        maxBytes: 256 * 1024,
      },
      minio: null,
      starterSite: null,
    })
  })

  it('reads DATABASE_URL from a mounted secret file', () => {
    const directory = mkdtempSync(join(tmpdir(), 'instatic-config-'))
    const path = join(directory, 'database-url')
    writeFileSync(path, 'postgres://instatic:secret@postgres:5432/instatic\n')
    expect(readServerConfig({ DATABASE_URL_FILE: path }).databaseUrl)
      .toBe('postgres://instatic:secret@postgres:5432/instatic')
  })

  it('prefers DATABASE_URL over DATABASE_URL_FILE', () => {
    expect(readServerConfig({
      DATABASE_URL: 'sqlite:./direct.db',
      DATABASE_URL_FILE: 'does-not-need-to-exist',
    }).databaseUrl).toBe('sqlite:./direct.db')
  })

  it('loads complete MinIO configuration from mounted credential files', () => {
    const directory = mkdtempSync(join(tmpdir(), 'instatic-minio-'))
    const accessKeyPath = join(directory, 'access-key')
    const secretKeyPath = join(directory, 'secret-key')
    writeFileSync(accessKeyPath, 'site-access\n')
    writeFileSync(secretKeyPath, 'site-secret\n')
    expect(readServerConfig({
      MINIO_ENDPOINT: 'https://objects.example.test:9000',
      MINIO_PUBLIC_BASE_URL: 'https://site.example.test/media',
      MINIO_BUCKET: 'site-media',
      MINIO_PREFIX: 'site-a',
      MINIO_ACCESS_KEY_FILE: accessKeyPath,
      MINIO_SECRET_KEY_FILE: secretKeyPath,
    }).minio).toEqual({
      endpoint: 'https://objects.example.test:9000',
      publicBaseUrl: 'https://site.example.test/media',
      bucket: 'site-media',
      region: 'us-east-1',
      prefix: 'site-a',
      accessKey: 'site-access',
      secretKey: 'site-secret',
    })
  })

  it('rejects partial MinIO configuration', () => {
    expect(() => readServerConfig({ MINIO_ENDPOINT: 'https://objects.example.test' }))
      .toThrow(/requires MINIO_ENDPOINT/)
  })

  it('reads the private attachment policy and scanner secret from a mounted file', () => {
    const directory = mkdtempSync(join(tmpdir(), 'instatic-attachment-config-'))
    const tokenPath = join(directory, 'scanner-token')
    writeFileSync(tokenPath, 'scanner-secret\n')

    expect(readServerConfig({
      ATTACHMENTS_ENABLED: 'true',
      ATTACHMENTS_DIR: '/srv/private-attachments',
      ATTACHMENT_SCANNER_URL: 'https://scanner.example.test/scan',
      ATTACHMENT_SCANNER_TOKEN_FILE: tokenPath,
      ATTACHMENT_ALLOWED_MIME_TYPES: 'application/pdf, image/png',
      ATTACHMENT_MAX_FILE_BYTES: '2097152',
      ATTACHMENT_MAX_FILES: '2',
      ATTACHMENT_TEMPORARY_TTL_SECONDS: '1800',
      ATTACHMENT_RETENTION_DAYS: '45',
    }).attachments).toEqual({
      directory: '/srv/private-attachments',
      scannerUrl: 'https://scanner.example.test/scan',
      scannerToken: 'scanner-secret',
      policy: {
        enabled: true,
        allowedMimeTypes: ['application/pdf', 'image/png'],
        maxFileBytes: 2097152,
        maxFiles: 2,
        temporaryTtlSeconds: 1800,
        retentionDays: 45,
      },
    })
  })

  it('rejects unsupported attachment MIME types and invalid numeric limits', () => {
    expect(() => readServerConfig({
      ATTACHMENT_ALLOWED_MIME_TYPES: 'application/zip',
    })).toThrow(/unsupported values/)
    expect(() => readServerConfig({
      ATTACHMENT_MAX_FILES: '0',
    })).toThrow(/ATTACHMENT_MAX_FILES must be an integer between 1 and 20/)
    expect(() => readServerConfig({
      ATTACHMENT_MAX_FILES: '21',
    })).toThrow(/ATTACHMENT_MAX_FILES must be an integer between 1 and 20/)
    expect(() => readServerConfig({
      ATTACHMENT_TEMPORARY_TTL_SECONDS: '59',
    })).toThrow(/ATTACHMENT_TEMPORARY_TTL_SECONDS must be an integer at least 60/)
  })

  it('reads and bounds persistent form draft policy', () => {
    expect(readServerConfig({
      FORM_DRAFTS_ENABLED: 'true',
      FORM_DRAFT_TTL_DAYS: '45',
      FORM_DRAFT_MAX_BYTES: '131072',
    }).formDrafts).toEqual({
      enabled: true,
      ttlDays: 45,
      maxBytes: 131072,
    })
    expect(() => readServerConfig({ FORM_DRAFT_TTL_DAYS: '366' }))
      .toThrow(/FORM_DRAFT_TTL_DAYS must be an integer between 1 and 365/)
    expect(() => readServerConfig({ FORM_DRAFT_MAX_BYTES: '1048577' }))
      .toThrow(/FORM_DRAFT_MAX_BYTES must be an integer between 1 and 1048576/)
  })

  it('loads complete starter-site bootstrap configuration from mounted files', () => {
    const directory = mkdtempSync(join(tmpdir(), 'instatic-starter-'))
    const passwordPath = join(directory, 'owner-password')
    const settingsPath = join(directory, 'plugin-settings.json')
    writeFileSync(passwordPath, 'a-production-owner-password\n')
    writeFileSync(settingsPath, JSON.stringify({
      plausibleEnabled: true,
      openPanelEnabled: true,
    }))

    expect(readServerConfig({
      INSTATIC_BOOTSTRAP_SITE_NAME: 'Creator Signal',
      INSTATIC_BOOTSTRAP_OWNER_EMAIL: 'OWNER@CREATORSIGNAL.ME',
      INSTATIC_BOOTSTRAP_OWNER_PASSWORD_FILE: passwordPath,
      INSTATIC_BOOTSTRAP_PLUGIN_PACKAGE: '/app/starter-plugins/creator-signal.plugin.zip',
      INSTATIC_BOOTSTRAP_PLUGIN_SETTINGS_FILE: settingsPath,
    }).starterSite).toEqual({
      siteName: 'Creator Signal',
      ownerEmail: 'owner@creatorsignal.me',
      ownerPassword: 'a-production-owner-password',
      pluginPackagePath: '/app/starter-plugins/creator-signal.plugin.zip',
      pluginSettings: {
        plausibleEnabled: true,
        openPanelEnabled: true,
      },
    })
  })

  it('rejects partial starter-site bootstrap configuration', () => {
    expect(() => readServerConfig({
      INSTATIC_BOOTSTRAP_SITE_NAME: 'Creator Signal',
    })).toThrow(/Starter-site bootstrap requires/)
  })
})
