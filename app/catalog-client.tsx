/* eslint-disable jsx-a11y/anchor-is-valid */
"use client";
import { useEffect, useMemo, useState } from "react";
import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

type Supplier={id:number;name:string};
type Product={id:number;supplierId:number;article:string;name:string;weight:number|null;price:number;vegan:number;hit:number};
export default function CatalogClient({role}:{role:"partner"|"admin"}){
 const [suppliers,setSuppliers]=useState<Supplier[]>([]);const[products,setProducts]=useState<Product[]>([]);const[supplierId,setSupplierId]=useState<number|null>(null);const[selected,setSelected]=useState<number[]>([]);const[query,setQuery]=useState("");const[loading,setLoading]=useState(true);
 useEffect(()=>{fetch("/api/catalog").then(async r=>{if(r.status===401){location.href="/login";return null;}return r.json();}).then(data=>{if(!data)return;setSuppliers(data.suppliers);setProducts(data.products);setSupplierId(data.suppliers[0]?.id??null);setLoading(false);});},[]);
 const visible=useMemo(()=>products.filter(p=>p.supplierId===supplierId&&(`${p.name} ${p.article}`).toLowerCase().includes(query.toLowerCase())),[products,supplierId,query]);
 const chosen=products.filter(p=>selected.includes(p.id));
 function toggle(id:number){setSelected(c=>c.includes(id)?c.filter(x=>x!==id):[...c,id]);}
 async function logout(){await fetch("/api/auth/logout",{method:"POST"});location.href="/login";}
 async function createPdf(){
  const pdf=await PDFDocument.create();pdf.registerFontkit(fontkit);const font=await pdf.embedFont(await fetch("/FiraSansExtraCondensed-ExtraBold.ttf").then(r=>r.arrayBuffer()));
  const W=595.28,H=841.89,TW=170.08,TH=113.39,ox=(W-TW*3)/2,oy=(H-TH*6)/2;
  const cream=rgb(254/255,248/255,214/255),green=rgb(36/255,121/255,36/255),orange=rgb(1,126/255,46/255),white=rgb(1,1,1);
  function lines(text:string,max:number,size:number){const words=text.toUpperCase().split(/\s+/);const out:string[]=[];let line="";for(const word of words){const next=line?`${line} ${word}`:word;if(font.widthOfTextAtSize(next,size)<=max)line=next;else{if(line)out.push(line);line=word;}}if(line)out.push(line);return out;}
  for(let i=0;i<chosen.length;i++){if(i%18===0)pdf.addPage([W,H]);const page=pdf.getPages().at(-1)!;const local=i%18,col=local%3,row=Math.floor(local/3),x=ox+col*TW,y=oy+(5-row)*TH,p=chosen[i];page.drawRectangle({x,y,width:TW,height:TH,color:cream,borderColor:rgb(.72,.72,.72),borderWidth:.3});
   const hasBadge=p.vegan||p.hit;let size=13;let wrapped=lines(p.name,hasBadge?112:146,size);while(wrapped.length>3&&size>9){size-=.5;wrapped=lines(p.name,hasBadge?112:146,size);}wrapped.slice(0,3).forEach((line,j)=>page.drawText(line,{x:x+11,y:y+TH-22-j*size*.9,size,font,color:green}));
   const price=`${p.price} ₽`,ps=21;page.drawText(price,{x:x+11,y:y+14,size:ps,font,color:green});const pw=font.widthOfTextAtSize(price,ps);if(p.weight)page.drawText(`/ ${p.weight} Г`,{x:x+15+pw,y:y+16,size:11,font,color:green});
   const badge=(label:string,cy:number,color:typeof green,textColor:typeof green)=>{page.drawCircle({x:x+TW-22,y:cy,size:14,color,borderColor:color,borderWidth:.8});page.drawText(label,{x:x+TW-22-font.widthOfTextAtSize(label,5)/2,y:cy-2,size:5,font,color:textColor});};
   if(p.vegan)badge("ВЕГАН",y+TH-26,cream,green);if(p.hit)badge("ХИТ",y+TH-(p.vegan?58:26),orange,white);
  }
  const bytes=await pdf.save();const blob=new Blob([new Uint8Array(bytes)],{type:"application/pdf"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`Ценники_${suppliers.find(s=>s.id===supplierId)?.name||"OnePrice"}.pdf`;a.click();URL.revokeObjectURL(a.href);
 }
 return <main className="app-shell"><aside className="sidebar"><div className="brand-mark">ONE<br/><span>PRICE</span></div><nav><a className="nav-item active">Каталог ценников</a>{role==="admin"&&<a className="nav-item" href="/admin">Админ-панель</a>}</nav><div className="sidebar-footer"><span className="status-dot"/> {role==="admin"?"Администратор":"Партнёр One Price"}<button onClick={logout}>Выйти</button></div></aside>
 <section className="workspace"><header className="topbar"><div><p className="eyebrow">ONE PRICE COFFEE · ЦЕННИКИ</p><h1>Соберите набор для печати</h1><p className="subtitle">Выберите поставщика и отметьте нужные позиции.</p></div><div className="selection-counter"><strong>{selected.length}</strong><span>выбрано</span></div></header>
 <div className="supplier-strip">{suppliers.map(s=><button key={s.id} className={`supplier ${supplierId===s.id?"active":""}`} onClick={()=>{setSupplierId(s.id);setSelected([])}}><span>{products.filter(p=>p.supplierId===s.id).length}</span>{s.name}</button>)}</div>
 <div className="toolbar"><label className="search-field"><span>Поиск</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Название или артикул"/></label><button className="outline-button" onClick={()=>setSelected(visible.map(p=>p.id))}>Выбрать все</button><button className="outline-button" onClick={()=>setSelected([])}>Сбросить</button></div>
 <div className="catalog-card"><div className="table-head"><span>Позиция</span><span>Граммовка</span><span>Цена</span><span>Фишки</span><span>Выбор</span></div>{loading?<div className="empty-state">Загружаем каталог…</div>:visible.length===0?<div className="empty-state">У поставщика пока нет позиций</div>:visible.map(p=><label className={`product-row ${selected.includes(p.id)?"selected":""}`} key={p.id}><span className="product-name">{p.name}<small>Арт. {p.article}</small></span><span>{p.weight?`${p.weight} г`:"—"}</span><strong>{p.price} ₽</strong><span className="badges">{!!p.vegan&&<i className="vegan">ВЕГАН</i>}{!!p.hit&&<i className="hit">ХИТ</i>}{!p.vegan&&!p.hit&&"—"}</span><input type="checkbox" checked={selected.includes(p.id)} onChange={()=>toggle(p.id)}/></label>)}</div>
 <div className="action-bar"><div><strong>{selected.length} позиций</strong><span>PDF · A4 · 18 ценников на листе</span></div><button disabled={!selected.length} onClick={createPdf}>Сформировать PDF</button></div></section></main>;
}
