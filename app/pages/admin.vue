<script setup lang="ts">
import readXlsxFile from "read-excel-file"
import { findHeader, normalizeImportRow, type MeasureUnit } from "#shared/utils/import-normalizer"
import { searchAvailableSuppliers, searchCitySuppliers, type SupplierCatalogItem } from "#shared/utils/supplier-catalog"
import { searchCities } from "#shared/utils/city-search"

type City = { id: number, name: string, active: boolean }
type Supplier = { id: number, name: string, active: boolean, cityId: number }
type PriceList = { id: number, supplierId: number, name: string, validFrom: string | null, active: boolean, createdAt: string }
type Product = { id: number, priceListId: number, article: string, name: string, weight: number | null, unit: MeasureUnit, price: number, vegan: boolean, hit: boolean, isNew: boolean, active: boolean }
type AdminData = { cities: City[], suppliers: Supplier[], supplierCatalog: SupplierCatalogItem[], priceLists: PriceList[], products: Product[] }

const cities = ref<City[]>([])
const suppliers = ref<Supplier[]>([])
const supplierCatalog = ref<SupplierCatalogItem[]>([])
const priceLists = ref<PriceList[]>([])
const products = ref<Product[]>([])
const cityId = ref<number | null>(null)
const supplierId = ref<number | null>(null)
const priceListId = ref<number | null>(null)
const newCity = ref("")
const citySearch = ref("")
const newSupplier = ref("")
const supplierName = ref("")
const supplierSearch = ref("")
const catalogSupplierSearch = ref("")
const newList = reactive({ name: "", validFrom: "" })
const notice = ref("")
const bulkLoading = ref(false)
const manual = reactive<{ article: string, name: string, weight: string, unit: MeasureUnit, price: string }>({ article: "", name: "", weight: "", unit: "г", price: "" })

const filteredCities = computed(() => searchCities(cities.value, citySearch.value))
const citySuppliers = computed(() => suppliers.value.filter(item => item.cityId === cityId.value))
const filteredCitySuppliers = computed(() => searchCitySuppliers(suppliers.value, cityId.value, supplierSearch.value))
const availableSuppliers = computed(() => searchAvailableSuppliers(supplierCatalog.value, suppliers.value, cityId.value, catalogSupplierSearch.value))
const supplierLists = computed(() => priceLists.value.filter(item => item.supplierId === supplierId.value))
const list = computed(() => products.value.filter(item => item.priceListId === priceListId.value))
const selectedSupplier = computed(() => suppliers.value.find(item => item.id === supplierId.value && item.cityId === cityId.value))
const selectedList = computed(() => priceLists.value.find(item => item.id === priceListId.value))
const selectedCity = computed(() => cities.value.find(item => item.id === cityId.value))

watch(selectedSupplier, supplier => {
  supplierName.value = supplier?.name || ""
})

async function load() {
  try {
    const data = await $fetch<AdminData>("/api/admin")
    cities.value = data.cities
    suppliers.value = data.suppliers
    supplierCatalog.value = data.supplierCatalog
    priceLists.value = data.priceLists
    products.value = data.products
    cityId.value ??= data.cities[0]?.id ?? null
  } catch {
    await navigateTo("/login")
  }
}

onMounted(load)

async function post<T = { ok: boolean }>(body: unknown): Promise<T> {
  try {
    const endpoint: string = "/api/admin"
    const response = await $fetch(endpoint, { method: "POST", body: body as Record<string, unknown> })
    return response as T
  } catch (cause: unknown) {
    const data = (cause as { data?: { statusMessage?: string, message?: string } }).data
    throw new Error(data?.statusMessage || data?.message || "Операция не выполнена", { cause })
  }
}

function chooseCity(id: number) { cityId.value = id; supplierId.value = null; priceListId.value = null; supplierSearch.value = ""; catalogSupplierSearch.value = ""; notice.value = "" }
function chooseSupplier(id: number) { supplierId.value = id; priceListId.value = null; notice.value = "" }

async function addCity() {
  if (!newCity.value.trim()) return
  const result = await post<{ city: City }>({ action: "city", name: newCity.value })
  newCity.value = ""; cityId.value = result.city.id; supplierId.value = null; priceListId.value = null
  await load()
}

