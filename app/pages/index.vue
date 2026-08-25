<script setup lang="ts">
type Role = "partner" | "admin"
type City = { id: number, name: string }
type Supplier = { id: number, name: string, cityId: number }
type PriceList = { id: number, supplierId: number, name: string, validFrom: string | null }
type Product = { id: number, priceListId: number, article: string, name: string, weight: number | null, price: number, vegan: boolean, hit: boolean }
type CatalogResponse = { cities: City[], suppliers: Supplier[], priceLists: PriceList[], products: Product[], role: Role }

const cities = ref<City[]>([])
const suppliers = ref<Supplier[]>([])
const priceLists = ref<PriceList[]>([])
const products = ref<Product[]>([])
const cityId = ref<number | null>(null)
const supplierId = ref<number | null>(null)
const priceListId = ref<number | null>(null)
const selected = ref<number[]>([])
const query = ref("")
const loading = ref(true)
const role = ref<Role>("partner")
const today = new Date().toISOString().slice(0, 10)

const citySuppliers = computed(() => suppliers.value.filter(item => item.cityId === cityId.value))
const supplierLists = computed(() => priceLists.value.filter(item => item.supplierId === supplierId.value))
const visible = computed(() => products.value.filter(item => item.priceListId === priceListId.value && `${item.name} ${item.article}`.toLowerCase().includes(query.value.toLowerCase())))
const chosen = computed(() => products.value.filter(item => selected.value.includes(item.id)))

onMounted(async () => {
  try {
    const data = await $fetch<CatalogResponse>("/api/catalog")
    cities.value = data.cities
    suppliers.value = data.suppliers
    priceLists.value = data.priceLists
    products.value = data.products
    role.value = data.role
    cityId.value = data.cities[0]?.id ?? null
  } catch {
    await navigateTo("/login")
  } finally {
    loading.value = false
  }
})

function chooseCity(id: number) {
  cityId.value = id
  supplierId.value = null
  priceListId.value = null
  selected.value = []
}

