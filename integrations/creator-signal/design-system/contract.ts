export const creatorSignalPluginVersion = '0.3.1'

export const creatorSignalDesignSystemAssetBaseUrl =
  `/uploads/plugins/creator-signal.site/${creatorSignalPluginVersion}/assets/design-system`

export function creatorSignalDesignSystemAssetUrl(path: string): string {
  const relativePath = path.replace(/^\/+/, '')
  return `${creatorSignalDesignSystemAssetBaseUrl}/${relativePath}`
}

export const creatorSignalBrandAssets = {
  markLight: creatorSignalDesignSystemAssetUrl('brand/creator-signal-mark-light.svg'),
  markReversed: creatorSignalDesignSystemAssetUrl('brand/creator-signal-mark-reversed.svg'),
  creatorSignalSocial: creatorSignalDesignSystemAssetUrl('brand/creator-signal-social.png'),
  salesPulseSocial: creatorSignalDesignSystemAssetUrl('brand/sales-pulse-social.png'),
} as const
