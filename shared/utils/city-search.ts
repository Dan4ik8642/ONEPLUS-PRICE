export type CitySearchItem = { id: number, name: string }

export function searchCities<T extends CitySearchItem>(cities: T[], query: string): T[] {
  const normalizedQuery = query.trim().toLocaleLowerCase("ru-RU")
  if (!normalizedQuery) return cities

  return cities.filter(city => city.name.toLocaleLowerCase("ru-RU").includes(normalizedQuery))
}
