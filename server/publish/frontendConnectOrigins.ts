let configuredOrigins: readonly string[] = []

/**
 * Configure operator-approved browser connection origins.
 *
 * This is intentionally separate from plugin `networkAllowedHosts`: that
 * manifest field also gates server-side sandbox fetches and must continue to
 * reject localhost/internal targets. These origins only extend the CSP emitted
 * for visitor-facing plugin assets.
 */
export function configureFrontendConnectOrigins(origins: readonly string[]): void {
  configuredOrigins = Object.freeze([...new Set(origins)])
}

export function frontendConnectOrigins(): readonly string[] {
  return configuredOrigins
}
