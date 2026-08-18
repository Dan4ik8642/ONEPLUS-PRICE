import { ensureDatabase, getD1 } from "../../../db/runtime";
import { sessionCookie, verifySession } from "../../auth";

async function allowed(request: Request) {
  return (await verifySession(sessionCookie(request))) === "admin";
}

export async function GET(request: Request) {
  if (!(await allowed(request))) return Response.json({ error: "Нет доступа" }, { status: 403 });
  await ensureDatabase();
  const db = getD1();
  const [cities, suppliers, products] = await Promise.all([
    db.prepare("SELECT id,name,active FROM cities ORDER BY name").all(),
    db.prepare("SELECT s.id,s.name,s.active,sc.city_id AS cityId FROM suppliers s JOIN supplier_cities sc ON sc.supplier_id=s.id ORDER BY sc.city_id,s.name").all(),
    db.prepare("SELECT id,supplier_id AS supplierId,article,name,weight,price,vegan,hit,active FROM products ORDER BY supplier_id,name").all(),
  ]);
  return Response.json({ cities: cities.results, suppliers: suppliers.results, products: products.results });
}

export async function POST(request: Request) {
  if (!(await allowed(request))) return Response.json({ error: "Нет доступа" }, { status: 403 });
  await ensureDatabase();
  const db = getD1();
  const body = (await request.json()) as Record<string, unknown>;

  if (body.action === "city") {
    const name = String(body.name || "").trim();
    if (!name) return Response.json({ error: "Укажите город" }, { status: 400 });
    const city = await db.prepare("INSERT INTO cities(name) VALUES(?) ON CONFLICT(name) DO UPDATE SET active=1 RETURNING id,name").bind(name).first();
    return Response.json({ city });
  }
  if (body.action === "supplier") {
    const name = String(body.name || "").trim();
    const cityId = Number(body.cityId);
    if (!name || !cityId) return Response.json({ error: "Укажите город и поставщика" }, { status: 400 });
    const supplier = await db.prepare("INSERT INTO suppliers(name) VALUES(?) ON CONFLICT(name) DO UPDATE SET active=1 RETURNING id,name").bind(name).first<{ id: number; name: string }>();
    await db.prepare("INSERT OR IGNORE INTO supplier_cities(supplier_id,city_id) VALUES(?,?)").bind(supplier!.id, cityId).run();
    return Response.json({ supplier });
  }
  if (body.action === "product") {
    const p = body.product as Record<string, unknown>;
    await db.prepare("UPDATE products SET name=?,weight=?,price=?,vegan=?,hit=?,active=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(String(p.name), p.weight == null ? null : Number(p.weight), Number(p.price), p.vegan ? 1 : 0, p.hit ? 1 : 0, p.active === false ? 0 : 1, Number(p.id)).run();
    return Response.json({ ok: true });
  }
  if (body.action === "manual") {
    const p = body.product as Record<string, unknown>;
    const article = String(p.article || `manual-${crypto.randomUUID()}`);
    await db.prepare("INSERT INTO products(supplier_id,article,name,weight,price,vegan,hit) VALUES(?,?,?,?,?,?,?) ON CONFLICT(supplier_id,article) DO UPDATE SET name=excluded.name,weight=excluded.weight,price=excluded.price,updated_at=CURRENT_TIMESTAMP").bind(Number(p.supplierId), article, String(p.name), p.weight == null ? null : Number(p.weight), Number(p.price), p.vegan ? 1 : 0, p.hit ? 1 : 0).run();
    return Response.json({ ok: true });
  }
  if (body.action === "import") {
    const supplierId = Number(body.supplierId);
    const rows = body.rows as Array<Record<string, unknown>>;
    const statements = rows.filter((row) => row.name && row.price != null).map((row) => db.prepare("INSERT INTO products(supplier_id,article,name,weight,price) VALUES(?,?,?,?,?) ON CONFLICT(supplier_id,article) DO UPDATE SET name=excluded.name,weight=excluded.weight,price=excluded.price,active=1,updated_at=CURRENT_TIMESTAMP").bind(supplierId, String(row.article || `name-${String(row.name).toLowerCase()}`), String(row.name), row.weight == null ? null : Number(row.weight), Number(row.price)));
    for (let index = 0; index < statements.length; index += 80) await db.batch(statements.slice(index, index + 80));
    return Response.json({ ok: true, imported: statements.length });
  }
  if (body.action === "delete_product") {
    await db.prepare("DELETE FROM products WHERE id=?").bind(Number(body.id)).run();
    return Response.json({ ok: true });
  }
  if (body.action === "delete_supplier") {
    await db.prepare("DELETE FROM suppliers WHERE id=?").bind(Number(body.id)).run();
    return Response.json({ ok: true });
  }
  if (body.action === "delete_city") {
    const cityId = Number(body.id);
    const count = await db.prepare("SELECT COUNT(*) AS count FROM supplier_cities WHERE city_id=?").bind(cityId).first<{ count: number }>();
    if (Number(count?.count || 0) > 0) return Response.json({ error: "Сначала удалите поставщиков из этого города" }, { status: 409 });
    await db.prepare("DELETE FROM cities WHERE id=?").bind(cityId).run();
    return Response.json({ ok: true });
  }
  return Response.json({ error: "Неизвестная операция" }, { status: 400 });
}
