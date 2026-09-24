#!/usr/bin/env node
'use strict';
const fs=require('fs');
const path=require('path');
const ROOT=path.join(__dirname,'..');
const OUT=path.join(ROOT,'data','russia-cities.json');
const UA=process.env.VDVOEM_USER_AGENT||'vdvoem-city-registry/1.0 (set VDVOEM_USER_AGENT with contact email)';
const URL='https://ru.wikipedia.org/wiki/%D0%A1%D0%BF%D0%B8%D1%81%D0%BE%D0%BA_%D0%B3%D0%BE%D1%80%D0%BE%D0%B4%D0%BE%D0%B2_%D0%A0%D0%BE%D1%81%D1%81%D0%B8%D0%B8';
function decode(s){return String(s||'').replace(/<sup[\s\S]*?<\/sup>/gi,'').replace(/<br\s*\/?>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/\s+/g,' ').trim();}
function slug(s){return String(s||'').toLowerCase().replace(/ё/g,'е').replace(/[^a-zа-я0-9]+/gi,'-').replace(/^-+|-+$/g,'');}
function regionSlug(s){return slug(String(s).replace(/^Республика\s+/i,'').replace(/\s+(область|край|автономный округ)$/i,''));}
async function main(){
 const res=await fetch(URL,{signal:AbortSignal.timeout(12000),headers:{'user-agent':UA,'accept-language':'ru'}}); if(!res.ok) throw new Error(`Wikipedia ${res.status}`); const html=await res.text();
 const rows=[...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map(m=>m[1]); const cities=[]; const seen=new Set();
 for(const row of rows){const cells=[...row.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(m=>decode(m[1])); if(cells.length<4)continue; if(!/^\d+$/.test(cells[0].replace(/\s/g,'')))continue; const name=cells[2], region=cells[3]; if(!name||!region||name==='Город')continue; const k=`${name}|${region}`; if(seen.has(k))continue; seen.add(k); cities.push({id:slug(`${name}-${region}`),name,region,region_id:regionSlug(region),source:'wikipedia-city-list'});}
 cities.sort((a,b)=>a.name.localeCompare(b.name,'ru'));
 fs.writeFileSync(OUT,JSON.stringify({meta:{source:URL,generated_at:new Date().toISOString(),count:cities.length,note:'Городской каталог используется для выбора города; локации обновляются независимо.'},cities},null,2));
 console.log(`Готово: ${cities.length} городов → data/russia-cities.json`);
}
main().catch(e=>{console.error(e.stack||e);process.exit(1)});
