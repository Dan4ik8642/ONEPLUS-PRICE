import type { H3Event } from "h3"
import { createError } from "h3"
import { useRuntimeConfig } from "#imports"
import { normalizeMeasureUnit, normalizeName, parseWeight, type MeasureUnit } from "../../shared/utils/import-normalizer"
import citySupplierMap from "../data/city-supplier-map.json"
import foodPriceBase from "../data/food-price-base.json"

type Body = Record<string, unknown>
type ProductInput = Record<string, unknown>

type City = { id: number, name: string, active: boolean }
type Supplier = { id: number, name: string, active: boolean }
type SupplierCity = { supplierId: number, cityId: number }
type PriceList = { id: number, supplierId: number, name: string, validFrom: string | null, active: boolean, createdAt: string }
type Product = { id: number, priceListId: number, article: string, name: string, weight: number | null, unit: MeasureUnit, price: number, vegan: boolean, hit: boolean, isNew: boolean, active: boolean }
type FoodBaseRow = { article: string, name: string, supplier: string, price: number, weight: number | null, unit?: MeasureUnit }
type CitySupplierMap = { cities: Array<{ name: string, suppliers: string[] }> }

const today = new Date().toISOString().slice(0, 10)
const foodRows = foodPriceBase.rows as FoodBaseRow[]
const supplierNames = [...new Set(foodRows.map(row => row.supplier))]
const supplierIdByName = new Map(supplierNames.map((name, index) => [name, index + 1]))
const preparedSuppliers: Supplier[] = supplierNames.map((name, index) => ({ id: index + 1, name, active: true }))
const preparedPriceLists: PriceList[] = preparedSuppliers.map(supplier => ({ id: supplier.id, supplierId: supplier.id, name: "Текущие цены", validFrom: null, active: true, createdAt: today }))
const mappedCities = (citySupplierMap as CitySupplierMap).cities.filter(city => city.suppliers.length > 0)
const preparedCities: City[] = mappedCities.map((city, index) => ({ id: index + 1, name: city.name, active: true }))
const preparedSupplierCities: SupplierCity[] = mappedCities.flatMap((city, cityIndex) => city.suppliers.map(name => ({ supplierId: supplierIdByName.get(name)!, cityId: cityIndex + 1 })))
const preparedProducts: Product[] = foodRows.map((row, index) => ({
  id: index + 1,
  priceListId: supplierIdByName.get(row.supplier)!,
  article: row.article,
  name: normalizeName(row.name),
  weight: row.weight ?? parseWeight(null, row.name),
  unit: normalizeMeasureUnit(row.unit, row.name),
  price: row.price,
  vegan: false,
  hit: false,
  isNew: false,
  active: true,
}))

const store: {
  cities: City[]
  suppliers: Supplier[]
  supplierCities: SupplierCity[]
  priceLists: PriceList[]
  products: Product[]
} = {
  cities: preparedCities,
  suppliers: preparedSuppliers,
  supplierCities: preparedSupplierCities,
  priceLists: preparedPriceLists,
  products: preparedProducts,
}

function nextId(items: Array<{ id: number }>) {
  return Math.max(0, ...items.map(item => item.id)) + 1
}

function productInput(input: ProductInput, fallback: Partial<Product> = {}): Omit<Product, "id"> {
  return {
    priceListId: Number(input.priceListId ?? fallback.priceListId),
    article: String(input.article || fallback.article || `manual-${crypto.randomUUID()}`),
    name: String(input.name || fallback.name || ""),
    weight: input.weight == null || input.weight === "" ? null : Number(input.weight),
    unit: normalizeMeasureUnit(input.unit ?? fallback.unit, input.name ?? fallback.name),
    price: Number(input.price ?? fallback.price ?? 0),
    vegan: Boolean(input.vegan ?? fallback.vegan),
    hit: Boolean(input.hit ?? fallback.hit),
    isNew: Boolean(input.isNew ?? fallback.isNew),
    active: input.active !== false,
  }
}

