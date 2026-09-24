#!/usr/bin/env node
'use strict';
const fs=require('fs'); const path=require('path');
const ROOT=path.join(__dirname,'..'); const DIR=path.join(ROOT,'data','markets');
const args={}; for(const t of process.argv.slice(2)){if(!t.startsWith('--'))continue;const[k,...r]=t.slice(2).split('=');args[k]=r.length?r.join('='):true;}
const id=String(args.id||'').trim(), label=String(args.label||'').trim(), region=String(args.region||label).trim();
if(!id||!label){console.error('Пример: npm run market:create -- --id=kazan --label="Казань" --region="Республика Татарстан"');process.exit(1)}
const file=path.join(DIR,`${id}.json`); if(fs.existsSync(file)){console.error('Файл уже существует: '+file);process.exit(1)}
const data={market:{id,label,country_code:'RU',region,type:'city',enabled:true,import:{provider:'osm',area:label,region:region||null,auto_publish:true}},locations:[]}; fs.writeFileSync(file,JSON.stringify(data,null,2)); console.log('Создано: '+path.relative(ROOT,file));
