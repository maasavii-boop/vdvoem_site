#!/usr/bin/env node
'use strict';
const fs=require('fs'); const path=require('path');
const ROOT=path.join(__dirname,'..'); const MARKET_DIR=path.join(ROOT,'data','markets'); const INBOX_DIR=path.join(ROOT,'data','inbox');
function args(){const o={};for(const t of process.argv.slice(2)){if(!t.startsWith('--'))continue;const[k,...r]=t.slice(2).split('=');o[k]=r.length?r.join('='):true;}return o}
function read(p){return JSON.parse(fs.readFileSync(p,'utf8'))} function write(p,d){fs.writeFileSync(p,JSON.stringify(d,null,2))}
function slug(v){return String(v||'').toLowerCase().replace(/ё/g,'е').replace(/[^a-zа-я0-9]+/gi,'-').replace(/^-+|-+$/g,'')}
const a=args(); const market=String(a.market||'').trim(); if(!market){console.error('Укажите --market=<id>');process.exit(1)}
const mf=path.join(MARKET_DIR,`${market}.json`), inbox=path.join(INBOX_DIR,`${market}.osm.json`); if(!fs.existsSync(mf)||!fs.existsSync(inbox)){console.error('Не найден market или inbox файл');process.exit(1)}
const m=read(mf), q=read(inbox); const names=new Set((m.locations||[]).map(x=>slug(x.name))); const ids=new Set((m.locations||[]).map(x=>x.source_id).filter(Boolean));
let chosen=q.locations||[];
if(a.auto){ chosen=chosen.filter(x=>x.quality?.decision==='auto_publish'); } else if(!a.all){ chosen=chosen.filter(x=>x.approved===true); }
chosen=chosen.filter(x=>x.name && !names.has(slug(x.name)) && !ids.has(x.source_id)).map(x=>({...x,status:a.auto?'auto-published':'published',approved:undefined,published_at:new Date().toISOString()}));
m.locations=[...(m.locations||[]),...chosen]; write(mf,m); console.log(`Опубликовано: ${chosen.length}. Всего в ${market}: ${m.locations.length}`);
