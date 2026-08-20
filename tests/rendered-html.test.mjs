import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const fromProject = (path) => new URL(`../${path}`, import.meta.url);

test("partner catalog includes the selection and PDF workflow", async () => {
  const source = await readFile(fromProject("app/catalog-client.tsx"), "utf8");
  assert.match(source, /\/api\/catalog/);
  assert.match(source, /18 ценников на листе/);
  assert.match(source, /Сформировать PDF/);
  assert.match(source, /Прайс-лист/);
  assert.match(source, /БУДУЩИЕ ЦЕНЫ/);
  assert.match(source, /priceListId/);
  assert.match(source, /FiraSansExtraCondensed-ExtraBold\.ttf/);
  assert.match(source, /priceSize=34/);
  assert.match(source, /const clover=/);
  assert.match(source, /x\+TW-38/);
  assert.match(source, /let size=18/);
  assert.match(source, /lineHeight=size\*\.96/);
  assert.match(source, /nameWidth=hasBadge\?108:148/);
  assert.match(source, /widthOfTextAtSize\(line,size\)>nameWidth/);
});

test("admin supports suppliers, Excel import and price-tag attributes", async () => {
  const source = await readFile(fromProject("app/admin/admin-client.tsx"), "utf8");
  assert.match(source, /Загрузить Excel/);
  assert.match(source, /Новый поставщик/);
  assert.match(source, /Новый город/);
  assert.match(source, /Новая версия цен/);
  assert.match(source, /Действует с/);
  assert.match(source, /delete_price_list/);
  assert.match(source, /Загрузить поставщиков в город/);
  assert.match(source, /bulk_import/);
  assert.match(source, /delete_product/);
  assert.match(source, /Веган/);
  assert.match(source, /Хит/);
});

test("bulk import groups ready supplier rows without removing manual workflows", async () => {
  const source = await readFile(fromProject("app/api/admin/route.ts"), "utf8");
  assert.match(source, /body\.action === "bulk_import"/);
  assert.match(source, /supplier_cities/);
  assert.match(source, /Текущие цены/);
  assert.match(source, /ON CONFLICT\(price_list_id,article\)/);
  assert.match(source, /body\.action === "manual"/);
  assert.match(source, /body\.action === "product"/);
});

test("hosting has a database binding and the schema migrations exist", async () => {
  const [hosting, migration, cityMigration, priceListMigration] = await Promise.all([
    readFile(fromProject(".openai/hosting.json"), "utf8"),
    readFile(fromProject("drizzle/0000_one_price.sql"), "utf8"),
    readFile(fromProject("drizzle/0001_cities.sql"), "utf8"),
    readFile(fromProject("drizzle/0002_price_lists.sql"), "utf8"),
  ]);
  assert.equal(JSON.parse(hosting).d1, "DB");
  assert.match(migration, /CREATE TABLE `suppliers`/);
  assert.match(migration, /CREATE TABLE `products`/);
  assert.match(cityMigration, /CREATE TABLE IF NOT EXISTS `cities`/);
  assert.match(priceListMigration, /CREATE TABLE IF NOT EXISTS `price_lists`/);
  assert.match(priceListMigration, /CREATE TABLE IF NOT EXISTS `price_list_items`/);
});
