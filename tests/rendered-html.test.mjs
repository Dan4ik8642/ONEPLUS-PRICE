import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const fromProject = (path) => new URL(`../${path}`, import.meta.url);

test("partner catalog includes the selection and PDF workflow", async () => {
  const source = await readFile(fromProject("app/catalog-client.tsx"), "utf8");
  assert.match(source, /\/api\/catalog/);
  assert.match(source, /18 ценников на листе/);
  assert.match(source, /Сформировать PDF/);
  assert.match(source, /Сначала выберите город/);
  assert.match(source, /FiraSansExtraCondensed-ExtraBold\.ttf/);
  assert.match(source, /priceSize=34/);
  assert.match(source, /const clover=/);
});

test("admin supports suppliers, Excel import and price-tag attributes", async () => {
  const source = await readFile(fromProject("app/admin/admin-client.tsx"), "utf8");
  assert.match(source, /Загрузить Excel/);
  assert.match(source, /Новый поставщик/);
  assert.match(source, /Новый город/);
  assert.match(source, /delete_product/);
  assert.match(source, /Веган/);
  assert.match(source, /Хит/);
});

test("hosting has a database binding and the schema migration exists", async () => {
  const [hosting, migration, cityMigration] = await Promise.all([
    readFile(fromProject(".openai/hosting.json"), "utf8"),
    readFile(fromProject("drizzle/0000_one_price.sql"), "utf8"),
    readFile(fromProject("drizzle/0001_cities.sql"), "utf8"),
  ]);
  assert.equal(JSON.parse(hosting).d1, "DB");
  assert.match(migration, /CREATE TABLE `suppliers`/);
  assert.match(migration, /CREATE TABLE `products`/);
  assert.match(cityMigration, /CREATE TABLE IF NOT EXISTS `cities`/);
});
