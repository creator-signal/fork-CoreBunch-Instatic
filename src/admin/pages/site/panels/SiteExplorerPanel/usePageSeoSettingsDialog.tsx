import { useState } from 'react'
import type { Page } from '@core/page-tree'
import { PageSeoSettingsDialog } from '@admin/shared/dialogs/PageSeoSettingsDialog'
import { useEditorStore } from '@site/store/store'

/** Owns the page-level SEO dialog without adding another concern to Explorer. */
export function usePageSeoSettingsDialog() {
  const updatePageSeo = useEditorStore((state) => state.updatePageSeo)
  const [target, setTarget] = useState<Page | null>(null)

  return {
    openPageSeoSettings: setTarget,
    pageSeoSettingsDialog: target ? (
      <PageSeoSettingsDialog
        page={target}
        onCancel={() => setTarget(null)}
        onSave={(seo) => {
          updatePageSeo(target.id, seo)
          setTarget(null)
        }}
      />
    ) : null,
  }
}