async function removeCity() {
  if (!cityId.value || !selectedCity.value) return
  const supplierCount = citySuppliers.value.length
  const message = `Удалить город «${selectedCity.value.name}» и всех его поставщиков?\n\nПоставщики, доступные только в этом городе, будут удалены вместе с версиями цен и позициями. Общие поставщики останутся в других городах. Действие нельзя отменить.`
  if (!confirm(message)) return
  try {
    const result = await post<{ ok: boolean, deletedSuppliers: number }>({ action: "delete_city", id: cityId.value })
    cityId.value = null; supplierId.value = null; priceListId.value = null
    notice.value = `Город удалён. Удалено поставщиков: ${result.deletedSuppliers} из ${supplierCount}.`
    await load()
  } catch (error) { notice.value = error instanceof Error ? error.message : "Не удалось удалить город" }
}

async function addSupplier() {
  if (!newSupplier.value.trim() || !cityId.value) return
  const result = await post<{ supplier: Supplier }>({ action: "supplier", name: newSupplier.value, cityId: cityId.value })
  newSupplier.value = ""; supplierId.value = result.supplier.id
  await load()
}

async function attachSupplier(supplier: SupplierCatalogItem) {
  if (!cityId.value || !selectedCity.value) return
  try {
    const result = await post<{ supplier: SupplierCatalogItem }>({ action: "attach_supplier", supplierId: supplier.id, cityId: cityId.value })
    supplierId.value = result.supplier.id
    priceListId.value = null
    catalogSupplierSearch.value = ""
    notice.value = `Поставщик «${result.supplier.name}» добавлен в город «${selectedCity.value.name}»`
    await load()
  } catch (error) { notice.value = error instanceof Error ? error.message : "Не удалось добавить поставщика в город" }
}

async function renameSupplier() {
  if (!selectedSupplier.value || !supplierName.value.trim()) return
  try {
    const result = await post<{ supplier: SupplierCatalogItem }>({ action: "supplier_update", id: selectedSupplier.value.id, name: supplierName.value })
    supplierName.value = result.supplier.name
    notice.value = `Название поставщика изменено на «${result.supplier.name}» во всех городах`
    await load()
  } catch (error) { notice.value = error instanceof Error ? error.message : "Не удалось изменить название поставщика" }
}

async function removeSupplier() {
  if (!supplierId.value || !confirm("Удалить поставщика, все версии цен и позиции? Это действие нельзя отменить.")) return
  await post({ action: "delete_supplier", id: supplierId.value })
  supplierId.value = null; priceListId.value = null; notice.value = "Поставщик удалён"
  await load()
}

async function addPriceList() {
  if (!supplierId.value || !newList.name.trim()) return
  try {
    const result = await post<{ priceList: PriceList }>({ action: "price_list", supplierId: supplierId.value, name: newList.name, validFrom: newList.validFrom || null })
    newList.name = ""; newList.validFrom = ""; priceListId.value = result.priceList.id
    notice.value = "Новая версия цен создана. Теперь загрузите в неё Excel."
    await load()
  } catch (error) { notice.value = error instanceof Error ? error.message : "Не удалось создать прайс-лист" }
}

async function savePriceList(item: PriceList) {
  try {
    await post({ action: "price_list_update", id: item.id, name: item.name, validFrom: item.validFrom, active: item.active })
    notice.value = "Настройки версии сохранены"
    await load()
  } catch (error) { notice.value = error instanceof Error ? error.message : "Не удалось сохранить версию" }
}

async function removePriceList() {
  if (!selectedList.value || !confirm(`Удалить прайс-лист «${selectedList.value.name}» и все его позиции? Это действие нельзя отменить.`)) return
  await post({ action: "delete_price_list", id: selectedList.value.id })
  priceListId.value = null; notice.value = "Версия цен удалена"
  await load()
}

async function saveProduct(product: Product) {
  await post({ action: "product", product })
  notice.value = "Изменения сохранены"
  await load()
}

async function removeProduct(product: Product) {
  if (!confirm(`Удалить позицию «${product.name}»?`)) return
  await post({ action: "delete_product", id: product.id })
  notice.value = "Позиция удалена"
  await load()
}

async function addManual() {
  if (!priceListId.value || !manual.name || !manual.price) return
  await post({ action: "manual", product: { priceListId: priceListId.value, ...manual, weight: manual.weight ? Number(manual.weight) : null, price: Number(manual.price) } })
  Object.assign(manual, { article: "", name: "", weight: "", unit: "г", price: "" })
  await load()
}

async function sheetRows(file: File): Promise<unknown[][]> {
  return await readXlsxFile(file) as unknown[][]
}

