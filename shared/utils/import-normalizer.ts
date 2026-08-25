export type ImportRow = { article: string, name: string, supplier?: string, weight: number | null, price: number }

export function normalizeName(value: unknown) {
  let name = String(value || "").replace(/\s+/g, " ").trim()
  const suffix = name.match(/\s+(\d+)\s*(?:г|гр)\s*_[\p{L}\p{N}-]{2,16}$/iu)
  if (suffix) name = name.slice(0, suffix.index).trim()
  return name.toUpperCase()
}

export function parseWeight(value: unknown, name: unknown) {
  const direct = String(value ?? "").match(/\d+/)?.[0]
  const suffix = String(name || "").match(/\s+(\d+)\s*(?:г|гр)\s*_[\p{L}\p{N}-]{2,16}$/iu)?.[1]
  const parsed = Number(direct || suffix || 0)
  return parsed > 0 ? parsed : null
}

export function parsePrice(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(String(value ?? "").replace(/\s/g, "").replace(",", "."))
  return Number.isFinite(parsed) ? Math.round(parsed) : Number.NaN
}

export function findHeader(headers: unknown[], ...names: string[]) {
  const normalized = headers.map((value) => String(value || "").trim().toLowerCase())
  return normalized.findIndex((header) => names.includes(header))
}

export function normalizeImportRow(row: unknown[], columns: { article: number, name: number, supplier?: number, price: number, weight: number }): ImportRow | null {
  const nameValue = row[columns.name]
  const price = parsePrice(row[columns.price])
  if (!nameValue || !Number.isFinite(price)) return null
  const result: ImportRow = {
    article: columns.article >= 0 ? String(row[columns.article] || "") : "",
    name: normalizeName(nameValue),
    weight: columns.weight >= 0 ? parseWeight(row[columns.weight], nameValue) : parseWeight(null, nameValue),
    price,
  }
  if (columns.supplier !== undefined && columns.supplier >= 0) result.supplier = String(row[columns.supplier] || "").trim()
  return result
}
