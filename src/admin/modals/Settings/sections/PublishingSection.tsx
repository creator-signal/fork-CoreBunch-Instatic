/**
 * PublishingSection — self-hosted CMS publishing details.
 */
import { useSiteSettingsController } from '../useSiteSettingsController'
import { resolveFrameworkPreferences } from '@core/framework'
import { DEFAULT_SITE_SEARCH_SETTINGS } from '@core/page-tree'
import { Input } from '@ui/components/Input'
import { Switch } from '@ui/components/Switch'
import { SkeletonBlock } from '@ui/components/Skeleton'
import s from '../SettingsModal.module.css'

export function PublishingSection() {
  const {
    site,
    error,
    updateFrameworkPreferences,
    updateSiteSettings,
  } = useSiteSettingsController()

  if (error) {
    return <p className={s.sectionDescription} role="alert">{error}</p>
  }

  if (!site) {
    return <SkeletonBlock minHeight={200} ariaLabel="Loading site settings" />
  }

  const frameworkPreferences = resolveFrameworkPreferences(site.settings.framework?.preferences)
  const searchSettings = site.settings.search ?? DEFAULT_SITE_SEARCH_SETTINGS
  const treeShakeId = 'publishing-tree-shake-framework-utilities'
  const searchEnabledId = 'publishing-search-enabled'

  return (
    <div>
      <p className={s.sectionDescription}>
        Published pages are served by this self-hosted CMS.
      </p>

      <section aria-labelledby="pub-runtime-heading" className={s.sectionBlock}>
        <h4 id="pub-runtime-heading" className={s.subHeading}>
          Runtime
        </h4>

        <dl className={s.pubRuntimeList}>
          <div>
            <dt>Site</dt>
            <dd>/</dd>
          </div>
          <div>
            <dt>Admin</dt>
            <dd>/admin</dd>
          </div>
          <div>
            <dt>Draft source</dt>
            <dd>Database</dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="pub-framework-heading" className={s.sectionBlock}>
        <h4 id="pub-framework-heading" className={s.subHeading}>
          Framework CSS
        </h4>

        <div className={s.cardGroup}>
          <div className={s.toggleRow}>
            <div className={s.toggleRowContent}>
              <label htmlFor={treeShakeId} className={s.toggleRowLabel}>
                Tree-shake generated framework utilities
              </label>
              <p className={s.toggleRowDesc}>
                Emit only generated color, typography, and spacing utility classes used in the page
                and component trees. Turn this off when custom runtime code references generated
                utilities outside the editor tree.
              </p>
            </div>
            <Switch
              id={treeShakeId}
              checked={frameworkPreferences.treeShakeGeneratedFrameworkUtilities}
              onCheckedChange={(value) =>
                updateFrameworkPreferences({ treeShakeGeneratedFrameworkUtilities: value })
              }
            />
          </div>
        </div>
      </section>

      <section aria-labelledby="pub-search-heading" className={s.sectionBlock}>
        <h4 id="pub-search-heading" className={s.subHeading}>
          Published page search
        </h4>

        <div className={s.cardGroup}>
          <div className={s.toggleRow}>
            <div className={s.toggleRowContent}>
              <label htmlFor={searchEnabledId} className={s.toggleRowLabel}>
                Enable the published search index
              </label>
              <p className={s.toggleRowDesc}>
                Index visible content from non-template pages after a successful publish.
                Drafts, template definitions, and hidden subtrees are excluded.
              </p>
            </div>
            <Switch
              id={searchEnabledId}
              checked={searchSettings.enabled}
              onCheckedChange={(enabled) =>
                updateSiteSettings({
                  search: {
                    ...searchSettings,
                    enabled,
                  },
                })
              }
            />
          </div>
        </div>

        {searchSettings.enabled ? (
          <div className={s.searchSettingsGrid}>
            <label className={s.searchSettingField}>
              <span className={s.label}>Query parameter</span>
              <Input
                type="text"
                defaultValue={searchSettings.queryParam}
                maxLength={32}
                onBlur={(event) => {
                  const queryParam = event.target.value.trim()
                  if (/^[A-Za-z][A-Za-z0-9_-]*$/.test(queryParam)) {
                    updateSiteSettings({
                      search: { ...searchSettings, queryParam },
                    })
                  }
                }}
              />
            </label>
            <label className={s.searchSettingField}>
              <span className={s.label}>Minimum query length</span>
              <Input
                type="number"
                min={1}
                max={32}
                defaultValue={searchSettings.minQueryLength}
                onBlur={(event) => {
                  const minQueryLength = clampInteger(
                    event.target.valueAsNumber,
                    1,
                    Math.min(32, searchSettings.maxQueryLength),
                    searchSettings.minQueryLength,
                  )
                  updateSiteSettings({
                    search: { ...searchSettings, minQueryLength },
                  })
                }}
              />
            </label>
            <label className={s.searchSettingField}>
              <span className={s.label}>Maximum indexed results</span>
              <Input
                type="number"
                min={1}
                max={200}
                defaultValue={searchSettings.maxResults}
                onBlur={(event) => {
                  const maxResults = clampInteger(
                    event.target.valueAsNumber,
                    1,
                    200,
                    searchSettings.maxResults,
                  )
                  updateSiteSettings({
                    search: { ...searchSettings, maxResults },
                  })
                }}
              />
            </label>
          </div>
        ) : null}
      </section>
    </div>
  )
}

function clampInteger(
  value: number,
  minimum: number,
  maximum: number,
  fallback: number,
): number {
  if (!Number.isFinite(value)) return fallback
  return Math.min(maximum, Math.max(minimum, Math.floor(value)))
}