async function upload(file: File) {
  if (!priceListId.value) return
  const rows = await sheetRows(file)
  const headerIndex = rows.findIndex(row => Array.isArray(row) && findHeader(row, "название", "наименование") >= 0)
  if (headerIndex < 0) { notice.value = "Не найдена колонка «Название»"; return }
  const headers = rows[headerIndex]!
  const columns = {
    name: findHeader(headers, "название", "наименование"),
    article: findHeader(headers, "артикул"),
    price: findHeader(headers, "цена, р.", "цена", "цена, ₽"),
    weight: findHeader(headers, "граммовка", "граммовка, г", "вес"),
    unit: findHeader(headers, "единица", "ед. изм.", "единица измерения"),
  }
  if (columns.price < 0) { notice.value = "Не найдена колонка «Цена»"; return }
  const parsed = rows.slice(headerIndex + 1).map(row => normalizeImportRow(row, columns)).filter(item => item !== null)
  const result = await post<{ imported: number }>({ action: "import", priceListId: priceListId.value, rows: parsed })
  notice.value = `Загружено позиций: ${result.imported}`
  await load()
}

async function uploadReadySuppliers(file: File) {
  if (!cityId.value) return
  bulkLoading.value = true
  notice.value = "Читаем базу и распределяем позиции по поставщикам…"
  try {
    const rows = await sheetRows(file)
    const headerIndex = rows.findIndex(row => Array.isArray(row) && findHeader(row, "поставщик") >= 0)
    if (headerIndex < 0) throw new Error("Не найдена колонка «Поставщик»")
    const headers = rows[headerIndex]!
    const columns = {
      name: findHeader(headers, "название", "наименование"),
      article: findHeader(headers, "артикул"),
      supplier: findHeader(headers, "поставщик"),
      price: findHeader(headers, "цена, р.", "цена", "цена, ₽"),
      weight: findHeader(headers, "граммовка", "граммовка, г", "вес"),
      unit: findHeader(headers, "единица", "ед. изм.", "единица измерения"),
    }
    if (columns.name < 0 || columns.supplier < 0 || columns.price < 0) throw new Error("Нужны колонки «Название», «Поставщик» и «Цена, р.»")
    const parsed = rows.slice(headerIndex + 1).map(row => normalizeImportRow(row, columns)).filter(item => item?.supplier)
    const result = await post<{ imported: number, suppliers: number }>({ action: "bulk_import", cityId: cityId.value, rows: parsed })
    supplierId.value = null; priceListId.value = null
    notice.value = `Готово: ${result.suppliers} поставщиков, ${result.imported} строк загружено в город`
    await load()
  } catch (error) {
    notice.value = error instanceof Error ? error.message : "Не удалось загрузить готовую базу"
  } finally { bulkLoading.value = false }
}

function fileFrom(event: Event) { return (event.target as HTMLInputElement).files?.[0] }
</script>

