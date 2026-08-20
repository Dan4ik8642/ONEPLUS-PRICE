import { ensureDatabase, getD1 } from "../../../db/runtime";
import { sessionCookie, verifySession } from "../../auth";

export async function GET(request: Request) {
  const role = await verifySession(sessionCookie(request));
  if (!role) return Response.json({ error: "Требуется вход" }, { status: 401 });
  await ensureDatabase();
  const db = getD1();
  const [cities, suppliers, priceLists, products] = await Promise.all([
    db.prepare("SELECT id,name FROM cities WHERE active=1 ORDER BY name").all(),
    db.prepare("SELECT s.id,s.name,sc.city_id AS cityId FROM suppliers s JOIN supplier_cities sc ON sc.supplier_id=s.id JOIN cities c ON c.id=sc.city_id WHERE s.active=1 AND c.active=1 ORDER BY c.name,s.name").all(),
    db.prepare("SELECT id,supplier_id AS supplierId,name,valid_from AS validFrom FROM price_lists WHERE active=1 ORDER BY supplier_id,CASE WHEN valid_from IS NULL THEN 0 ELSE 1 END,valid_from,name").all(),
    db.prepare("SELECT pli.id,pli.price_list_id AS priceListId,pli.article,pli.name,pli.weight,pli.price,pli.vegan,pli.hit FROM price_list_items pli JOIN price_lists pl ON pl.id=pli.price_list_id WHERE pli.active=1 AND pl.active=1 ORDER BY pli.name").all(),
  ]);
  return Response.json({ cities: cities.results, suppliers: suppliers.results, priceLists: priceLists.results, products: products.results, role });
}
