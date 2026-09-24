(()=>{
'use strict';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const SVG='http://www.w3.org/2000/svg';
const state={config:null,categories:[],rotation:0,current:null,spinning:false,cityMap:new Map(),tripTags:new Set()};
const COLORS=['#ffafd0','#dfff55','#f9e490','#c6ebe8','#ffc5a1','#bfd9fb','#dac6ff','#bee2c6','#ff92be'];
const ICONS={
'Романтика':[['path','M4.2 12.2 12 19.5l7.8-7.3C24 8.2 17.7 2 12 7.1 6.3 2 0 8.2 4.2 12.2Z']],
'Еда':[['path','M7 3v8M4 3v5c0 2 1.2 3 3 3s3-1 3-3V3M7 11v10M16 3v18M16 3c4 3 4 8 0 10']],
'Активное':[['path','M3 16c4-1 6-4 8-8l3 2 3 1 4 5M7 19h7M11 8 9 4M17 11l2-5']],
'Творчество':[['path','M12 3c5 0 9 3.5 9 8 0 3-2 4-4 4h-2c-1 0-1.5.7-1.5 1.5 0 1.5-1 3.5-4 3.5A7.5 7.5 0 0 1 3 12c0-5 4-9 9-9Z'],['circle','8','9','1'],['circle','12','7','1'],['circle','16','9','1']],
'Игры':[['rect','4','5','16','14','3'],['circle','9','10','1'],['circle','15','14','1'],['path','M15 9h3M16.5 7.5v3']],
'Культура':[['path','M3 9h18M5 9v9M9 9v9M15 9v9M19 9v9M3 18h18M2 21h20M12 3 3 7h18l-9-4Z']],
'Природа':[['path','M20 4C11 5 5 10 5 17c5 1 12-1 15-13ZM5 17c3-3 6-5 10-7M7 20c0-2-.5-4-2-6']],
'Мини-путешествие':[['rect','5','7','14','12','2'],['path','M9 7V4h6v3M8 19v2M16 19v2M5 12h14']],
'Необычное':[['path','m12 3 1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3ZM5 14l.8 2.2L8 17l-2.2.8L5 20l-.8-2.2L2 17l2.2-.8L5 14ZM19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8L19 14Z']]
};
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function polar(cx,cy,r,a){const z=(a-90)*Math.PI/180;return{x:cx+r*Math.cos(z),y:cy+r*Math.sin(z)}}
function arcPath(cx,cy,r,a0,a1){const p0=polar(cx,cy,r,a1),p1=polar(cx,cy,r,a0),large=a1-a0<=180?0:1;return`M ${cx} ${cy} L ${p0.x} ${p0.y} A ${r} ${r} 0 ${large} 0 ${p1.x} ${p1.y} Z`}
function el(name,attrs={}){const n=document.createElementNS(SVG,name);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,v);return n}
function iconGroup(cat){const g=el('g',{transform:'translate(-13 -13) scale(1.08)','aria-hidden':'true'});(ICONS[cat]||ICONS['Необычное']).forEach(spec=>{const[type,...a]=spec;let n;if(type==='path')n=el('path',{d:a[0],class:'icon-stroke'});else if(type==='circle')n=el('circle',{cx:a[0],cy:a[1],r:a[2],class:'icon-fill'});else n=el('rect',{x:a[0],y:a[1],width:a[2],height:a[3],rx:a[4]||0,class:'icon-stroke'});g.appendChild(n)});return g}
function renderWheel(){
  const svg=$('#wheelSvg'),n=state.categories.length,seg=360/n;svg.innerHTML='';
  state.categories.forEach((cat,i)=>{
    const center=i*seg,start=center-seg/2,end=center+seg/2;
    const p=el('path',{d:arcPath(220,220,210,start,end),fill:COLORS[i%COLORS.length],class:'wheel-sector','data-category':cat});svg.appendChild(p);
    const outer=el('g',{transform:`rotate(${center} 220 220) translate(220 79)`,class:'wheel-label','data-category':cat});
    const plate=el('rect',{x:-58,y:-37,width:116,height:75,rx:18,class:'label-plate'});outer.appendChild(plate);
    const iconWrap=el('g',{transform:'translate(0 -12)'});iconWrap.appendChild(iconGroup(cat));outer.appendChild(iconWrap);
    const lines=cat==='Мини-путешествие'?['Мини-','путешествие']:[cat];
    lines.forEach((line,j)=>{const t=el('text',{x:0,y:20+j*12,'text-anchor':'middle',class:'label-text','font-size':cat==='Мини-путешествие'?'10.2':'11.4'});t.textContent=line;outer.appendChild(t)});svg.appendChild(outer);
  });
  for(let i=0;i<n;i++){const a=i*seg-seg/2,p1=polar(220,220,78,a),p2=polar(220,220,210,a);svg.appendChild(el('line',{x1:p1.x,y1:p1.y,x2:p2.x,y2:p2.y,class:'sector-divider'}))}
  svg.appendChild(el('circle',{cx:220,cy:220,r:210,fill:'none',stroke:'#111','stroke-width':4.5}));
  svg.appendChild(el('circle',{cx:220,cy:220,r:78,fill:'none',stroke:'rgba(17,17,17,.14)','stroke-width':2}));
}
function fillSelect(id,items){$(id).innerHTML=items.map(x=>`<option value="${esc(x.id)}">${esc(x.label)}</option>`).join('')}
function cityLabel(c){return `${c.name} — ${c.region}`}
function fillCities(cities){const list=$('#cityList');state.cityMap.clear();list.innerHTML='';for(const c of cities){const label=cityLabel(c);state.cityMap.set(label,c);const o=document.createElement('option');o.value=label;list.appendChild(o)}}
async function init(){const r=await fetch('/api/v1/config');if(!r.ok)throw new Error('config');state.config=await r.json();state.categories=state.config.categories;fillSelect('#scopeSelect',state.config.ui.scopes);$('#scopeSelect').value='moscow-mo';fillSelect('#budgetSelect',state.config.ui.budgets);fillSelect('#timeSelect',state.config.ui.times);fillSelect('#moodSelect',state.config.ui.moods);fillCities(state.config.cities||[]);renderWheel();bind();refreshSavedCount()}
function toggleCity(){const on=$('#scopeSelect').value==='city';$('#cityField').hidden=!on;if(on)setTimeout(()=>$('#cityInput').focus(),0)}
function bind(){
  $('#spinBtn').addEventListener('click',()=>spin({newCategory:true}));$('#againBtn').addEventListener('click',()=>spin({sameCategory:true}));$('#spinAgainBtn').addEventListener('click',()=>spin({newCategory:true}));
  $('#saveBtn').addEventListener('click',saveCurrent);$('#savedOpen').addEventListener('click',openSaved);$('#savedClose').addEventListener('click',()=>$('#savedPanel').hidden=true);$('#scopeSelect').addEventListener('change',toggleCity);
  $$('#tripChips button').forEach(b=>b.addEventListener('click',()=>{b.classList.toggle('is-active');const tag=b.dataset.tag;if(b.classList.contains('is-active'))state.tripTags.add(tag);else state.tripTags.delete(tag);spin({sameCategory:true})}));
}
function chosenCity(){return state.cityMap.get($('#cityInput').value)||null}
function payload(opts={}){const c=chosenCity();return{scope:$('#scopeSelect').value,city_id:c?.id||null,city_name:c?.name||null,city_region:c?.region||null,budget:$('#budgetSelect').value,time:$('#timeSelect').value,mood:$('#moodSelect').value,category:opts.sameCategory&&state.current?.category?state.current.category:'random'}}
async function spin(opts={}){
  if(state.spinning)return;if($('#scopeSelect').value==='city'&&!chosenCity())return toast('Выберите город из списка');
  state.spinning=true;$('#spinBtn').disabled=true;$('#againBtn').disabled=true;$('#spinAgainBtn').disabled=true;$('#wheelCenterTitle').textContent='КРУТИМ';$('#wheelCenterSub').textContent='…';clearWinner();
  try{const r=await fetch('/api/v1/spin',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload(opts))});const data=await r.json();if(!r.ok)throw new Error(data.error||'Не получилось подобрать вариант');if(opts.sameCategory)await animateNudge(data.category);else await animateTo(data.category);state.current=data;renderResult(data)}catch(e){toast(e.message)}finally{state.spinning=false;$('#spinBtn').disabled=false;$('#againBtn').disabled=false;$('#spinAgainBtn').disabled=false}
}
function animateTo(category){return new Promise(resolve=>{const i=state.categories.indexOf(category),seg=360/state.categories.length,desired=(( -i*seg)%360+360)%360,current=((state.rotation%360)+360)%360;let delta=desired-current;if(delta<0)delta+=360;const from=state.rotation,to=state.rotation+1440+delta,duration=3600,easing='cubic-bezier(.11,.72,.13,1)',rotator=$('#wheelRotator');rotator.getAnimations().forEach(a=>a.cancel());const a=rotator.animate([{transform:`rotate(${from}deg)`},{transform:`rotate(${to}deg)`}],{duration,easing,fill:'forwards'});state.rotation=to;a.onfinish=()=>{markWinner(category);resolve()}})}
function animateNudge(category){return new Promise(resolve=>{const from=state.rotation,to=state.rotation+360,duration=850,rotator=$('#wheelRotator');rotator.getAnimations().forEach(a=>a.cancel());const a=rotator.animate([{transform:`rotate(${from}deg)`},{transform:`rotate(${to}deg)`}],{duration,easing:'cubic-bezier(.2,.7,.2,1)',fill:'forwards'});state.rotation=to;a.onfinish=()=>{markWinner(category);resolve()}})}
function clearWinner(){$$('.wheel-sector').forEach(x=>x.classList.remove('is-winner'))}
function markWinner(category){const p=$(`.wheel-sector[data-category="${CSS.escape(category)}"]`);if(p)p.classList.add('is-winner')}
function linkButtons(links=[],compact=false){const priority=['Сайт','Официальный сайт','Яндекс Карты','2ГИС','Google Maps','OpenStreetMap'];const sorted=[...(links||[])].sort((a,b)=>priority.indexOf(a.label)-priority.indexOf(b.label));return sorted.slice(0,compact?3:5).map(l=>`<a class="place-link" href="${esc(l.url)}" target="_blank" rel="noopener noreferrer">${esc(shortLinkLabel(l.label))} ↗</a>`).join('')}
function shortLinkLabel(s){if(s==='Официальный сайт')return'сайт';if(s==='Яндекс Карты')return'Яндекс';if(s==='Google Maps')return'Google';if(s==='OpenStreetMap')return'OSM';return s}
function buildMeta(r){const out=[];if(r.duration)out.push(r.duration);if(r.budget)out.push(r.budget);if(r.city)out.push(r.city);if(r.distance_from_moscow_km!=null)out.push(`${r.distance_from_moscow_km} км от Москвы`);(r.features||[]).slice(0,3).forEach(x=>out.push(x));return [...new Set(out.filter(Boolean))].slice(0,5)}
function renderResult(data){
  const r=data.result,title=r.title||r.name,desc=r.description||r.notes||`${r.type||'Место'} для времени вдвоём.`,meta=buildMeta(r),suggestions=data.suggestions||[];
  $('#wheelCenterTitle').textContent=data.category==='Мини-путешествие'?'МИНИ-ТРИП':data.category.toUpperCase();$('#wheelCenterSub').textContent='✓';
  const card=$('#previewCard');card.classList.remove('is-empty');card.classList.add('has-result');$('#previewCategory').textContent=data.category;$('#previewTitle').textContent=title;$('#previewDescription').textContent=desc;$('#previewMeta').innerHTML=meta.length?meta.map(x=>`<span>${esc(x)}</span>`).join(''):'<span>идея для двоих</span>';
  const place=data.kind==='location'?r:suggestions[0];if(place){$('#previewPlaceName').textContent=place.name||place.title||'';$('#previewPlaceDetails').textContent=[place.city,place.type].filter(Boolean).join(' · ');$('#previewLinks').innerHTML=linkButtons(place.links||[],true);$('#previewPlace').hidden=false}else $('#previewPlace').hidden=true;
  $('#tripRefine').hidden=data.category!=='Мини-путешествие';
  const alternatives=data.kind==='location'?[]:suggestions.slice(place?1:0,3);if(alternatives.length){$('#alternativeList').innerHTML=alternatives.map(x=>{const first=(x.links||[])[0];return`<div class="alternative-row"><strong>${esc(x.name)}</strong>${first?`<a href="${esc(first.url)}" target="_blank" rel="noopener noreferrer">открыть ↗</a>`:''}</div>`}).join('');$('#alternatives').hidden=false}else $('#alternatives').hidden=true;
  $('#previewActions').hidden=false;$('#saveBtn').hidden=false;updateSaveButton();
}
function currentId(){const r=state.current?.result;return r&&(r.slug||r.id||r.source_id||r.name||r.title)}
function getSaved(){try{return JSON.parse(localStorage.getItem('vdvoem_saved')||'[]')}catch{return[]}}
function setSaved(v){localStorage.setItem('vdvoem_saved',JSON.stringify(v));refreshSavedCount()}
function refreshSavedCount(){const c=getSaved().length;$('#savedCount').textContent=c?String(c):''}
function saveCurrent(){if(!state.current)return;const list=getSaved(),r=state.current.result,id=currentId(),idx=list.findIndex(x=>x.id===id);if(idx>=0){list.splice(idx,1);setSaved(list);toast('Убрано из сохранённого')}else{list.unshift({id,title:r.title||r.name,category:state.current.category,description:r.description||r.notes||''});setSaved(list.slice(0,60));toast('Сохранено ♡')}updateSaveButton()}
function updateSaveButton(){const saved=getSaved().some(x=>x.id===currentId()),b=$('#saveBtn');b.classList.toggle('is-saved',saved);b.textContent=saved?'♥':'♡';b.setAttribute('aria-label',saved?'Убрать из сохранённого':'Сохранить идею')}
function openSaved(){const list=getSaved();$('#savedList').innerHTML=list.length?list.map(x=>`<article class="saved-item"><strong>${esc(x.title)}</strong><p>${esc(x.category)}${x.description?' · '+esc(x.description):''}</p><button type="button" data-remove="${esc(x.id)}">удалить</button></article>`).join(''):'<div class="saved-item"><p>Пока пусто. Сохраните идею, к которой хочется вернуться ♡</p></div>';$$('#savedList [data-remove]').forEach(b=>b.addEventListener('click',()=>{setSaved(getSaved().filter(x=>x.id!==b.dataset.remove));openSaved();updateSaveButton()}));$('#savedPanel').hidden=false}
function toast(t){$('#toast').textContent=t;$('#toast').hidden=false;clearTimeout(toast.t);toast.t=setTimeout(()=>$('#toast').hidden=true,2200)}
init().catch(()=>toast('Не удалось загрузить сайт'));
})();
