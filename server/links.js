function cleanUrl(value){
  const raw=String(value||'').trim();
  if(!raw) return null;
  if(/^https?:\/\//i.test(raw)) return raw;
  if(/^www\./i.test(raw)) return `https://${raw}`;
  if(/^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(raw)) return `https://${raw}`;
  return null;
}
function officialUrl(location){
  const tags=location.osm_tags||{};
  return cleanUrl(
    location.website || location.official_url ||
    tags.website || tags['contact:website'] || tags.url || tags['contact:url']
  );
}
function query(location){
  return [location.name, location.address, location.city].filter(Boolean).join(', ');
}
function buildLocationLinks(location){
  if(!location) return [];
  const links=[];
  const official=officialUrl(location);
  if(official) links.push({id:'website',label:'сайт',url:official});
  const source=cleanUrl(location.source);
  if(source && location.source_kind!=='openstreetmap' && source!==official) links.push({id:'source',label:'о месте',url:source});
  const q=encodeURIComponent(query(location));
  const c=location.coordinates||{};
  const hasCoords=Number.isFinite(c.lat)&&Number.isFinite(c.lon);
  links.push({id:'yandex',label:'Яндекс Карты',url:`https://yandex.ru/maps/?text=${q}`});
  links.push({id:'2gis',label:'2ГИС',url:`https://2gis.ru/search/${q}`});
  links.push({id:'google',label:'Google Maps',url:hasCoords
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${c.lat},${c.lon}`)}`
    : `https://www.google.com/maps/search/?api=1&query=${q}`});
  const osm = location.source_kind==='openstreetmap' && /^https?:\/\//.test(String(location.source||''))
    ? location.source
    : hasCoords ? `https://www.openstreetmap.org/?mlat=${c.lat}&mlon=${c.lon}#map=16/${c.lat}/${c.lon}` : null;
  if(osm) links.push({id:'osm',label:'OSM',url:osm});
  return links;
}
module.exports={buildLocationLinks,officialUrl};
