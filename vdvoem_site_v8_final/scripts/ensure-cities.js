#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path'),{spawnSync}=require('child_process');
const ROOT=path.join(__dirname,'..'), FILE=path.join(ROOT,'data','russia-cities.json');
let ok=false;try{const d=JSON.parse(fs.readFileSync(FILE,'utf8'));ok=Array.isArray(d.cities)&&d.cities.length>1000}catch{}
if(ok){console.log('Каталог городов уже есть.');process.exit(0)}
console.log('Загружаю полный каталог городов России…');
const r=spawnSync(process.execPath,[path.join('scripts','sync-cities.js')],{cwd:ROOT,stdio:'inherit',env:process.env});
if(r.status!==0){console.warn('Не удалось обновить каталог городов. Сайт запустится с резервным списком; повторите npm run sync:cities позже.');process.exit(0)}
