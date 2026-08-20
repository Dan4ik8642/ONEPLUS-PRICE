import fs from "node:fs/promises";
import * as XLSX from "xlsx";

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:3000";
const adminLogin = process.env.ADMIN_LOGIN || "admin";
const adminPassword = process.env.ADMIN_PASSWORD || "admin-demo";
const cityName = process.env.SEED_CITY || "Москва";
const filePath = process.env.SEED_FILE || "data/production/Готовая база с ценами.xlsx";

const login = await fetch(`${baseUrl}/api/auth/login`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ role: "admin", login: adminLogin, password: adminPassword }),
});
if (!login.ok) throw new Error("Не удалось войти в админку для загрузки боевой базы");
const cookie = login.headers.get("set-cookie")?.split(";")[0];
if (!cookie) throw new Error("Сервер не вернул административную сессию");
const headers = { "content-type": "application/json", cookie };

let adminData = await fetch(`${baseUrl}/api/admin`, { headers }).then((response) => response.json());
let city = adminData.cities.find((item) => item.name === cityName);
if (!city) {
  const created = await fetch(`${baseUrl}/api/admin`, {
    method: "POST", headers, body: JSON.stringify({ action: "city", name: cityName }),
  }).then((response) => response.json());
  city = created.city;
}

const workbook = XLSX.read(await fs.readFile(filePath));
const source = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: null });
const rows = source.map((row) => ({
  article: String(row["Артикул"] || ""),
  name: String(row["Название"] || row["Наименование"] || "").trim().toUpperCase(),
  supplier: String(row["Поставщик"] || "").trim(),
  price: Number(row["Цена, р."] ?? row["Цена"] ?? 0),
})).filter((row) => row.name && row.supplier && Number.isFinite(row.price));

const response = await fetch(`${baseUrl}/api/admin`, {
  method: "POST",
  headers,
  body: JSON.stringify({ action: "bulk_import", cityId: city.id, rows }),
});
const result = await response.json();
if (!response.ok) throw new Error(result.error || "Загрузка боевой базы завершилась ошибкой");
console.log(`Загружено: ${result.suppliers} поставщиков, ${result.imported} строк. Город: ${cityName}.`);
