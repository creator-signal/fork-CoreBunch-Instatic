export function normalizeCodeLanguage(value: unknown): string {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_+-]/g, '')
  return normalized || 'text'
}