function chooseSupplier(id: number) {
  supplierId.value = id
  priceListId.value = null
  selected.value = []
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${value}T00:00:00`))
}

async function logout() {
  await $fetch("/api/auth/logout", { method: "POST" })
  await navigateTo("/login")
}

async function createPdf() {
  const [{ PDFDocument, degrees, rgb }, fontkitModule] = await Promise.all([import("pdf-lib"), import("@pdf-lib/fontkit")])
  const pdf = await PDFDocument.create()
  pdf.registerFontkit(fontkitModule.default)
  const font = await pdf.embedFont(await fetch("/FiraSansExtraCondensed-ExtraBold.ttf").then(response => response.arrayBuffer()))
  const pageWidth = 595.28
  const pageHeight = 841.89
  const tagWidth = 170.08
  const tagHeight = 113.39
  const offsetX = (pageWidth - tagWidth * 3) / 2
  const offsetY = (pageHeight - tagHeight * 6) / 2
  const cream = rgb(254 / 255, 248 / 255, 214 / 255)
  const green = rgb(36 / 255, 121 / 255, 36 / 255)
  const orange = rgb(1, 126 / 255, 46 / 255)
  const white = rgb(1, 1, 1)

  function wrapLines(text: string, max: number, size: number) {
    const words = text.toUpperCase().split(/\s+/)
    const output: string[] = []
    let line = ""
    for (let word of words) {
      if (line && font.widthOfTextAtSize(`${line} ${word}`, size) > max) { output.push(line); line = "" }
      while (font.widthOfTextAtSize(word, size) > max && word.length > 1) {
        let cut = word.length - 1
        while (cut > 1 && font.widthOfTextAtSize(word.slice(0, cut), size) > max) cut -= 1
        output.push(word.slice(0, cut))
        word = word.slice(cut)
      }
      const next = line ? `${line} ${word}` : word
      if (font.widthOfTextAtSize(next, size) <= max) line = next
      else { if (line) output.push(line); line = word }
    }
    if (line) output.push(line)
    return output
  }

  for (let index = 0; index < chosen.value.length; index += 1) {
    if (index % 18 === 0) pdf.addPage([pageWidth, pageHeight])
    const page = pdf.getPages().at(-1)!
    const local = index % 18
    const column = local % 3
    const row = Math.floor(local / 3)
    const x = offsetX + column * tagWidth
    const y = offsetY + (5 - row) * tagHeight
    const product = chosen.value[index]!
    page.drawRectangle({ x, y, width: tagWidth, height: tagHeight, color: cream, borderColor: rgb(.72, .72, .72), borderWidth: .3 })
    const hasBadge = product.vegan || product.hit
    const nameWidth = hasBadge ? 108 : 148
    let size = 18
    let wrapped = wrapLines(product.name, nameWidth, size)
    while ((wrapped.length > 3 || wrapped.some(line => font.widthOfTextAtSize(line, size) > nameWidth)) && size > 9.5) {
      size -= .5
      wrapped = wrapLines(product.name, nameWidth, size)
    }
    const lineHeight = size * .96
    wrapped.slice(0, 3).forEach((line, lineIndex) => page.drawText(line, { x: x + 12, y: y + tagHeight - 27 - lineIndex * lineHeight, size, font, color: green }))
    const price = `${product.price} ₽`
    const priceSize = 34
    page.drawText(price, { x: x + 11, y: y + 10, size: priceSize, font, color: green })
    const priceWidth = font.widthOfTextAtSize(price, priceSize)
    if (product.weight) {
      page.drawText("/", { x: x + 15 + priceWidth, y: y + 8, size: 30, font, color: green, rotate: degrees(-10) })
      page.drawText(`${product.weight} Г`, { x: x + 31 + priceWidth, y: y + 11, size: 17, font, color: green })
    }
    const clover = "M 10 2 C 10 -4 15 -8 21 -8 C 27 -8 32 -4 32 2 C 38 2 42 7 42 13 C 42 19 38 24 32 24 C 32 30 27 34 21 34 C 15 34 10 30 10 24 C 4 24 0 19 0 13 C 0 7 4 2 10 2 Z"
    const badge = (label: string, top: number, fill: ReturnType<typeof rgb>, textColor: ReturnType<typeof rgb>, outlined = false) => {
      const badgeX = x + tagWidth - 38
      page.drawSvgPath(clover, { x: badgeX, y: top, scale: .72, color: fill, borderColor: outlined ? green : fill, borderWidth: outlined ? 1.15 : 0 })
      const labelSize = label === "ВЕГАН" ? 6.6 : 7.2
      page.drawText(label, { x: badgeX + 15.1 - font.widthOfTextAtSize(label, labelSize) / 2, y: top - 12.3, size: labelSize, font, color: textColor })
    }
    if (product.vegan) badge("ВЕГАН", y + tagHeight - 19, cream, green, true)
    if (product.hit) badge("ХИТ", y + tagHeight - (product.vegan ? 55 : 19), orange, white)
  }
  const bytes = await pdf.save()
  const blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" })
  const anchor = document.createElement("a")
  anchor.href = URL.createObjectURL(blob)
  anchor.download = `Ценники_${cities.value.find(item => item.id === cityId.value)?.name || "Город"}_${suppliers.value.find(item => item.id === supplierId.value)?.name || "OnePrice"}_${priceLists.value.find(item => item.id === priceListId.value)?.name || "Прайс"}.pdf`
  anchor.click()
  URL.revokeObjectURL(anchor.href)
}
</script>

<template>
  <main class="app-shell">
    <aside class="sidebar">
      <div class="brand-mark">ONE<br><span>PRICE</span></div>
      <nav><a class="nav-item active">Каталог ценников</a><NuxtLink v-if="role === 'admin'" class="nav-item" to="/admin">Админ-панель</NuxtLink></nav>
      <div class="sidebar-footer"><span class="status-dot" /> {{ role === "admin" ? "Администратор" : "Партнёр One Price" }}<button @click="logout">Выйти</button></div>
    </aside>
    <section class="workspace">
      <header class="topbar"><div><p class="eyebrow">ONE PRICE COFFEE · ЦЕННИКИ</p><h1>Соберите набор для печати</h1><p class="subtitle">Сначала выберите город, поставщика, версию цен и нужные позиции.</p></div><div class="selection-counter"><strong>{{ selected.length }}</strong><span>выбрано</span></div></header>
      <div class="step-label"><b>1</b><span>Город</span></div>
      <div class="city-strip"><button v-for="city in cities" :key="city.id" :class="{ active: cityId === city.id }" @click="chooseCity(city.id)">{{ city.name }}</button></div>
      <div class="step-label"><b>2</b><span>Поставщик</span></div>
      <div class="supplier-strip"><button v-for="supplier in citySuppliers" :key="supplier.id" class="supplier" :class="{ active: supplierId === supplier.id }" @click="chooseSupplier(supplier.id)"><span>{{ priceLists.filter(item => item.supplierId === supplier.id).length }} версий</span>{{ supplier.name }}</button></div>
      <template v-if="supplierId">
        <div class="step-label"><b>3</b><span>Прайс-лист</span></div>
        <div class="price-list-strip partner-versions"><button v-for="item in supplierLists" :key="item.id" class="price-list-card" :class="{ active: priceListId === item.id }" @click="priceListId = item.id; selected = []"><b>{{ item.name }}</b><span>{{ item.validFrom ? `Действует с ${formatDate(item.validFrom)}` : "Текущая версия" }}</span><i v-if="item.validFrom && item.validFrom > today">БУДУЩИЕ ЦЕНЫ</i></button></div>
      </template>
      <div class="toolbar"><label class="search-field"><span>Поиск</span><input v-model="query" placeholder="Название или артикул"></label><button class="outline-button" @click="selected = visible.map(item => item.id)">Выбрать все</button><button class="outline-button" @click="selected = []">Сбросить</button></div>
      <div class="catalog-card">
        <div class="table-head"><span>Позиция</span><span>Граммовка</span><span>Цена</span><span>Фишки</span><span>Выбор</span></div>
        <div v-if="loading" class="empty-state">Загружаем каталог…</div><div v-else-if="!supplierId" class="empty-state">Выберите поставщика</div><div v-else-if="!priceListId" class="empty-state">Выберите прайс-лист</div><div v-else-if="visible.length === 0" class="empty-state">В этой версии пока нет позиций</div>
        <label v-for="product in visible" v-else :key="product.id" class="product-row" :class="{ selected: selected.includes(product.id) }"><span class="product-name">{{ product.name }}<small>Арт. {{ product.article }}</small></span><span>{{ product.weight ? `${product.weight} г` : "—" }}</span><strong>{{ product.price }} ₽</strong><span class="badges"><i v-if="product.vegan" class="vegan">ВЕГАН</i><i v-if="product.hit" class="hit">ХИТ</i><template v-if="!product.vegan && !product.hit">—</template></span><input v-model="selected" type="checkbox" :value="product.id"></label>
      </div>
      <div class="action-bar"><div><strong>{{ selected.length }} позиций</strong><span>PDF · A4 · 18 ценников на листе</span></div><button :disabled="!selected.length" @click="createPdf">Сформировать PDF</button></div>
    </section>
  </main>
</template>
