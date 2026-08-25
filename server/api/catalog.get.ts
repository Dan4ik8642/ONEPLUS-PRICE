import { defineEventHandler } from "h3"
import { requireRole } from "../utils/auth"
import { ensureDatabase } from "../utils/database"

export default defineEventHandler(async (event) => {
  const role = requireRole(event)
  const sql = await ensureDatabase(event)
  const [cities, suppliers, priceLists, products] = await Promise.all([
    sql`SELECT id::int AS id,name FROM cities WHERE active=TRUE ORDER BY name`,
    sql`SELECT s.id::int AS id,s.name,sc.city_id::int AS "cityId"
        FROM suppliers s JOIN supplier_cities sc ON sc.supplier_id=s.id
        JOIN cities c ON c.id=sc.city_id
        WHERE s.active=TRUE AND c.active=TRUE ORDER BY c.name,s.name`,
    sql`SELECT id::int AS id,supplier_id::int AS "supplierId",name,valid_from::text AS "validFrom"
        FROM price_lists WHERE active=TRUE
        ORDER BY supplier_id,CASE WHEN valid_from IS NULL THEN 0 ELSE 1 END,valid_from,name`,
    sql`SELECT pli.id::int AS id,pli.price_list_id::int AS "priceListId",pli.article,pli.name,
        pli.weight,pli.price,pli.vegan,pli.hit FROM price_list_items pli
        JOIN price_lists pl ON pl.id=pli.price_list_id
        WHERE pli.active=TRUE AND pl.active=TRUE ORDER BY pli.name`,
  ])
  return { cities, suppliers, priceLists, products, role }
})
