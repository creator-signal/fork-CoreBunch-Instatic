import { expect, type Locator, type Page } from '@playwright/test'

/**
 * Wait for an authenticated admin surface while honouring the recovery control
 * exposed by LazyChunkBoundary. Cold CI runners can take longer than the
 * boundary's eight-second prompt, so the browser test retries through the same
 * visible UI an end user receives instead of reloading or bypassing the route.
 */
export async function expectReadyWithLazyChunkRecovery(
  page: Page,
  ready: Locator,
): Promise<void> {
  const retry = page
    .getByRole('alert')
    .getByRole('button', { name: 'Retry', exact: true })

  for (let attempt = 0; attempt < 3; attempt += 1) {
    await expect.poll(async () => {
      if (await ready.isVisible().catch(() => false)) return 'ready'
      if (await retry.isVisible().catch(() => false)) return 'retry'
      return 'pending'
    }, {
      message: 'authenticated surface or lazy-chunk recovery control',
      timeout: 45_000,
    }).not.toBe('pending')

    if (await ready.isVisible().catch(() => false)) return
    await retry.click()
  }

  await expect(ready).toBeVisible({ timeout: 45_000 })
}
