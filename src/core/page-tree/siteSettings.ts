/**
 * SiteSettings — per-site configuration stored in SiteDocument.settings.
 * Mirrors `validateSettings` in `validate.ts` (lines ~614–633).
 *
 * Color tokens — REMOVED.
 *
 * The legacy `site.settings.colorTokens` field was the original raw
 * design-token shape (`{ '--color-primary': '#6366f1', ... }`) emitted into a
 * `:root {}` block in the published `framework.css`. It has been fully
 * superseded by the structured framework Color settings
 * (`site.settings.framework.colors`), which is what the editor's Colors panel
 * reads from and writes to.
 *
 * Keeping both paths around silently injected ghost tokens into every fresh
 * project (the old `DEFAULT_COLOR_TOKENS` had seven `#6366f1`-family defaults)
 * that the user could not see or remove via the UI. Per CLAUDE.md ("we are
 * pre-release, don't leave both an old and new implementation side-by-side")
 * the legacy field has been removed entirely; persisted snapshots that still
 * carry a `colorTokens` key are silently dropped on parse.
 *
 * For tolerant parsing (with fallbacks for invalid sub-fields), use
 * `parseSiteSettings` instead of `parseValue(SiteSettingsSchema, raw)`.
 *
 * Constraint #269: no imports from editor / editor-store here.
 */

import { Type, type Static } from '@core/utils/typeboxHelpers'
import { compiledCheck } from '@core/utils/typeboxCompiler'
import { FrameworkSettingsSchema } from '@core/framework-schema'
import { SiteFontsSettingsSchema, parseSiteFontsSettings } from '@core/fonts'

// ---------------------------------------------------------------------------
// SiteSettingsSchema
// ---------------------------------------------------------------------------

export const SiteAccessibilityPolicySchema = Type.Object(
  {
    /**
     * Component Library accessibility rule IDs that are allowed to block
     * publication. An empty or absent policy keeps diagnostics advisory.
     */
    blockingRuleIds: Type.Array(Type.String(), { uniqueItems: true }),
  },
  { additionalProperties: false },
)

export type SiteAccessibilityPolicy = Static<
  typeof SiteAccessibilityPolicySchema
>

export const SiteSearchSettingsSchema = Type.Object(
  {
    enabled: Type.Boolean(),
    queryParam: Type.String({
      minLength: 1,
      maxLength: 32,
      pattern: '^[A-Za-z][A-Za-z0-9_-]*$',
    }),
    minQueryLength: Type.Integer({ minimum: 1, maximum: 32 }),
    maxQueryLength: Type.Integer({ minimum: 1, maximum: 256 }),
    maxResults: Type.Integer({ minimum: 1, maximum: 200 }),
  },
  { additionalProperties: false },
)

export type SiteSearchSettings = Static<typeof SiteSearchSettingsSchema>

export const SiteSettingsSchema = Type.Object({
  metaTitle: Type.Optional(Type.String()),
  metaDescription: Type.Optional(Type.String()),
  faviconUrl: Type.Optional(Type.String()),
  language: Type.Optional(Type.String()),
  /** Structured framework token settings — absent means framework disabled. */
  framework: Type.Optional(FrameworkSettingsSchema),
  /** Library of installed fonts — absent when no fonts added. */
  fonts: Type.Optional(SiteFontsSettingsSchema),
  /** Keyboard shortcut overrides — defaults to {} — handled in parseSiteSettings. */
  shortcuts: Type.Record(Type.String(), Type.String()),
  /** Optional site-owned publication policy for accessibility diagnostics. */
  accessibility: Type.Optional(SiteAccessibilityPolicySchema),
  /** Optional published-page search capability. Absent/disabled means unavailable. */
  search: Type.Optional(SiteSearchSettingsSchema),
})

export type SiteSettings = Static<typeof SiteSettingsSchema>

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  shortcuts: {},
}

export const DEFAULT_SITE_SEARCH_SETTINGS: SiteSearchSettings = {
  enabled: false,
  queryParam: 'q',
  minQueryLength: 2,
  maxQueryLength: 120,
  maxResults: 100,
}

// ---------------------------------------------------------------------------
// Tolerant parsing
// ---------------------------------------------------------------------------

/**
 * Parse SiteSettings, providing fallbacks for all resilient fields.
 *
 * Persisted snapshots from older versions may carry a top-level `colorTokens`
 * field — that legacy data path was removed in favour of the structured
 * framework Color settings (`framework.colors`). Any persisted `colorTokens`
 * key is silently dropped here (no migration: per CLAUDE.md, the dev DB is
 * disposable and there are no production users).
 */
export function parseSiteSettings(raw: unknown): SiteSettings {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return DEFAULT_SITE_SETTINGS
  const r = raw as Record<string, unknown>

  const shortcuts: Record<string, string> = {}
  if (r.shortcuts && typeof r.shortcuts === 'object' && !Array.isArray(r.shortcuts)) {
    for (const [k, v] of Object.entries(r.shortcuts as Record<string, unknown>)) {
      if (typeof v === 'string') shortcuts[k] = v
    }
  }

  const framework = compiledCheck(FrameworkSettingsSchema, r.framework)
    ? (r.framework as SiteSettings['framework'])
    : undefined

  const fonts = r.fonts != null ? parseSiteFontsSettings(r.fonts) : undefined
  const accessibility = compiledCheck(
    SiteAccessibilityPolicySchema,
    r.accessibility,
  )
    ? (r.accessibility as SiteAccessibilityPolicy)
    : undefined
  const search = compiledCheck(SiteSearchSettingsSchema, r.search)
    ? (r.search as SiteSearchSettings)
    : undefined

  return {
    ...(typeof r.metaTitle === 'string' ? { metaTitle: r.metaTitle } : {}),
    ...(typeof r.metaDescription === 'string' ? { metaDescription: r.metaDescription } : {}),
    ...(typeof r.faviconUrl === 'string' ? { faviconUrl: r.faviconUrl } : {}),
    ...(typeof r.language === 'string' ? { language: r.language } : {}),
    framework,
    fonts,
    ...(accessibility ? { accessibility } : {}),
    ...(search ? { search } : {}),
    shortcuts,
  }
}
