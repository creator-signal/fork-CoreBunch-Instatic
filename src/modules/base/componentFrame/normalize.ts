export function normalizeComponentFrameToken(
  value: unknown,
  fallback: string,
): string {
  const token = String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '')
  return token || fallback
}
