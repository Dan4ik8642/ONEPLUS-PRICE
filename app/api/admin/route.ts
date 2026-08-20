import { ensureDatabase, getD1 } from "../../../db/runtime";
import { sessionCookie, verifySession } from "../../auth";

async function allowed(request: Request) {
  return (await verifySession(sessionCookie(request))) === "admin";
}

export async function GET(request: Request) {
  if (!(await allowed(request))) return Response.json({ error: "Нет доступа" }, { status: 403 });
  await ensureDatabase();
  const db = getD1();
  const [cities, suppliers, priceLists, products] = await Promise.all([
    db.prepare("SELECT id,name,active FROM cities ORDER BY name").all(),
    db.prepare("SELECT s.id,s.name,s.active,sc.city_id AS cityId FROM suppliers s JOIN supplier_cities sc ON sc.supplier_id=s.id ORDER BY sc.city_id,s.name").all(),
    db.prepare("SELECT id,supplier_id AS supplierId,name,valid_from AS validFrom,active,created_at AS createdAt FROM price_lists ORDER BY supplier_id,valid_from,name").all(),
    db.prepare("SELECT id,price_list_id AS priceListId,article,name,weight,price,vegan,hit,active FROM price_list_items ORDER BY price_list_id,name").all(),
  ]);
  return Response.json({ cities: cities.results, suppliers: suppliers.results, priceLists: priceLists.results, products: products.results });
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
    await db.prepare("INSERT OR IGNORE INTO price_lists(supplier_id,name) VALUES(?,'Текущие цены')").bind(supplier!.id).run();
    return Response.json({ supplier });
  }
  if (body.action === "price_list") {
    const supplierId = Number(body.supplierId);
    const name = String(body.name || "").trim();
    const validFrom = body.validFrom ? String(body.validFrom) : null;
    if (!supplierId || !name) return Response.json({ error: "Укажите название прайс-листа" }, { status: 400 });
    try {
      const priceList = await db.prepare("INSERT INTO price_lists(supplier_id,name,valid_from) VALUES(?,?,?) RETURNING id,supplier_id AS supplierId,name,valid_from AS validFrom,active").bind(supplierId, name, validFrom).first();
      return Response.json({ priceList });
    } catch {
      return Response.json({ error: "У этого поставщика уже есть прайс-лист с таким названием" }, { status: 409 });
    }
  }
  if (body.action === "price_list_update") {
    const id = Number(body.id);
    const name = String(body.name || "").trim();
    const validFrom = body.validFrom ? String(body.validFrom) : null;
    if (!id || !name) return Response.json({ error: "Укажите название прайс-листа" }, { status: 400 });
    try {
      await db.prepare("UPDATE price_lists SET name=?,valid_from=?,active=? WHERE id=?").bind(name, validFrom, body.active === false ? 0 : 1, id).run();
      return Response.json({ ok: true });
    } catch {
      return Response.json({ error: "У этого поставщика уже есть прайс-лист с таким названием" }, { status: 409 });
    }
  }
  if (body.action === "product") {
    const p = body.product as Record<string, unknown>;
    await db.prepare("UPDATE price_list_items SET name=?,weight=?,price=?,vegan=?,hit=?,active=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(String(p.name), p.weight == null ? null : Number(p.weight), Number(p.price), p.vegan ? 1 : 0, p.hit ? 1 : 0, p.active === false ? 0 : 1, Number(p.id)).run();
    return Response.json({ ok: true });
  }
  if (body.action === "manual") {
    const p = body.product as Record<string, unknown>;
    const article = String(p.article || `manual-${crypto.randomUUID()}`);
    await db.prepare("INSERT INTO price_list_items(price_list_id,article,name,weight,price,vegan,hit) VALUES(?,?,?,?,?,?,?) ON CONFLICT(price_list_id,article) DO UPDATE SET name=excluded.name,weight=excluded.weight,price=excluded.price,vegan=excluded.vegan,hit=excluded.hit,active=1,updated_at=CURRENT_TIMESTAMP").bind(Number(p.priceListId), article, String(p.name), p.weight == null ? null : Number(p.weight), Number(p.price), p.vegan ? 1 : 0, p.hit ? 1 : 0).run();
    return Response.json({ ok: true });
  }
  if (body.action === "import") {
    const priceListId = Number(body.priceListId);
    const rows = body.rows as Array<Record<string, unknown>>;
    if (!priceListId) return Response.json({ error: "Выберите прайс-лист" }, { status: 400 });
    const statements = rows.filter((row) => row.name && row.price != null).map((row) => db.prepare("INSERT INTO price_list_items(price_list_id,article,name,weight,price) VALUES(?,?,?,?,?) ON CONFLICT(price_list_id,article) DO UPDATE SET name=excluded.name,weight=excluded.weight,price=excluded.price,active=1,updated_at=CURRENT_TIMESTAMP").bind(priceListId, String(row.article || `name-${String(row.name).toLowerCase()}`), String(row.name), row.weight == null ? null : Number(row.weight), Number(row.price)));
    for (let index = 0; index < statements.length; index += 80) await db.batch(statements.slice(index, index + 80));
    return Response.json({ ok: true, imported: statements.length });
  }
  if (body.action === "bulk_import") {
    const cityId = Number(body.cityId);
    const rows = body.rows as Array<Record<string, unknown>>;
    if (!cityId) return Response.json({ error: "Выберите город для поставщиков" }, { status: 400 });
    if (!Array.isArray(rows) || rows.length === 0) return Response.json({ error: "В таблице нет позиций" }, { status: 400 });
    if (rows.length > 15000) return Response.json({ error: "За один раз можно загрузить не более 15 000 строк" }, { status: 400 });

    const grouped = new Map<string, Array<Record<string, unknown>>>();
    for (const row of rows) {
      const supplier = String(row.supplier || "").trim();
      if (!supplier || !row.name || row.price == null) continue;
      const group = grouped.get(supplier) || [];
      group.push(row);
      grouped.set(supplier, group);
    }
    if (grouped.size === 0) return Response.json({ error: "Не найдены колонки «Поставщик», «Название» и «Цена»" }, { status: 400 });

    let imported = 0;
    for (const [supplierName, supplierRows] of grouped) {
      const supplier = await db.prepare("INSERT INTO suppliers(name) VALUES(?) ON CONFLICT(name) DO UPDATE SET active=1 RETURNING id").bind(supplierName).first<{ id: number }>();
      const supplierId = Number(supplier!.id);
      await db.prepare("INSERT OR IGNORE INTO supplier_cities(supplier_id,city_id) VALUES(?,?)").bind(supplierId, cityId).run();
      await db.prepare("INSERT OR IGNORE INTO price_lists(supplier_id,name) VALUES(?,'Текущие цены')").bind(supplierId).run();
      const priceList = await db.prepare("SELECT id FROM price_lists WHERE supplier_id=? AND name='Текущие цены'").bind(supplierId).first<{ id: number }>();
      const statements = supplierRows.map((row) => db.prepare("INSERT INTO price_list_items(price_list_id,article,name,weight,price) VALUES(?,?,?,?,?) ON CONFLICT(price_list_id,article) DO UPDATE SET name=excluded.name,weight=excluded.weight,price=excluded.price,active=1,updated_at=CURRENT_TIMESTAMP").bind(
        Number(priceList!.id),
        String(row.article || `name-${String(row.name).toLowerCase()}`),
        String(row.name),
        row.weight == null ? null : Number(row.weight),
        Number(row.price),
      ));
      for (let index = 0; index < statements.length; index += 80) await db.batch(statements.slice(index, index + 80));
      imported += statements.length;
    }
    return Response.json({ ok: true, imported, suppliers: grouped.size });
  }
  if (body.action === "delete_product") {
    await db.prepare("DELETE FROM price_list_items WHERE id=?").bind(Number(body.id)).run();
    return Response.json({ ok: true });
  }
  if (body.action === "delete_price_list") {
    await db.prepare("DELETE FROM price_lists WHERE id=?").bind(Number(body.id)).run();
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
