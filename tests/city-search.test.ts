import { describe, expect, it } from "vitest"
import { searchCities } from "../shared/utils/city-search"

const cities = [
  { id: 1, name: "Москва" },
  { id: 2, name: "Нижний Новгород" },
  { id: 3, name: "Интегрита" },
]

describe("city search", () => {
  it("returns all cities when the query is empty", () => {
    expect(searchCities(cities, "  ")).toEqual(cities)
  })

  it("searches city names case-insensitively", () => {
    expect(searchCities(cities, "НОВГОРОД")).toEqual([cities[1]])
    expect(searchCities(cities, "интег")).toEqual([cities[2]])
  })
})
