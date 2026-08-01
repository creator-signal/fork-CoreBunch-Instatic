import type { IconStoredProps } from './props'

export const ICON_PATHS: Record<IconStoredProps['name'], string> = {
  information: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm1 15h-2v-6h2v6Zm0-8h-2V7h2v2Z',
  check: 'm9.5 16.2-4.2-4.2 1.4-1.4 2.8 2.8 7.8-7.8 1.4 1.4-9.2 9.2Z',
  warning: 'M12 3 1.8 20h20.4L12 3Zm1 14h-2v-2h2v2Zm0-4h-2V9h2v4Z',
  error: 'M7.8 6.4 12 10.6l4.2-4.2 1.4 1.4-4.2 4.2 4.2 4.2-1.4 1.4-4.2-4.2-4.2 4.2-1.4-1.4 4.2-4.2-4.2-4.2 1.4-1.4Z',
  star: 'm12 2.5 2.9 5.9 6.5.9-4.7 4.6 1.1 6.5-5.8-3-5.8 3 1.1-6.5-4.7-4.6 6.5-.9L12 2.5Z',
  person: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0H5Z',
}

export function normalizeIconName(value: unknown): IconStoredProps['name'] {
  return typeof value === 'string' && value in ICON_PATHS
    ? value as IconStoredProps['name']
    : 'information'
}

export function normalizeIconSize(value: unknown): IconStoredProps['size'] {
  return value === 'small' || value === 'large' ? value : 'medium'
}

export const ICON_CSS = `
[data-instatic-icon] {
  display: inline-block;
  width: var(--instatic-icon-size, 1.5rem);
  height: var(--instatic-icon-size, 1.5rem);
  flex: none;
  fill: currentColor;
  vertical-align: -0.125em;
}
[data-instatic-icon-size="small"] { --instatic-icon-size: 1rem; }
[data-instatic-icon-size="medium"] { --instatic-icon-size: 1.5rem; }
[data-instatic-icon-size="large"] { --instatic-icon-size: 2rem; }
`.trim()
