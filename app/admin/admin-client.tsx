/* eslint-disable @next/next/no-html-link-for-pages */
"use client";

import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";

type City = { id: number; name: string; active: number };
type Supplier = { id: number; name: string; active: number; cityId: number };
type PriceList = { id: number; supplierId: number; name: string; validFrom: string | null; active: number; createdAt: string };
type Product = { id: number; priceListId: number; article: string; name: string; weight: number | null; price: number; vegan: number; hit: number; active: number };

export default function AdminClient() {
  const [cities, setCities] = useState<City[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [priceLists, setPriceLists] = useState<PriceList[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [cityId, setCityId] = useState<number | null>(null);
  const [supplierId, setSupplierId] = useState<number | null>(null);
  const [priceListId, setPriceListId] = useState<number | null>(null);
  const [newCity, setNewCity] = useState("");
  const [newSupplier, setNewSupplier] = useState("");
  const [newList, setNewList] = useState({ name: "", validFrom: "" });
  const [notice, setNotice] = useState("");
  const [manual, setManual] = useState({ article: "", name: "", weight: "", price: "" });

  async function load() {
    const response = await fetch("/api/admin");
    if (response.status === 403) { location.href = "/login"; return; }
    const data = await response.json();
    setCities(data.cities);
    setSuppliers(data.suppliers);
    setPriceLists(data.priceLists);
    setProducts(data.products);
    setCityId((current) => current ?? data.cities[0]?.id ?? null);
  }

  useEffect(() => { // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, []);

  const citySuppliers = useMemo(() => suppliers.filter((supplier) => supplier.cityId === cityId), [suppliers, cityId]);
  const supplierLists = useMemo(() => priceLists.filter((list) => list.supplierId === supplierId), [priceLists, supplierId]);
  const list = useMemo(() => products.filter((product) => product.priceListId === priceListId), [products, priceListId]);
  const selectedSupplier = suppliers.find((supplier) => supplier.id === supplierId && supplier.cityId === cityId);
  const selectedList = priceLists.find((item) => item.id === priceListId);

  async function post(body: unknown) {
    const response = await fetch("/api/admin", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    return data;
  }

  function chooseCity(id: number) {
    setCityId(id); setSupplierId(null); setPriceListId(null); setNotice("");
  }
  function chooseSupplier(id: number) {
    setSupplierId(id); setPriceListId(null); setNotice("");
  }
  async function addCity() {
    if (!newCity.trim()) return;
    const result = await post({ action: "city", name: newCity });
    setNewCity(""); setCityId(result.city.id); setSupplierId(null); setPriceListId(null);
    await load();
  }
  async function removeCity() {
    if (!cityId || !confirm("Удалить этот город? Поставщиков в городе быть не должно.")) return;
    try {
      await post({ action: "delete_city", id: cityId });
      setCityId(null); setSupplierId(null); setPriceListId(null);
      await load();
    } catch (error) { setNotice(error instanceof Error ? error.message : "Не удалось удалить город"); }
  }
  async function addSupplier() {
    if (!newSupplier.trim() || !cityId) return;
    const result = await post({ action: "supplier", name: newSupplier, cityId });
    setNewSupplier(""); setSupplierId(result.supplier.id);
    await load();
  }
  async function removeSupplier() {
    if (!supplierId || !confirm("Удалить поставщика, все версии цен и позиции? Это действие нельзя отменить.")) return;
    await post({ action: "delete_supplier", id: supplierId });
    setSupplierId(null); setPriceListId(null); setNotice("Поставщик удалён");
    await load();
  }
  async function addPriceList() {
    if (!supplierId || !newList.name.trim()) return;
    try {
      const result = await post({ action: "price_list", supplierId, name: newList.name, validFrom: newList.validFrom || null });
      setNewList({ name: "", validFrom: "" }); setPriceListId(result.priceList.id);
      setNotice("Новая версия цен создана. Теперь загрузите в неё Excel.");
      await load();
    } catch (error) { setNotice(error instanceof Error ? error.message : "Не удалось создать прайс-лист"); }
  }
  async function savePriceList(priceList: PriceList) {
    try {
      await post({ action: "price_list_update", id: priceList.id, name: priceList.name, validFrom: priceList.validFrom, active: !!priceList.active });
      setNotice("Настройки версии сохранены");
      await load();
    } catch (error) { setNotice(error instanceof Error ? error.message : "Не удалось сохранить версию"); }
  }
  async function removePriceList() {
    if (!selectedList || !confirm(`Удалить прайс-лист «${selectedList.name}» и все его позиции? Это действие нельзя отменить.`)) return;
    await post({ action: "delete_price_list", id: selectedList.id });
    setPriceListId(null); setNotice("Версия цен удалена");
    await load();
  }
  async function save(product: Product) {
    await post({ action: "product", product: { ...product, vegan: !!product.vegan, hit: !!product.hit, active: !!product.active } });
    setNotice("Изменения сохранены");
    await load();
  }
  async function removeProduct(product: Product) {
    if (!confirm(`Удалить позицию «${product.name}»?`)) return;
    await post({ action: "delete_product", id: product.id });
    setNotice("Позиция удалена");
    await load();
  }
  async function addManual() {
    if (!priceListId || !manual.name || !manual.price) return;
    await post({ action: "manual", product: { priceListId, ...manual, weight: manual.weight ? Number(manual.weight) : null, price: Number(manual.price) } });
    setManual({ article: "", name: "", weight: "", price: "" });
    await load();
  }
  async function upload(file: File) {
    if (!priceListId) return;
    const workbook = XLSX.read(await file.arrayBuffer());
    const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[workbook.SheetNames[0]], { header: 1, defval: null });
    const headerIndex = rows.findIndex((row) => Array.isArray(row) && row.some((value) => String(value || "").trim().toLowerCase() === "название"));
    if (headerIndex < 0) { setNotice("Не найдена колонка «Название»"); return; }
    const headers = (rows[headerIndex] as unknown[]).map((value) => String(value || "").trim().toLowerCase());
    const column = (...names: string[]) => headers.findIndex((header) => names.includes(header));
    const nameIndex = column("название"), articleIndex = column("артикул"), priceIndex = column("цена, р.", "цена", "цена, ₽"), weightIndex = column("граммовка", "граммовка, г", "вес");
    const parsed = (rows.slice(headerIndex + 1) as unknown[][]).filter((row) => row[nameIndex] && row[priceIndex] != null).map((row) => {
      let name = String(row[nameIndex]).replace(/\s+/g, " ").trim();
      let weight = weightIndex >= 0 && row[weightIndex] != null ? Number(String(row[weightIndex]).match(/\d+/)?.[0]) : null;
      const suffix = name.match(/\s+(\d+)\s*(?:г|гр)\s*_[\p{L}\p{N}-]{2,16}$/iu);
      if (suffix) { weight = weight || Number(suffix[1]); name = name.slice(0, suffix.index).trim(); }
      return { article: articleIndex >= 0 ? String(row[articleIndex] || "") : "", name: name.toUpperCase(), weight, price: Number(row[priceIndex]) };
    });
    const result = await post({ action: "import", priceListId, rows: parsed });
    setNotice(`Загружено позиций: ${result.imported}`);
    await load();
  }

  return <main className="admin-shell">
    <header className="admin-header"><a href="/" className="admin-logo">ONE <span>PRICE</span></a><div><h1>Управление каталогом</h1><p>Города, поставщики, версии цен, позиции и фишки</p></div><a href="/">Панель партнёра →</a></header>
    <div className="city-admin-bar">
      <div className="city-tabs">{cities.map((city) => <button key={city.id} className={cityId === city.id ? "active" : ""} onClick={() => chooseCity(city.id)}>{city.name}</button>)}</div>
      <div className="city-create"><input placeholder="Новый город" value={newCity} onChange={(event) => setNewCity(event.target.value)} /><button onClick={addCity}>Добавить город</button>{cityId && <button className="danger-link" onClick={removeCity}>Удалить город</button>}</div>
    </div>
    <section className="admin-grid">
      <aside className="admin-suppliers"><h2>Поставщики</h2>{citySuppliers.map((supplier) => <button key={supplier.id} className={supplierId === supplier.id ? "active" : ""} onClick={() => chooseSupplier(supplier.id)}>{supplier.name}<span>{priceLists.filter((item) => item.supplierId === supplier.id).length} вер.</span></button>)}{cityId && <div className="add-supplier"><input placeholder="Новый поставщик" value={newSupplier} onChange={(event) => setNewSupplier(event.target.value)} /><button onClick={addSupplier}>Добавить</button></div>}</aside>
      <section className="admin-content">
        <div className="admin-actions"><div><h2>{selectedSupplier?.name || "Выберите поставщика"}</h2><p>{supplierLists.length} версий цен</p></div>{selectedSupplier && <button className="danger-button" onClick={removeSupplier}>Удалить поставщика</button>}</div>
        {notice && <p className="notice">{notice}</p>}
        {selectedSupplier && <div className="version-admin">
          <div className="version-create"><div><strong>Новая версия цен</strong><small>Можно загрузить будущие цены заранее</small></div><input placeholder="Например, Цены с 27 августа" value={newList.name} onChange={(event) => setNewList({ ...newList, name: event.target.value })} /><label>Действует с<input type="date" value={newList.validFrom} onChange={(event) => setNewList({ ...newList, validFrom: event.target.value })} /></label><button onClick={addPriceList}>Создать</button></div>
          <div className="price-list-strip">{supplierLists.map((item) => <button key={item.id} className={priceListId === item.id ? "price-list-card active" : "price-list-card"} onClick={() => { setPriceListId(item.id); setNotice(""); }}><b>{item.name}</b><span>{item.validFrom ? `С ${new Date(item.validFrom + "T00:00:00").toLocaleDateString("ru-RU")}` : "Без даты начала"} · {item.active ? "виден партнёрам" : "скрыт"}</span></button>)}</div>
        </div>}
        {selectedList && <><div className="version-settings">
          <input value={selectedList.name} onChange={(event) => setPriceLists((current) => current.map((item) => item.id === selectedList.id ? { ...item, name: event.target.value } : item))} />
          <label>Действует с<input type="date" value={selectedList.validFrom || ""} onChange={(event) => setPriceLists((current) => current.map((item) => item.id === selectedList.id ? { ...item, validFrom: event.target.value || null } : item))} /></label>
          <label className="active-check"><input type="checkbox" checked={!!selectedList.active} onChange={(event) => setPriceLists((current) => current.map((item) => item.id === selectedList.id ? { ...item, active: event.target.checked ? 1 : 0 } : item))} /> Показывать партнёрам</label>
          <button onClick={() => savePriceList(selectedList)}>Сохранить версию</button><button className="danger-button" onClick={removePriceList}>Удалить версию</button>
        </div>
        <div className="admin-actions list-actions"><div><h2>Позиции: {selectedList.name}</h2><p>{list.length} позиций</p></div><label className="upload-button">Загрузить Excel в эту версию<input type="file" accept=".xlsx,.xls" onChange={(event) => event.target.files?.[0] && upload(event.target.files[0])} /></label></div>
        <div className="manual-form"><input placeholder="Артикул" value={manual.article} onChange={(event) => setManual({ ...manual, article: event.target.value })} /><input className="wide" placeholder="Название позиции" value={manual.name} onChange={(event) => setManual({ ...manual, name: event.target.value })} /><input placeholder="Граммы" value={manual.weight} onChange={(event) => setManual({ ...manual, weight: event.target.value })} /><input placeholder="Цена" value={manual.price} onChange={(event) => setManual({ ...manual, price: event.target.value })} /><button onClick={addManual}>Добавить вручную</button></div>
        <div className="admin-table"><div className="admin-row head"><span>Название</span><span>Г</span><span>Цена</span><span>Веган</span><span>Хит</span><span>Активна</span><span>Действия</span></div>{list.map((product) => <div className="admin-row" key={product.id}><input value={product.name} onChange={(event) => setProducts((current) => current.map((item) => item.id === product.id ? { ...item, name: event.target.value } : item))} /><input value={product.weight ?? ""} onChange={(event) => setProducts((current) => current.map((item) => item.id === product.id ? { ...item, weight: event.target.value ? Number(event.target.value) : null } : item))} /><input value={product.price} onChange={(event) => setProducts((current) => current.map((item) => item.id === product.id ? { ...item, price: Number(event.target.value) } : item))} /><input type="checkbox" checked={!!product.vegan} onChange={(event) => setProducts((current) => current.map((item) => item.id === product.id ? { ...item, vegan: event.target.checked ? 1 : 0 } : item))} /><input type="checkbox" checked={!!product.hit} onChange={(event) => setProducts((current) => current.map((item) => item.id === product.id ? { ...item, hit: event.target.checked ? 1 : 0 } : item))} /><input type="checkbox" checked={!!product.active} onChange={(event) => setProducts((current) => current.map((item) => item.id === product.id ? { ...item, active: event.target.checked ? 1 : 0 } : item))} /><div className="row-actions"><button onClick={() => save(product)}>Сохранить</button><button className="delete-icon" aria-label={`Удалить ${product.name}`} onClick={() => removeProduct(product)}>×</button></div></div>)}</div></>}
        {selectedSupplier && !selectedList && <div className="empty-state">Выберите существующую версию цен или создайте новую</div>}
      </section>
    </section>
  </main>;
}
