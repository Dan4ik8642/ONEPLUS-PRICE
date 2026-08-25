import { createError, defineEventHandler, readBody } from "h3"
import { requireRole } from "../../utils/auth"
import { ensureDatabase } from "../../utils/database"

type Body = Record<string, unknown>
type ProductInput = Record<string, unknown>

function badRequest(message: string, statusCode = 400): never {
  throw createError({ statusCode, statusMessage: message })
}

function cleanRows(value: unknown) {
  if (!Array.isArray(value)) return []
  return value.filter((row): row is ProductInput => Boolean(row && typeof row === "object"))
}

export default defineEventHandler(async (event) => {
  requireRole(event, "admin")
  const sql = await ensureDatabase(event)
  const body = await readBody<Body>(event)

  if (body.action === "city") {
    const name = String(body.name || "").trim()
    if (!name) badRequest("Укажите город")
    const [city] = await sql`INSERT INTO cities(name) VALUES(${name})
      ON CONFLICT(name) DO UPDATE SET active=TRUE RETURNING id::int AS id,name`
    return { city }
  }

  if (body.action === "supplier") {
    const name = String(body.name || "").trim()
    const cityId = Number(body.cityId)
    if (!name || !cityId) badRequest("Укажите город и поставщика")
    const [supplier] = await sql`INSERT INTO suppliers(name) VALUES(${name})
      ON CONFLICT(name) DO UPDATE SET active=TRUE RETURNING id::int AS id,name`
    if (!supplier) badRequest("Не удалось создать поставщика", 500)
    await sql`INSERT INTO supplier_cities(supplier_id,city_id) VALUES(${supplier.id},${cityId}) ON CONFLICT DO NOTHING`
    await sql`INSERT INTO price_lists(supplier_id,name) VALUES(${supplier.id},'Текущие цены') ON CONFLICT DO NOTHING`
    return { supplier }
  }

  if (body.action === "price_list") {
    const supplierId = Number(body.supplierId)
    const name = String(body.name || "").trim()
    const validFrom = body.validFrom ? String(body.validFrom) : null
    if (!supplierId || !name) badRequest("Укажите название прайс-листа")
    try {
      const [priceList] = await sql`INSERT INTO price_lists(supplier_id,name,valid_from)
        VALUES(${supplierId},${name},${validFrom}) RETURNING id::int AS id,supplier_id::int AS "supplierId",name,valid_from::text AS "validFrom",active`
      return { priceList }
    } catch (error: unknown) {
      if ((error as { code?: string }).code === "23505") badRequest("У этого поставщика уже есть прайс-лист с таким названием", 409)
      throw error
    }
  }

  if (body.action === "price_list_update") {
    const id = Number(body.id)
    const name = String(body.name || "").trim()
    const validFrom = body.validFrom ? String(body.validFrom) : null
    if (!id || !name) badRequest("Укажите название прайс-листа")
    try {
      await sql`UPDATE price_lists SET name=${name},valid_from=${validFrom},active=${body.active !== false} WHERE id=${id}`
      return { ok: true }
    } catch (error: unknown) {
      if ((error as { code?: string }).code === "23505") badRequest("У этого поставщика уже есть прайс-лист с таким названием", 409)
      throw error
    }
  }

  if (body.action === "product") {
    const product = (body.product || {}) as ProductInput
    await sql`UPDATE price_list_items SET name=${String(product.name || "")},
      weight=${product.weight == null ? null : Number(product.weight)},price=${Number(product.price)},
      vegan=${Boolean(product.vegan)},hit=${Boolean(product.hit)},active=${product.active !== false},updated_at=CURRENT_TIMESTAMP
      WHERE id=${Number(product.id)}`
    return { ok: true }
  }

  if (body.action === "manual") {
    const product = (body.product || {}) as ProductInput
    const article = String(product.article || `manual-${crypto.randomUUID()}`)
    await sql`INSERT INTO price_list_items(price_list_id,article,name,weight,price,vegan,hit)
      VALUES(${Number(product.priceListId)},${article},${String(product.name || "")},${product.weight == null ? null : Number(product.weight)},${Number(product.price)},${Boolean(product.vegan)},${Boolean(product.hit)})
      ON CONFLICT(price_list_id,article) DO UPDATE SET name=EXCLUDED.name,weight=EXCLUDED.weight,price=EXCLUDED.price,
      vegan=EXCLUDED.vegan,hit=EXCLUDED.hit,active=TRUE,updated_at=CURRENT_TIMESTAMP`
    return { ok: true }
  }

  if (body.action === "import") {
    const priceListId = Number(body.priceListId)
    const rows = cleanRows(body.rows).filter((row) => row.name && row.price != null)
    if (!priceListId) badRequest("Выберите прайс-лист")
    if (rows.length > 15_000) badRequest("За один раз можно загрузить не более 15 000 строк")
    await sql.begin(async (tx) => {
      for (let offset = 0; offset < rows.length; offset += 2_000) {
        const items = rows.slice(offset, offset + 2_000).map((row) => ({
          price_list_id: priceListId,
          article: String(row.article || `name-${String(row.name).toLowerCase()}`),
          name: String(row.name),
          weight: row.weight == null ? null : Number(row.weight),
          price: Number(row.price),
        }))
        await tx`INSERT INTO price_list_items ${tx(items, "price_list_id", "article", "name", "weight", "price")}
          ON CONFLICT(price_list_id,article) DO UPDATE SET name=EXCLUDED.name,weight=EXCLUDED.weight,
          price=EXCLUDED.price,active=TRUE,updated_at=CURRENT_TIMESTAMP`
      }
    })
    return { ok: true, imported: rows.length }
  }

  if (body.action === "bulk_import") {
    const cityId = Number(body.cityId)
    const rows = cleanRows(body.rows)
    if (!cityId) badRequest("Выберите город для поставщиков")
    if (!rows.length) badRequest("В таблице нет позиций")
    if (rows.length > 15_000) badRequest("За один раз можно загрузить не более 15 000 строк")
    const grouped = new Map<string, ProductInput[]>()
    for (const row of rows) {
      const supplier = String(row.supplier || "").trim()
      if (!supplier || !row.name || row.price == null) continue
      grouped.set(supplier, [...(grouped.get(supplier) || []), row])
    }
    if (!grouped.size) badRequest("Не найдены колонки «Поставщик», «Название» и «Цена»")
    let imported = 0
    await sql.begin(async (tx) => {
      for (const [supplierName, supplierRows] of grouped) {
        const [supplier] = await tx`INSERT INTO suppliers(name) VALUES(${supplierName})
          ON CONFLICT(name) DO UPDATE SET active=TRUE RETURNING id::int AS id`
        if (!supplier) badRequest("Не удалось создать поставщика", 500)
        await tx`INSERT INTO supplier_cities(supplier_id,city_id) VALUES(${supplier.id},${cityId}) ON CONFLICT DO NOTHING`
        await tx`INSERT INTO price_lists(supplier_id,name) VALUES(${supplier.id},'Текущие цены') ON CONFLICT DO NOTHING`
        const [priceList] = await tx`SELECT id::int AS id FROM price_lists WHERE supplier_id=${supplier.id} AND name='Текущие цены'`
        if (!priceList) badRequest("Не удалось создать прайс-лист", 500)
        for (let offset = 0; offset < supplierRows.length; offset += 2_000) {
          const items = supplierRows.slice(offset, offset + 2_000).map((row) => ({
            price_list_id: priceList.id,
            article: String(row.article || `name-${String(row.name).toLowerCase()}`),
            name: String(row.name),
            weight: row.weight == null ? null : Number(row.weight),
            price: Number(row.price),
          }))
          await tx`INSERT INTO price_list_items ${tx(items, "price_list_id", "article", "name", "weight", "price")}
            ON CONFLICT(price_list_id,article) DO UPDATE SET name=EXCLUDED.name,weight=EXCLUDED.weight,
            price=EXCLUDED.price,active=TRUE,updated_at=CURRENT_TIMESTAMP`
          imported += items.length
        }
      }
    })
    return { ok: true, imported, suppliers: grouped.size }
  }

  if (body.action === "delete_product") {
    await sql`DELETE FROM price_list_items WHERE id=${Number(body.id)}`
    return { ok: true }
  }
  if (body.action === "delete_price_list") {
    await sql`DELETE FROM price_lists WHERE id=${Number(body.id)}`
    return { ok: true }
  }
  if (body.action === "delete_supplier") {
    await sql`DELETE FROM suppliers WHERE id=${Number(body.id)}`
    return { ok: true }
  }
  if (body.action === "delete_city") {
    const cityId = Number(body.id)
    const [result] = await sql`SELECT COUNT(*)::int AS count FROM supplier_cities WHERE city_id=${cityId}`
    if (!result) badRequest("Не удалось проверить город", 500)
    if (Number(result.count) > 0) badRequest("Сначала удалите поставщиков из этого города", 409)
    await sql`DELETE FROM cities WHERE id=${cityId}`
    return { ok: true }
  }
  badRequest("Неизвестная операция")
})
