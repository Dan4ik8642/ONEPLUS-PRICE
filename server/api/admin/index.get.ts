import { defineEventHandler } from "h3"
import { requireRole } from "../../utils/auth"
import { ensureDatabase } from "../../utils/database"

export default defineEventHandler(async (event) => {
  requireRole(event, "admin")
  const sql = await ensureDatabase(event)
  const [cities, suppliers, priceLists, products] = await Promise.all([
    sql`SELECT id::int AS id,name,active FROM cities ORDER BY name`,
    sql`SELECT s.id::int AS id,s.name,s.active,sc.city_id::int AS "cityId"
        FROM suppliers s JOIN supplier_cities sc ON sc.supplier_id=s.id ORDER BY sc.city_id,s.name`,
    sql`SELECT id::int AS id,supplier_id::int AS "supplierId",name,valid_from::text AS "validFrom",
        active,created_at::text AS "createdAt" FROM price_lists ORDER BY supplier_id,valid_from,name`,
    sql`SELECT id::int AS id,price_list_id::int AS "priceListId",article,name,weight,price,vegan,hit,active
        FROM price_list_items ORDER BY price_list_id,name`,
  ])
  return { cities, suppliers, priceLists, products }
})
