import { describe, expect, it } from "vitest"
import { searchAvailableSuppliers, searchCitySuppliers } from "../shared/utils/supplier-catalog"

const links = [
  { id: 1, name: "К-ЭКСПО", cityId: 1 },
  { id: 1, name: "К-ЭКСПО", cityId: 2 },
  { id: 2, name: "Десерт Фентези", cityId: 1 },
]

const catalog = [
  { id: 1, name: "К-ЭКСПО", active: true },
  { id: 2, name: "Десерт Фентези", active: true },
  { id: 3, name: "Вайт Фокс", active: true },
]

describe("admin supplier search", () => {
  it("searches only suppliers linked to the selected city", () => {
    expect(searchCitySuppliers(links, 1, "десерт").map(item => item.id)).toEqual([2])
    expect(searchCitySuppliers(links, 2, "экспо").map(item => item.id)).toEqual([1])
  })

  it("offers only suppliers that are not linked to the selected city", () => {
    expect(searchAvailableSuppliers(catalog, links, 1, "").map(item => item.id)).toEqual([3])
    expect(searchAvailableSuppliers(catalog, links, 2, "ф").map(item => item.id)).toEqual([2, 3])
  })
})
