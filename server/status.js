const fs=require('fs'),path=require('path');
const DATA=path.join(__dirname,'..','data');
function read(p,f={}){try{return JSON.parse(fs.readFileSync(p,'utf8'))}catch{return f}}
function status(){const reg=read(path.join(DATA,'russia-cities.json'),{cities:[],meta:{}}),state=read(path.join(DATA,'sync-state.json'),{}),cityDir=path.join(DATA,'city-locations'),regionDir=path.join(DATA,'region-locations');let cityFiles=0,regionFiles=0,autoLocations=0,inactive=0;
 for(const dir of [cityDir,regionDir])if(fs.existsSync(dir))for(const f of fs.readdirSync(dir).filter(x=>x.endsWith('.json'))){dir===cityDir?cityFiles++:regionFiles++;const d=read(path.join(dir,f),{});for(const l of d.locations||[]){if(l.status==='inactive-auto')inactive++;else autoLocations++;}}
 return {cities_in_registry:reg.cities?.length||0,cities_with_synced_locations:cityFiles,regions_with_specialty_sync:regionFiles,auto_locations_active:autoLocations,auto_locations_inactive:inactive,last_rotation_sync:state.updated_at||null,city_cursor:state.city_cursor||0,region_cursor:state.region_cursor||0,city_registry_generated_at:reg.meta?.generated_at||null};}
module.exports={status};
