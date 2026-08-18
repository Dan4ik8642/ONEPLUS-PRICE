import { ensureDatabase, getD1 } from "../../../db/runtime";
import { sessionCookie, verifySession } from "../../auth";

export async function GET(request: Request) {
  const role = await verifySession(sessionCookie(request));
  if (!role) return Response.json({ error: "Требуется вход" }, { status: 401 });
  await ensureDatabase();
  const db = getD1();
  const [cities, suppliers, products] = await Promise.all([
    db.prepare("SELECT id,name FROM cities WHERE active=1 ORDER BY name").all(),
    db.prepare("SELECT s.id,s.name,sc.city_id AS cityId FROM suppliers s JOIN supplier_cities sc ON sc.supplier_id=s.id JOIN cities c ON c.id=sc.city_id WHERE s.active=1 AND c.active=1 ORDER BY c.name,s.name").all(),
    db.prepare("SELECT id,supplier_id AS supplierId,article,name,weight,price,vegan,hit FROM products WHERE active=1 ORDER BY name").all(),
  ]);
  return Response.json({ cities: cities.results, suppliers: suppliers.results, products: products.results, role });
}
