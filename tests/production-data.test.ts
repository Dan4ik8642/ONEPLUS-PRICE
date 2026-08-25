import path from "node:path"
import { describe, expect, it } from "vitest"
import readXlsxFile from "read-excel-file/node"

describe("production Excel base", () => {
  it("contains the columns required by the bulk supplier import", async () => {
    const rows = await readXlsxFile(path.resolve("data/production/Готовая база с ценами.xlsx"))
    const header = rows.find(row => row.some(value => String(value || "").trim().toLowerCase() === "поставщик"))
    expect(header).toBeDefined()
    const names = header!.map(value => String(value || "").trim().toLowerCase())
    expect(names).toContain("артикул")
    expect(names).toContain("название")
    expect(names).toContain("поставщик")
    expect(names.some(name => ["цена", "цена, р.", "цена, ₽"].includes(name))).toBe(true)
  })
})