<template>
  <main class="admin-shell">
    <header class="admin-header"><NuxtLink to="/" class="admin-logo">ONE <span>PRICE</span></NuxtLink><div><h1>Управление каталогом</h1><p>Города, поставщики, версии цен, позиции и фишки</p></div><NuxtLink to="/">Панель партнёра →</NuxtLink></header>
    <div class="city-admin-bar">
      <div class="admin-city-picker"><label class="admin-city-search"><span>Поиск города</span><input v-model="citySearch" type="search" placeholder="Введите название города"></label><div class="city-tabs"><button v-for="city in filteredCities" :key="city.id" :class="{ active: cityId === city.id }" @click="chooseCity(city.id)">{{ city.name }}</button><p v-if="filteredCities.length === 0" class="city-empty">Город не найден</p></div></div>
      <div class="city-create"><input v-model="newCity" placeholder="Новый город"><button @click="addCity">Добавить город</button><label v-if="cityId" class="bulk-top-button" :class="{ disabled: bulkLoading }">{{ bulkLoading ? "Загрузка…" : "Загрузить поставщиков в город" }}<input :disabled="bulkLoading" type="file" accept=".xlsx,.xls" @change="fileFrom($event) && uploadReadySuppliers(fileFrom($event)!)"></label><button v-if="cityId" class="danger-link" @click="removeCity">Удалить город и поставщиков</button></div>
    </div>
    <section class="admin-grid">
      <aside class="admin-suppliers">
        <h2>Поставщики</h2>
        <label v-if="cityId" class="admin-supplier-search"><span>Поиск в городе</span><input v-model="supplierSearch" type="search" placeholder="Название поставщика"></label>
        <button v-for="supplier in filteredCitySuppliers" :key="supplier.id" :class="{ active: supplierId === supplier.id }" @click="chooseSupplier(supplier.id)">{{ supplier.name }}<span>{{ priceLists.filter(item => item.supplierId === supplier.id).length }} вер.</span></button>
        <p v-if="cityId && !filteredCitySuppliers.length" class="admin-supplier-empty">Поставщики не найдены</p>
        <div v-if="cityId" class="attach-supplier">
          <strong>Добавить из базы</strong>
          <small>Выберите существующего поставщика — его позиции и версии цен сохранятся.</small>
          <input v-model="catalogSupplierSearch" type="search" placeholder="Найти во всей базе">
          <div v-if="availableSuppliers.length" class="catalog-supplier-results"><button v-for="supplier in availableSuppliers" :key="supplier.id" @click="attachSupplier(supplier)"><span>{{ supplier.name }}</span><b>Добавить</b></button></div>
          <p v-else class="admin-supplier-empty">{{ catalogSupplierSearch ? "Совпадений нет" : "Все поставщики уже добавлены" }}</p>
        </div>
        <div v-if="cityId" class="add-supplier"><strong>Создать нового</strong><input v-model="newSupplier" placeholder="Название поставщика"><button @click="addSupplier">Создать и добавить</button></div>
      </aside>
      <section class="admin-content">
        <div class="admin-actions"><div><h2>{{ selectedSupplier?.name || "Выберите поставщика" }}</h2><p>{{ supplierLists.length }} версий цен</p><form v-if="selectedSupplier" class="supplier-name-editor" @submit.prevent="renameSupplier"><label><span>Название поставщика</span><input v-model="supplierName" maxlength="160" required></label><button :disabled="!supplierName.trim() || supplierName.trim() === selectedSupplier.name" type="submit">Сохранить название</button><small>Название изменится во всех городах, позиции и цены сохранятся.</small></form></div><button v-if="selectedSupplier" class="danger-button" @click="removeSupplier">Удалить поставщика</button></div>
        <p v-if="notice" class="notice">{{ notice }}</p>
        <div v-if="selectedSupplier" class="version-admin">
          <div class="version-create"><div><strong>Новая версия цен</strong><small>Можно загрузить будущие цены заранее</small></div><input v-model="newList.name" placeholder="Например, Цены с 27 августа"><label>Действует с<input v-model="newList.validFrom" type="date"></label><button @click="addPriceList">Создать</button></div>
          <div class="price-list-strip"><button v-for="item in supplierLists" :key="item.id" class="price-list-card" :class="{ active: priceListId === item.id }" @click="priceListId = item.id; notice = ''"><b>{{ item.name }}</b><span>{{ item.validFrom ? `С ${new Date(`${item.validFrom}T00:00:00`).toLocaleDateString('ru-RU')}` : "Без даты начала" }} · {{ item.active ? "виден партнёрам" : "скрыт" }}</span></button></div>
        </div>
        <template v-if="selectedList">
          <div class="version-settings"><input v-model="selectedList.name"><label>Действует с<input v-model="selectedList.validFrom" type="date"></label><label class="active-check"><input v-model="selectedList.active" type="checkbox"> Показывать партнёрам</label><button @click="savePriceList(selectedList)">Сохранить версию</button><button class="danger-button" @click="removePriceList">Удалить версию</button></div>
          <div class="admin-actions list-actions"><div><h2>Позиции: {{ selectedList.name }}</h2><p>{{ list.length }} позиций</p></div><label class="upload-button">Загрузить Excel в эту версию<input type="file" accept=".xlsx,.xls" @change="fileFrom($event) && upload(fileFrom($event)!)"></label></div>
          <div class="manual-form"><input v-model="manual.article" placeholder="Артикул"><input v-model="manual.name" class="wide" placeholder="Название позиции"><input v-model="manual.weight" placeholder="Количество"><select v-model="manual.unit"><option value="г">г</option><option value="мл">мл</option></select><input v-model="manual.price" placeholder="Цена"><button @click="addManual">Добавить вручную</button></div>
          <div class="admin-table"><div class="admin-row head"><span>Название</span><span>Количество</span><span>Ед.</span><span>Цена</span><span>Веган</span><span>Хит</span><span>Новинка</span><span>Активна</span><span>Действия</span></div><div v-for="product in list" :key="product.id" class="admin-row"><input v-model="product.name"><input v-model.number="product.weight"><select v-model="product.unit"><option value="г">г</option><option value="мл">мл</option></select><input v-model.number="product.price"><input v-model="product.vegan" type="checkbox"><input v-model="product.hit" type="checkbox"><input v-model="product.isNew" type="checkbox"><input v-model="product.active" type="checkbox"><div class="row-actions"><button @click="saveProduct(product)">Сохранить</button><button class="delete-icon" :aria-label="`Удалить ${product.name}`" @click="removeProduct(product)">×</button></div></div></div>
        </template>
        <div v-if="selectedSupplier && !selectedList" class="empty-state">Выберите существующую версию цен или создайте новую</div>
      </section>
    </section>
  </main>
</template>
