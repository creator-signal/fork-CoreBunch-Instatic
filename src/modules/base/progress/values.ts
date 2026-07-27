export function normalizeProgress(value: unknown, maximum: unknown) {
  const rawMax = Number(maximum)
  const max = Number.isFinite(rawMax) && rawMax > 0 ? rawMax : 100
  const rawValue = Number(value)
  const current = Number.isFinite(rawValue)
    ? Math.min(max, Math.max(0, rawValue))
    : 0
  return { value: current, maximum: max }
}
