import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from '@playwright/test'

const ADMIN_BASE_URL = 'http://127.0.0.1:5184'
const PUBLIC_BASE_URL = 'http://127.0.0.1:3012'
const repositoryRoot = dirname(fileURLToPath(import.meta.url))
const OWNER = {
  email: 'owner.e2e@example.com',
  password: 'qwerty123456',
  siteName: 'Automated E2E Site',
} as const
const ownerStateFile = resolve(
  repositoryRoot,
  '.tmp/creator-signal-e2e-owner-state.json',
)

process.env.E2E_OWNER_STATE_FILE ??= ownerStateFile
process.env.E2E_PUBLIC_BASE_URL ??= PUBLIC_BASE_URL

export default defineConfig({
  testDir: './tests/e2e',
  outputDir: '.tmp/creator-signal-editor-results',
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: [
    ['list'],
    ['html', {
      open: 'never',
      outputFolder: '.tmp/creator-signal-editor-report',
    }],
  ],
  use: {
    baseURL: ADMIN_BASE_URL,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: process.env.CI ? 'retain-on-failure' : 'off',
  },
  projects: [
    {
      name: 'creator-signal-setup',
      testMatch: /auth\.setup\.ts$/,
    },
    {
      name: 'creator-signal-components',
      testMatch: /creator-signal-components\.e2e\.ts$/,
      dependencies: ['creator-signal-setup'],
      use: { storageState: ownerStateFile },
    },
  ],
  webServer: {
    command: 'bun run e2e:dev',
    // Probe the editor shell itself. The site root is public content and may
    // legitimately be absent or rebuilding while the authoring UI is ready.
    url: `${ADMIN_BASE_URL}/admin`,
    reuseExistingServer: false,
    timeout: 180_000,
    gracefulShutdown: { signal: 'SIGTERM', timeout: 500 },
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      ...process.env,
      E2E_CMS_PORT: '3012',
      E2E_VITE_PORT: '5184',
      E2E_DATABASE_PATH: './.tmp/creator-signal-editor.db',
      E2E_UPLOADS_DIR: './.tmp/creator-signal-editor-uploads',
      E2E_OWNER_STATE_FILE: ownerStateFile,
      PUBLIC_ORIGIN: ADMIN_BASE_URL,
      INSTATIC_BOOTSTRAP_SITE_NAME: OWNER.siteName,
      INSTATIC_BOOTSTRAP_OWNER_EMAIL: OWNER.email,
      INSTATIC_BOOTSTRAP_OWNER_PASSWORD: OWNER.password,
      INSTATIC_BOOTSTRAP_PLUGIN_PACKAGE: resolve(
        repositoryRoot,
        'integrations/creator-signal.plugin.zip',
      ),
    },
  },
})
