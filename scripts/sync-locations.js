#!/usr/bin/env node
'use strict';
const fs=require('fs');
const path=require('path');
const {spawnSync}=require('child_process');
const ROOT=path.join(__dirname,'..');
const MARKET_DIR=path.join(ROOT,'data','markets');
const INBOX_DIR=path.join(ROOT,'data','inbox');
function read(p){return JSON.parse(fs.readFileSync(p,'utf8'));}
function write(p,d){fs.writeFileSync(p,JSON.stringify(d,null,2));}
function slug(v){return String(v||'').toLowerCase().replace(/ё/g,'е').replace(/[^a-zа-я0-9]+/gi,'-').replace(/^-+|-+$/g,'');}
function run(cmd,args){const r=spawnSync(process.execPath,[cmd,...args],{cwd:ROOT,stdio:'inherit',env:process.env});if(r.status!==0)throw new Error(`Команда завершилась с кодом ${r.status}`);}
const refresh=process.argv.includes('--refresh');
const files=fs.readdirSync(MARKET_DIR).filter(f=>f.endsWith('.json')&&!f.startsWith('_'));
let totalAdded=0,totalReview=0,totalRejected=0;
for(const file of files){
  const mf=path.join(MARKET_DIR,file); const data=read(mf); const m=data.market||{}; const cfg=m.import||{};
  if(m.enabled===false || cfg.provider!=='osm' || cfg.auto_publish===false) continue;
  const area=cfg.area||m.label; if(!area) continue;
  const args=[`--market=${m.id}`,`--area=${area}`]; if(cfg.region)args.push(`--region=${cfg.region}`); if(refresh)args.push('--refresh');
  console.log(`\n=== ${m.label} ===`); run(path.join('scripts','import-osm.js'),args);
  const inbox=path.join(INBOX_DIR,`${m.id}.osm.json`); if(!fs.existsSync(inbox))continue;
  const q=read(inbox); const locations=q.locations||[];
  const auto=locations.filter(x=>x.quality?.decision==='auto_publish');
  const review=locations.filter(x=>x.quality?.decision==='review');
  const rejected=locations.filter(x=>x.quality?.decision==='reject');
  const names=new Set((data.locations||[]).map(x=>slug(x.name))); const ids=new Set((data.locations||[]).map(x=>x.source_id).filter(Boolean));
  const chosen=auto.filter(x=>x.name&&!names.has(slug(x.name))&&!ids.has(x.source_id)).map(x=>({...x,status:'auto-published',published_at:new Date().toISOString()}));
  data.locations=[...(data.locations||[]),...chosen];
  data.market.last_auto_sync_at=new Date().toISOString(); data.market.last_auto_added=chosen.length;
  write(mf,data);
  write(inbox,{...q,meta:{...q.meta,auto_published:chosen.length,needs_review:review.length,rejected:rejected.length},locations:[...review,...rejected]});
  totalAdded+=chosen.length; totalReview+=review.length; totalRejected+=rejected.length;
  console.log(`Автоопубликовано: ${chosen.length}; на проверку: ${review.length}; отброшено: ${rejected.length}`);
}
console.log(`\nГотово. Добавлено: ${totalAdded}; осталось на проверку: ${totalReview}; отброшено: ${totalRejected}.`);
