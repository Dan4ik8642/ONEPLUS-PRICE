import { describe, expect, it } from "vitest"
import { findHeader, normalizeImportRow, normalizeName, parsePrice, parseWeight } from "../shared/utils/import-normalizer"

describe("Excel import normalization", () => {
  it("normalizes product names and extracts weight suffixes", () => {
    expect(normalizeName("  Сэндвич   с сыром 150Г_ИНТ ")).toBe("СЭНДВИЧ С СЫРОМ")
    expect(parseWeight(null, "Сэндвич 150Г_ИНТ")).toBe(150)
    expect(parseWeight("115 г", "Торт")).toBe(115)
    expect(parseWeight(null, "Торт")).toBeNull()
  })

  it("finds localized columns and parses prices", () => {
    const headers = ["Артикул", " Название ", "Цена, р."]
    expect(findHeader(headers, "название")).toBe(1)
    expect(findHeader(headers, "поставщик")).toBe(-1)
    expect(parsePrice("1 250,4")).toBe(1250)
    expect(Number.isNaN(parsePrice("нет"))).toBe(true)
  })

  it("builds valid rows and rejects incomplete rows", () => {
    const columns = { article: 0, name: 1, supplier: 2, price: 3, weight: 4 }
    expect(normalizeImportRow(["A-1", "Торт", "К-ЭКСПО", 180, "100 г"], columns)).toEqual({
      article: "A-1", name: "ТОРТ", supplier: "К-ЭКСПО", price: 180, weight: 100,
    })
    expect(normalizeImportRow(["A-2", "", "К-ЭКСПО", 180, null], columns)).toBeNull()
    expect(normalizeImportRow(["A-3", "Торт", "К-ЭКСПО", "нет", null], columns)).toBeNull()
  })
})
