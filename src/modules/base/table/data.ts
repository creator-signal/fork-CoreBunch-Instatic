export interface ParsedTableData {
  columns: string[]
  rows: string[][]
}

function cells(line: string): string[] {
  return line.split('|').map((value) => value.trim())
}

export function parseTableData(columns: unknown, rows: unknown): ParsedTableData {
  const parsedColumns = cells(String(columns ?? '')).filter(Boolean)
  const width = Math.max(1, parsedColumns.length)
  const parsedRows = String(rows ?? '')
    .split(/\r?\n/)
    .map((line) => cells(line))
    .filter((row) => row.some(Boolean))
    .map((row) => Array.from({ length: width }, (_, index) => row[index] ?? ''))

  return {
    columns:
      parsedColumns.length > 0
        ? parsedColumns
        : Array.from({ length: width }, (_, index) => `Column ${index + 1}`),
    rows: parsedRows,
  }
}