export function isDemoMode(event?: H3Event) {
  return String(useRuntimeConfig(event).demoMode || "").toLowerCase() === "true"
}

export function demoAdminData() {
  const suppliers = store.supplierCities.map(link => {
    const supplier = store.suppliers.find(item => item.id === link.supplierId)!
    return { ...supplier, cityId: link.cityId }
  })
  return { cities: store.cities, suppliers, supplierCatalog: store.suppliers, priceLists: store.priceLists, products: store.products }
}

export function demoCatalogData() {
  const data = demoAdminData()
  const activeCityIds = new Set(store.cities.filter(item => item.active).map(item => item.id))
  const activeSupplierIds = new Set(store.suppliers.filter(item => item.active).map(item => item.id))
  const priceLists = store.priceLists.filter(item => item.active && activeSupplierIds.has(item.supplierId))
  const priceListIds = new Set(priceLists.map(item => item.id))
  return {
    cities: store.cities.filter(item => item.active).map(({ id, name }) => ({ id, name })),
    suppliers: data.suppliers.filter(item => item.active && activeCityIds.has(item.cityId)).map(({ id, name, cityId }) => ({ id, name, cityId })),
    priceLists: priceLists.map(({ id, supplierId, name, validFrom }) => ({ id, supplierId, name, validFrom })),
    products: store.products.filter(item => item.active && priceListIds.has(item.priceListId)).map(({ active: _active, ...item }) => item),
  }
}

