#!/usr/bin/env node
'use strict';
const fs=require('fs'); const path=require('path');
const ROOT=path.join(__dirname,'..'); const INBOX=path.join(ROOT,'data','inbox'); const CACHE=path.join(ROOT,'.cache','overpass'); const WEB_CACHE=path.join(ROOT,'.cache','websites');
const ENDPOINT=process.env.OVERPASS_URL||'https://overpass-api.de/api/interpreter';
const UA=process.env.VDVOEM_USER_AGENT||'vdvoem-location-importer/2.0 (set VDVOEM_USER_AGENT with contact email)';
function arg(){const o={};for(const t of process.argv.slice(2)){if(!t.startsWith('--'))continue;const [k,...r]=t.slice(2).split('=');o[k]=r.length?r.join('='):true;}return o;}
function clean(v){return String(v||'').trim()} function slug(v){return clean(v).toLowerCase().replace(/ё/g,'е').replace(/[^a-zа-я0-9]+/gi,'-').replace(/^-+|-+$/g,'')} function uniq(a){return [...new Set(a.filter(Boolean))]}
function read(p){return JSON.parse(fs.readFileSync(p,'utf8'))} function write(p,d){fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,JSON.stringify(d,null,2))}
function escQ(s){return clean(s).replace(/\\/g,'\\\\').replace(/"/g,'\\"')}
function areaSelector(area,region,mode){
 if(mode==='region') return `area["boundary"="administrative"]["name"="${escQ(area)}"]->.searchArea;`;
 if(region) return `area["boundary"="administrative"]["name"="${escQ(region)}"]->.region;\nrelation(area.region)["boundary"="administrative"]["name"="${escQ(area)}"]; map_to_area -> .searchArea;`;
 return `area["boundary"="administrative"]["name"="${escQ(area)}"]->.searchArea;`;
}
function query(area,region,mode){const sel=areaSelector(area,region,mode); const specialty=`nwr(area.searchArea)["name"~"(гл[эе]мп|glamp|spa|спа|эко.?отел|eco.?hotel|шале|chalet|a.?frame|афрейм|купол|сфера|ретрит|resort|курорт|база отдыха|домики|баня|купель)",i];`;
 const core=`nwr(area.searchArea)["name"]["tourism"~"^(attraction|museum|gallery|hotel|guest_house|chalet|camp_site|caravan_site|apartment|viewpoint|theme_park|zoo|wilderness_hut)$"];\nnwr(area.searchArea)["name"]["leisure"~"^(park|nature_reserve|water_park|bowling_alley|sports_centre|escape_game|marina|sauna|swimming_pool)$"];\nnwr(area.searchArea)["name"]["amenity"~"^(theatre|cinema|arts_centre|planetarium|spa)$"];\nnwr(area.searchArea)["name"]["historic"~"^(castle|manor|monument|memorial|ruins)$"];\nnwr(area.searchArea)["name"]["natural"~"^(beach|spring|peak)$"];\nnwr(area.searchArea)["name"]["craft"="pottery"];`;
 return `[out:json][timeout:${mode==='region'?90:55}];\n${sel}\n(\n${mode==='specialty'||mode==='region'?specialty:core+'\n'+specialty}\n);\nout center tags;`}
function classify(tags={}){const t=JSON.stringify(tags).toLowerCase(), tourism=tags.tourism, leisure=tags.leisure, amenity=tags.amenity, historic=tags.historic, natural=tags.natural, craft=tags.craft; let type='достопримечательность',best=['Необычное'],budget='средний',overnight=false,features=[];
 const niche=/гл[эе]мп|glamp/.test(t), spa=/\bspa\b|спа|саун|баня|банн|купел|терм/.test(t), chalet=/шале|chalet|a.?frame|афрейм|купол|сфера|домик|база отдыха|ретрит|resort|курорт/.test(t);
 if(niche){type='глэмпинг';best=['Мини-путешествие','Романтика','Природа','Необычное'];overnight=true;budget='средний';features.push('глэмпинг');}
 else if(['hotel','guest_house','chalet','apartment','wilderness_hut'].includes(tourism)||chalet){type=tourism==='chalet'?'шале':'загородный отель';best=['Мини-путешествие','Романтика'];overnight=true;budget='высокий';}
 else if(['camp_site','caravan_site'].includes(tourism)){type='глэмпинг/кемпинг';best=['Мини-путешествие','Природа','Романтика'];overnight=true;budget='средний';features.push('природа');}
 else if(tourism==='museum'||tourism==='gallery'){type=tourism==='museum'?'музей':'галерея';best=['Культура','Романтика'];}
 else if(tourism==='viewpoint'){type='смотровая';best=['Романтика','Природа'];budget='бесплатно';}
 else if(tourism==='attraction'){type='достопримечательность';best=['Культура','Мини-путешествие'];}
 else if(tourism==='theme_park'||tourism==='zoo'){type=tourism==='zoo'?'зоопарк':'парк развлечений';best=['Необычное','Активное'];}
 else if(leisure==='park'){type='парк';best=['Природа','Романтика','Активное'];budget='бесплатно';features.push('прогулка');}
 else if(leisure==='nature_reserve'){type='природный парк';best=['Природа','Мини-путешествие'];budget='бесплатно';features.push('природа');}
 else if(leisure==='water_park'){type='аквапарк';best=['Активное','Необычное'];}
 else if(leisure==='bowling_alley'){type='боулинг';best=['Игры','Активное'];}
 else if(leisure==='escape_game'){type='квест';best=['Игры','Необычное'];}
 else if(leisure==='sports_centre'){type='спортивный центр';best=['Активное'];}
 else if(leisure==='marina'){type='марина';best=['Романтика','Мини-путешествие'];features.push('у воды');}
 else if(amenity==='theatre'){type='театр';best=['Культура','Романтика'];}
 else if(amenity==='cinema'){type='кинотеатр';best=['Культура','Романтика'];}
 else if(amenity==='arts_centre'){type='арт-пространство';best=['Культура','Творчество'];}
 else if(amenity==='planetarium'){type='планетарий';best=['Культура','Романтика','Необычное'];}
 else if(amenity==='spa'||leisure==='sauna'){type='SPA/банный комплекс';best=['Романтика','Мини-путешествие'];budget='высокий';features.push('SPA');}
 else if(historic==='manor'){type='усадьба';best=['Культура','Мини-путешествие','Романтика'];}
 else if(historic){type='историческое место';best=['Культура','Мини-путешествие'];budget='низкий';}
 else if(natural==='beach'){type='пляж';best=['Природа','Романтика','Активное'];budget='бесплатно';features.push('у воды');}
 else if(natural){type='природная точка';best=['Природа','Мини-путешествие'];budget='бесплатно';}
 else if(craft==='pottery'){type='гончарная мастерская';best=['Творчество','Романтика'];}
 if(spa){features.push('SPA');if(!best.includes('Романтика'))best.push('Романтика');}
 if(/lake|river|water|озер|рек|водохр|пруд|берег/.test(t))features.push('у воды'); if(/forest|лес|бор|сосн/.test(t))features.push('лес'); if(/pool|бассейн/.test(t))features.push('бассейн'); if(/купел|чан/.test(t))features.push('купель'); if(/баня|саун/.test(t))features.push('баня');
 return {type,best_for:uniq(best),budget,overnight,features:uniq(features)};
}
function addr(tags){return [tags['addr:street'],tags['addr:housenumber']].filter(Boolean).join(', ')||tags['addr:full']||tags['addr:place']||''}
function score(tags,c,xy){let s=0;const flags=[]; if(tags.name)s+=15;if(Number.isFinite(xy.lat)&&Number.isFinite(xy.lon))s+=15;if(c.type!=='достопримечательность')s+=18;else s+=7;if(addr(tags))s+=7;if(tags.website||tags['contact:website']||tags.url||tags['contact:url'])s+=15;if(tags.phone||tags['contact:phone'])s+=3;if(tags.opening_hours)s+=4;if(tags.wikidata||tags.wikipedia)s+=6;if(c.overnight)s+=4;if(c.features.includes('SPA')||c.type.includes('глэмп'))s+=5;
 const lifecycle=`${tags.disused||''} ${tags.abandoned||''} ${tags.construction||''} ${tags.access||''}`.toLowerCase(); if(/yes|private/.test(lifecycle)){s-=70;flags.push('inactive_or_private')};
 const decision=s>=48?'auto_publish':s>=32?'review':'reject';return {score:Math.max(0,Math.min(100,s)),decision,flags};}
function website(tags){return tags.website||tags['contact:website']||tags.url||tags['contact:url']||null}
function candidate(el,ctx){const tags=el.tags||{}, xy={lat:el.lat??el.center?.lat,lon:el.lon??el.center?.lon}, c=classify(tags);return {source:'osm',source_id:`osm:${el.type}:${el.id}`,source_url:`https://www.openstreetmap.org/${el.type}/${el.id}`,name:tags.name,city:tags['addr:city']||ctx.city||ctx.area,region:ctx.region||tags['addr:region']||null,type:c.type,subtype:c.type,address:addr(tags),best_for:c.best_for,budget:c.budget,overnight:c.overnight,season:'all',features:c.features,lat:xy.lat,lon:xy.lon,website:website(tags),phone:tags.phone||tags['contact:phone']||null,opening_hours:tags.opening_hours||null,quality:score(tags,c,xy),last_seen_at:new Date().toISOString(),import_scope:ctx.scope};}
function kw(text){const t=text.toLowerCase(), f=[]; const m=[['SPA',/\bspa\b|спа|терм/],['баня',/баня|банн/],['сауна',/саун/],['купель',/купел|чан/],['бассейн',/бассейн|pool/],['у воды',/озер|рек|водохр|пруд|берег|water|lake|river/],['лес',/лес|бор|сосн|forest/],['A-frame',/a.?frame|афрейм/],['сфера/купол',/сфера|купол|dome/],['глэмпинг',/гл[эе]мп|glamp/]];for(const [n,r] of m)if(r.test(t))f.push(n);return f}
async function enrich(c){if(!c.website||c.quality.score<35)return c;let u;try{u=new URL(c.website.startsWith('http')?c.website:`https://${c.website}`)}catch{return c};const file=path.join(WEB_CACHE,slug(u.hostname)+'.json');let data=null;if(fs.existsSync(file)&&Date.now()-fs.statSync(file).mtimeMs<30*864e5){try{data=read(file)}catch{}}
 if(!data){try{const ctl=new AbortController();setTimeout(()=>ctl.abort(),7000);const r=await fetch(u,{redirect:'follow',signal:ctl.signal,headers:{'user-agent':UA,'accept':'text/html'}});if(r.ok){const html=(await r.text()).slice(0,500000);data={url:r.url,title:(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)||[])[1]||'',text:html.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').slice(0,80000)};write(file,data)}}catch{}}
 if(data){const feats=kw(`${data.title} ${data.text}`);c.features=uniq([...(c.features||[]),...feats]);c.verified_website=data.url||c.website;c.quality.score=Math.min(100,c.quality.score+Math.min(12,feats.length*2+2));if(c.quality.score>=48)c.quality.decision='auto_publish';c.web_enriched_at=new Date().toISOString();}return c;}
async function overpass(q,key,refresh){fs.mkdirSync(CACHE,{recursive:true});const file=path.join(CACHE,`${slug(key)}.json`);if(!refresh&&fs.existsSync(file)&&Date.now()-fs.statSync(file).mtimeMs<7*864e5)return read(file);const r=await fetch(ENDPOINT,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded;charset=UTF-8','user-agent':UA},body:'data='+encodeURIComponent(q)});if(!r.ok)throw new Error(`Overpass ${r.status}`);const j=await r.json();write(file,j);return j;}
(async()=>{const a=arg(),area=clean(a.area),region=clean(a.region),mode=clean(a.mode||'city');if(!area)throw new Error('Нужен --area="..."');const ctx={area,region:region||null,city:mode==='city'?area:null,scope:mode};const raw=await overpass(query(area,region,mode),`${mode}-${area}-${region}`,Boolean(a.refresh));let list=(raw.elements||[]).filter(x=>x.tags?.name).map(x=>candidate(x,ctx));const seen=new Set();list=list.filter(x=>{const k=x.source_id; if(seen.has(k))return false;seen.add(k);return true});const limit=Number(a.enrich||80);for(let i=0;i<Math.min(limit,list.length);i++)list[i]=await enrich(list[i]);const market=clean(a.market)||slug(area);const out=path.join(INBOX,`${market}.${mode}.osm.json`);write(out,{meta:{area,region:region||null,mode,generated_at:new Date().toISOString(),count:list.length},locations:list});console.log(`Готово: ${list.length} кандидатов → ${path.relative(ROOT,out)}`)})().catch(e=>{console.error(e.stack||e);process.exit(1)});
