export type SupplierLink = { id: number, name: string, cityId: number }
export type SupplierCatalogItem = { id: number, name: string, active: boolean }

function normalized(value: string) {
  return value.trim().toLocaleLowerCase("ru-RU")
}

function matches(name: string, query: string) {
  const needle = normalized(query)
  return !needle || name.toLocaleLowerCase("ru-RU").includes(needle)
}

export function searchCitySuppliers(suppliers: SupplierLink[], cityId: number | null, query: string) {
  if (!cityId) return []
  return suppliers.filter(item => item.cityId === cityId && matches(item.name, query))
}

export function searchAvailableSuppliers(catalog: SupplierCatalogItem[], links: SupplierLink[], cityId: number | null, query: string, limit = 8) {
  if (!cityId) return []
  const linkedIds = new Set(links.filter(item => item.cityId === cityId).map(item => item.id))
  return catalog.filter(item => !linkedIds.has(item.id) && matches(item.name, query)).slice(0, limit)
}
