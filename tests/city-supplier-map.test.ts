import { describe, expect, it } from "vitest"
import citySupplierMap from "../server/data/city-supplier-map.json"
import foodPriceBase from "../server/data/food-price-base.json"

const baseSuppliers = new Set(foodPriceBase.rows.map(row => row.supplier))
const integritaSuppliers = [...baseSuppliers].filter(name => name.toLocaleLowerCase("ru-RU").includes("интегрита"))

describe("city supplier folder mapping", () => {
  it("contains only real city folders and known base suppliers", () => {
    expect(citySupplierMap.cities).toHaveLength(47)
    expect(citySupplierMap.cities.some(city => city.name.endsWith(" NEW"))).toBe(false)
    expect(citySupplierMap.cities.some(city => city.name === "Интегрита (федеральный поставщик)" || city.name === "Персь")).toBe(false)
    expect(citySupplierMap.cities.some(city => city.name === "Интегрита")).toBe(true)
    expect(citySupplierMap.cities.every(city => city.suppliers.length > 0)).toBe(true)
    expect(citySupplierMap.cities.flatMap(city => city.suppliers).every(name => baseSuppliers.has(name))).toBe(true)
  })

  it("keeps regional assignments and isolates Integrita as a separate city", () => {
    const suppliers = (city: string) => citySupplierMap.cities.find(item => item.name === city)?.suppliers || []
    expect(suppliers("Москва")).toContain("ООО «К-ЭКСПРО» (Вкусняшка)")
    expect(suppliers("Казань")).toContain("ООО \"МАРР РУССИЯ\" Казань")
    expect(suppliers("Ставрополь")).toContain("ИП Волкова М.Е. (\"Сытное меню\")")
    expect(suppliers("Интегрита")).toEqual(expect.arrayContaining(integritaSuppliers))
    expect(suppliers("Интегрита")).toHaveLength(integritaSuppliers.length)
    for (const city of citySupplierMap.cities.filter(item => item.name !== "Интегрита")) {
      expect(city.suppliers).not.toEqual(expect.arrayContaining(integritaSuppliers))
      expect(city.suppliers.some(name => integritaSuppliers.includes(name))).toBe(false)
    }
  })
})