export function handleDemoAdminAction(body: Body) {
  const action = String(body.action || "")
  if (action === "city") {
    const city = { id: nextId(store.cities), name: String(body.name || "").trim(), active: true }
    if (!city.name) throw createError({ statusCode: 400, statusMessage: "Укажите город" })
    store.cities.push(city)
    return { city }
  }
  if (action === "supplier") {
    const cityId = Number(body.cityId)
    const name = String(body.name || "").trim()
    if (!cityId || !name) throw createError({ statusCode: 400, statusMessage: "Укажите город и поставщика" })
    let supplier = store.suppliers.find(item => item.name === name)
    if (!supplier) {
      supplier = { id: nextId(store.suppliers), name, active: true }
      store.suppliers.push(supplier)
    }
    if (!store.supplierCities.some(item => item.supplierId === supplier!.id && item.cityId === cityId)) store.supplierCities.push({ supplierId: supplier.id, cityId })
    if (!store.priceLists.some(item => item.supplierId === supplier!.id)) store.priceLists.push({ id: nextId(store.priceLists), supplierId: supplier.id, name: "Текущие цены", validFrom: null, active: true, createdAt: today })
    return { supplier }
  }
  if (action === "attach_supplier") {
    const cityId = Number(body.cityId)
    const supplier = store.suppliers.find(item => item.id === Number(body.supplierId))
    if (!cityId || !supplier) throw createError({ statusCode: 404, statusMessage: "Город или поставщик не найден" })
    supplier.active = true
    if (!store.supplierCities.some(item => item.supplierId === supplier.id && item.cityId === cityId)) store.supplierCities.push({ supplierId: supplier.id, cityId })
    if (!store.priceLists.some(item => item.supplierId === supplier.id)) store.priceLists.push({ id: nextId(store.priceLists), supplierId: supplier.id, name: "Текущие цены", validFrom: null, active: true, createdAt: today })
    return { supplier }
  }
  if (action === "supplier_update") {
    const id = Number(body.id)
    const name = String(body.name || "").trim()
    if (!id || !name) throw createError({ statusCode: 400, statusMessage: "Укажите поставщика и новое название" })
    const duplicate = store.suppliers.find(item => item.id !== id && item.name.toLocaleLowerCase("ru-RU") === name.toLocaleLowerCase("ru-RU"))
    if (duplicate) throw createError({ statusCode: 409, statusMessage: "Поставщик с таким названием уже существует" })
    const supplier = store.suppliers.find(item => item.id === id)
    if (!supplier) throw createError({ statusCode: 404, statusMessage: "Поставщик не найден" })
    supplier.name = name
    return { supplier }
  }
  if (action === "price_list") {
    const priceList = { id: nextId(store.priceLists), supplierId: Number(body.supplierId), name: String(body.name || "").trim(), validFrom: body.validFrom ? String(body.validFrom) : null, active: true, createdAt: today }
    store.priceLists.push(priceList)
    return { priceList }
  }
  if (action === "price_list_update") {
    const item = store.priceLists.find(priceList => priceList.id === Number(body.id))
    if (item) Object.assign(item, { name: String(body.name || item.name), validFrom: body.validFrom ? String(body.validFrom) : null, active: body.active !== false })
    return { ok: true }
  }
  if (action === "product") {
    const item = store.products.find(product => product.id === Number((body.product as ProductInput | undefined)?.id))
    if (item) Object.assign(item, productInput((body.product || {}) as ProductInput, item))
    return { ok: true }
  }
  if (action === "manual") {
    const input = (body.product || {}) as ProductInput
    store.products.push({ id: nextId(store.products), ...productInput(input) })
    return { ok: true }
  }
  if (action === "import") {
    const priceListId = Number(body.priceListId)
    const rows = Array.isArray(body.rows) ? body.rows as ProductInput[] : []
    for (const row of rows) {
      const article = String(row.article || `name-${String(row.name || "").toLowerCase()}`)
      const existing = store.products.find(item => item.priceListId === priceListId && item.article === article)
      if (existing) Object.assign(existing, productInput({ ...row, priceListId, article }, existing))
      else store.products.push({ id: nextId(store.products), ...productInput({ ...row, priceListId, article }) })
    }
    return { ok: true, imported: rows.length }
  }
  if (action === "bulk_import") {
    const cityId = Number(body.cityId)
    const rows = Array.isArray(body.rows) ? body.rows as ProductInput[] : []
    const names = new Set(rows.map(row => String(row.supplier || "").trim()).filter(Boolean))
    for (const name of names) handleDemoAdminAction({ action: "supplier", name, cityId })
    return { ok: true, imported: rows.length, suppliers: names.size }
  }
  if (action === "delete_product") store.products = store.products.filter(item => item.id !== Number(body.id))
  if (action === "delete_price_list") {
    const id = Number(body.id)
    store.priceLists = store.priceLists.filter(item => item.id !== id)
    store.products = store.products.filter(item => item.priceListId !== id)
  }
  if (action === "delete_supplier") {
    const id = Number(body.id)
    const listIds = new Set(store.priceLists.filter(item => item.supplierId === id).map(item => item.id))
    store.suppliers = store.suppliers.filter(item => item.id !== id)
    store.supplierCities = store.supplierCities.filter(item => item.supplierId !== id)
    store.priceLists = store.priceLists.filter(item => item.supplierId !== id)
    store.products = store.products.filter(item => !listIds.has(item.priceListId))
  }
  if (action === "delete_city") {
    const cityId = Number(body.id)
    const linkedIds = store.supplierCities.filter(item => item.cityId === cityId).map(item => item.supplierId)
    store.cities = store.cities.filter(item => item.id !== cityId)
    store.supplierCities = store.supplierCities.filter(item => item.cityId !== cityId)
    let deletedSuppliers = 0
    for (const id of linkedIds) {
      if (!store.supplierCities.some(item => item.supplierId === id)) {
        handleDemoAdminAction({ action: "delete_supplier", id })
        deletedSuppliers += 1
      }
    }
    return { ok: true, deletedSuppliers }
  }
  if (["delete_product", "delete_price_list", "delete_supplier"].includes(action)) return { ok: true }
  throw createError({ statusCode: 400, statusMessage: "Неизвестная операция" })
}
