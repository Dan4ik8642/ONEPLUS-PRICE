export type MeasureUnit = "г" | "мл"
export type ImportRow = { article: string, name: string, supplier?: string, weight: number | null, unit: MeasureUnit, price: number }
export type ImportIdentityRow = { article?: unknown, name?: unknown }

export function importArticle(row: ImportIdentityRow) {
  return String(row.article || `name-${String(row.name || "").toLowerCase()}`)
}

export function deduplicateImportRows<T extends ImportIdentityRow>(rows: T[]) {
  const unique = new Map<string, T>()
  for (const row of rows) unique.set(importArticle(row), row)
  return [...unique.values()]
}

export function normalizeName(value: unknown) {
  let name = String(value || "").replace(/\s+/g, " ").trim()
  const serviceSuffix = name.match(/_[\p{L}\p{N}-]{2,16}$/iu)
  if (serviceSuffix) name = name.slice(0, serviceSuffix.index).trim().replace(/\s+\d+\s*(?:г|гр|мл|ml)?\s*$/iu, "").trim()
  else name = name.replace(/\s+\d+\s*(?:г|гр|мл|ml)\s*$/iu, "").trim()
  return name.toUpperCase()
}

export function parseWeight(value: unknown, name: unknown) {
  const direct = String(value ?? "").match(/\d+/)?.[0]
  const source = String(name || "").trim()
  const measured = source.match(/\s+(\d+)\s*(?:г|гр|мл|ml)(?:\s*_[\p{L}\p{N}-]{2,16})?$/iu)?.[1]
  const coded = source.match(/\s+(\d+)\s*_[\p{L}\p{N}-]{2,16}$/iu)?.[1]
  const parsed = Number(direct || measured || coded || 0)
  return parsed > 0 ? parsed : null
}

export function normalizeMeasureUnit(value: unknown, name: unknown): MeasureUnit {
  const direct = String(value ?? "").trim().toLocaleLowerCase("ru-RU").replaceAll(".", "")
  if (/^(?:мл|ml)$/.test(direct) || /\d+\s*(?:мл|ml)(?!\p{L})/iu.test(direct)) return "мл"
  if (/^(?:г|гр|g)$/.test(direct) || /\d+\s*(?:г|гр)(?!\p{L})/iu.test(direct)) return "г"
  return /\d+\s*(?:мл|ml)(?:\s*_[\p{L}\p{N}-]{2,16})?$/iu.test(String(name || "")) ? "мл" : "г"
}

export function parsePrice(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(String(value ?? "").replace(/\s/g, "").replace(",", "."))
  return Number.isFinite(parsed) ? Math.round(parsed) : Number.NaN
}

export function findHeader(headers: unknown[], ...names: string[]) {
  const normalized = headers.map((value) => String(value || "").trim().toLowerCase())
  return normalized.findIndex((header) => names.includes(header))
}

export function normalizeImportRow(row: unknown[], columns: { article: number, name: number, supplier?: number, price: number, weight: number, unit?: number }): ImportRow | null {
  const nameValue = row[columns.name]
  const price = parsePrice(row[columns.price])
  if (!nameValue || !Number.isFinite(price)) return null
  const result: ImportRow = {
    article: columns.article >= 0 ? String(row[columns.article] || "") : "",
    name: normalizeName(nameValue),
    weight: columns.weight >= 0 ? parseWeight(row[columns.weight], nameValue) : parseWeight(null, nameValue),
    unit: normalizeMeasureUnit(columns.unit !== undefined && columns.unit >= 0 ? row[columns.unit] : columns.weight >= 0 ? row[columns.weight] : null, nameValue),
    price,
  }
  if (columns.supplier !== undefined && columns.supplier >= 0) result.supplier = String(row[columns.supplier] || "").trim()
  return result
}
