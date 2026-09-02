import { describe, expect, it } from "vitest"
import { productBadgeLayout } from "../shared/utils/badge-layout"

describe("price tag badges", () => {
  it("keeps vegan, hit and new badges in a stable vertical order", () => {
    expect(productBadgeLayout({ vegan: true, hit: true, isNew: true })).toEqual([
      { kind: "vegan", label: "ВЕГАН", topOffset: 14 },
      { kind: "hit", label: "ХИТ", topOffset: 45 },
      { kind: "new", label: "НОВИНКА", topOffset: 76 },
    ])
  })

  it("packs only enabled badges without leaving gaps", () => {
    expect(productBadgeLayout({ vegan: false, hit: false, isNew: false })).toEqual([])
    expect(productBadgeLayout({ vegan: false, hit: true, isNew: true })).toEqual([
      { kind: "hit", label: "ХИТ", topOffset: 14 },
      { kind: "new", label: "НОВИНКА", topOffset: 45 },
    ])
    expect(productBadgeLayout({ vegan: true, hit: false, isNew: true })).toEqual([
      { kind: "vegan", label: "ВЕГАН", topOffset: 14 },
      { kind: "new", label: "НОВИНКА", topOffset: 45 },
    ])
  })
})
