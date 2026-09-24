const fs=require('fs');const path=require('path');
const ROOT=path.join(__dirname,'..','data');
function read(p,fallback=null){try{return JSON.parse(fs.readFileSync(p,'utf8'))}catch{return fallback}}
function loadCatalog(){
 const ideas=read(path.join(ROOT,'core','ideas.json'),{ideas:[]}).ideas||[];
 const ui=read(path.join(ROOT,'ui.json'),{});
 const cityRegistry=read(path.join(ROOT,'russia-cities.json'),{cities:[]});
 const marketDir=path.join(ROOT,'markets'),markets=[],locations=[];
 for(const file of fs.readdirSync(marketDir).filter(f=>f.endsWith('.json')&&!f.startsWith('_'))){const data=read(path.join(marketDir,file),{});if(data.market?.enabled===false)continue;markets.push(data.market);for(const l of data.locations||[])locations.push({...l,market_id:l.market_id||data.market.id});}
 const cityDir=path.join(ROOT,'city-locations'); if(fs.existsSync(cityDir))for(const file of fs.readdirSync(cityDir).filter(f=>f.endsWith('.json'))){const cityId=file.replace(/\.json$/,'');const data=read(path.join(cityDir,file),{});for(const l of data.locations||[])if(l.status!=='inactive-auto')locations.push({...l,city_id:cityId,market_id:`city:${cityId}`});}
 const regionDir=path.join(ROOT,'region-locations'); if(fs.existsSync(regionDir))for(const file of fs.readdirSync(regionDir).filter(f=>f.endsWith('.json'))){const data=read(path.join(regionDir,file),{});for(const l of data.locations||[])if(l.status!=='inactive-auto')locations.push({...l,region_scope:l.region_scope||l.region,market_id:`region:${file.replace(/\.json$/,'')}`});}
 return {ideas,ui,markets,locations,cities:cityRegistry.cities||[],cityMeta:cityRegistry.meta||{}};
}
module.exports={loadCatalog};
