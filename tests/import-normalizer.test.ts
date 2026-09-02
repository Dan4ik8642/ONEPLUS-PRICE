import { describe, expect, it } from "vitest"
import {
  deduplicateImportRows,
  findHeader,
  importArticle,
  normalizeImportRow,
  normalizeMeasureUnit,
  normalizeName,
  parsePrice,
  parseWeight,
} from "../shared/utils/import-normalizer"

describe("Excel import normalization", () => {
  it("normalizes product names and extracts weight suffixes", () => {
    expect(normalizeName("  Сэндвич   с сыром 150Г_ИНТ ")).toBe("СЭНДВИЧ С СЫРОМ")
    expect(normalizeName("Грилата брынза с зеленью 100Г_ИНТ")).toBe("ГРИЛАТА БРЫНЗА С ЗЕЛЕНЬЮ")
    expect(normalizeName("Десерт солёная карамель 115Г_БЫК")).toBe("ДЕСЕРТ СОЛЁНАЯ КАРАМЕЛЬ")
    expect(normalizeName("Кукис ванильный с шоколадом 55_ЛБН")).toBe("КУКИС ВАНИЛЬНЫЙ С ШОКОЛАДОМ")
    expect(parseWeight(null, "Сэндвич 150Г_ИНТ")).toBe(150)
    expect(parseWeight(null, "Кукис ванильный с шоколадом 55_ЛБН")).toBe(55)
    expect(parseWeight("115 г", "Торт")).toBe(115)
    expect(normalizeName("Вода One Price 500мл")).toBe("ВОДА ONE PRICE")
    expect(parseWeight(null, "Вода One Price 500мл")).toBe(500)
    expect(normalizeMeasureUnit(null, "Вода One Price 500мл")).toBe("мл")
    expect(normalizeMeasureUnit("500 мл", "Вода One Price")).toBe("мл")
    expect(normalizeMeasureUnit(null, "Сэндвич 150г_ИНТ")).toBe("г")
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
      article: "A-1", name: "ТОРТ", supplier: "К-ЭКСПО", price: 180, weight: 100, unit: "г",
    })
    expect(normalizeImportRow(["A-4", "Вода One Price 500мл", "Напитки", 120, null], columns)).toEqual({
      article: "A-4", name: "ВОДА ONE PRICE", supplier: "Напитки", price: 120, weight: 500, unit: "мл",
    })
    expect(normalizeImportRow(["A-2", "", "К-ЭКСПО", 180, null], columns)).toBeNull()
    expect(normalizeImportRow(["A-3", "Торт", "К-ЭКСПО", "нет", null], columns)).toBeNull()
  })

  it("keeps the last duplicate row before a PostgreSQL upsert", () => {
    const rows = [
      { article: "A-1", name: "КОФЕ", price: 100 },
      { article: "A-2", name: "ЧАЙ", price: 120 },
      { article: "A-1", name: "КОФЕ", price: 150 },
      { article: "", name: "КАКАО", price: 130 },
      { article: "", name: "КАКАО", price: 140 },
    ]

    expect(deduplicateImportRows(rows)).toEqual([
      { article: "A-1", name: "КОФЕ", price: 150 },
      { article: "A-2", name: "ЧАЙ", price: 120 },
      { article: "", name: "КАКАО", price: 140 },
    ])
    expect(importArticle(rows[3]!)).toBe("name-какао")
  })
})
