import readXlsxFile from "read-excel-file/node";

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:3000";
const adminLogin = process.env.NUXT_ADMIN_LOGIN || "admin";
const adminPassword = process.env.NUXT_ADMIN_PASSWORD;
const cityName = process.env.SEED_CITY || "Москва";
const filePath = process.env.SEED_FILE || "data/production/Готовая база с ценами.xlsx";

if (!adminPassword) throw new Error("Задайте NUXT_ADMIN_PASSWORD перед загрузкой боевой базы");

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

const source = await readXlsxFile(filePath);
const headerIndex = source.findIndex((row) => row.some((value) => String(value || "").trim().toLowerCase() === "поставщик"));
if (headerIndex < 0) throw new Error("В боевой базе не найдена колонка «Поставщик»");
const sheetHeaders = source[headerIndex].map((value) => String(value || "").trim().toLowerCase());
const column = (...names) => sheetHeaders.findIndex((header) => names.includes(header));
const articleIndex = column("артикул");
const nameIndex = column("название", "наименование");
const supplierIndex = column("поставщик");
const priceIndex = column("цена, р.", "цена", "цена, ₽");
if (nameIndex < 0 || supplierIndex < 0 || priceIndex < 0) throw new Error("Нужны колонки «Название», «Поставщик» и «Цена»");
const rows = source.slice(headerIndex + 1).map((row) => {
  let name = String(row[nameIndex] || "").replace(/\s+/g, " ").trim();
  const suffix = name.match(/\s+(\d+)\s*(?:г|гр)\s*_[\p{L}\p{N}-]{2,16}$/iu);
  const weight = suffix ? Number(suffix[1]) : null;
  if (suffix) name = name.slice(0, suffix.index).trim();
  return {
    article: articleIndex >= 0 ? String(row[articleIndex] || "") : "",
    name: name.toUpperCase(),
    supplier: String(row[supplierIndex] || "").trim(),
    weight,
    price: Number(String(row[priceIndex] ?? "").replace(/\s/g, "").replace(",", ".")),
  };
}).filter((row) => row.name && row.supplier && Number.isFinite(row.price));

const response = await fetch(`${baseUrl}/api/admin`, {
  method: "POST",
  headers,
  body: JSON.stringify({ action: "bulk_import", cityId: city.id, rows }),
});
const result = await response.json();
if (!response.ok) throw new Error(result.error || "Загрузка боевой базы завершилась ошибкой");
console.log(`Загружено: ${result.suppliers} поставщиков, ${result.imported} строк. Город: ${cityName}.`);
