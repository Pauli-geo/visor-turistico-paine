(()=>{'use strict';const D=window.VISOR_DATA;const map=L.map('map',{zoomControl:false,preferCanvas:true}).setView([-33.835,-70.79],11);L.control.zoom({position:'bottomright'}).addTo(map);L.control.scale({metric:true,imperial:false,position:'bottomright'}).addTo(map);
let BULK_MODE=false;
const ROAD_COLOR='#4D6072';
const CYAN_WATER='#00B6D1';
// Decodificador EPSG:4326 para polilíneas KMZ simplificadas; sin unir tramos con líneas inventadas.
function decodeRuta(linea){
 let lat=0,lon=0,i=0,pts=[];
 while(i<linea.length){
  let r=0,shift=0,b;
  do{b=linea.charCodeAt(i++)-63;r|=(b&31)<<shift;shift+=5;}while(b>=32);
  lat+=(r&1)?~(r>>1):(r>>1);r=0;shift=0;
  do{b=linea.charCodeAt(i++)-63;r|=(b&31)<<shift;shift+=5;}while(b>=32);
  lon+=(r&1)?~(r>>1):(r>>1);
  pts.push([lon/100000,lat/100000]);
 }
 return pts;
}

const baseDefs={osm:'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',sat:'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'};let base=null;const layerMap={};const featureLookup=new Map();let selection=null;
const safe=s=>String(s??'').replace(/[&<>"']/g,a=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[a]));
const nombreCorregido=v=>String(v||'').replace(/\bHuelquen\b/gi,'Huelquén').replace(/\bEl Transito\b/gi,'El Tránsito').replace(/\bPintue\b/gi,'Pintué').replace(/\bHuiticalan\b/gi,'Huiticalán');const n=f=>nombreCorregido(f.properties?.nombre||f.properties?.nombre_corto||f.properties?.LOCALIDAD||f.properties?.NOMBRE||f.properties?.NOMBRE_CAL||'Hito de Paine').replace(/\s*\(tramo turístico base\)/gi,'').trim();
const tituloHito=v=>String(v||'').trim().toLocaleUpperCase('es');
const textoEvocativo=v=>{
 let t=String(v||'').trim();if(!t)return t;
 // Preservar nombres propios; ajustar mayúsculas solo si todo el texto de entrada es mayúsculo.
 if(t.length>18 && !/[a-záéíóúüñ]/u.test(t) && /[A-ZÁÉÍÓÚÜÑ]/u.test(t))t=t.toLocaleLowerCase('es');
 return t.replace(/(^[^\p{L}]*)(\p{L})/u,(_,p,c)=>p+c.toLocaleUpperCase('es'));
};
const hav=(a,b)=>{let rad=Math.PI/180,da=(a[0]-b[0])*rad,db=(a[1]-b[1])*rad,x=Math.sin(da/2)**2+Math.cos(a[0]*rad)*Math.cos(b[0]*rad)*Math.sin(db/2)**2;return (2*6371*Math.atan2(Math.sqrt(x),Math.sqrt(1-x))).toFixed(1)};
const coords=f=>f.geometry?.type==='Point'?[f.geometry.coordinates[1],f.geometry.coordinates[0]]:null;
const pics={
'Estación de Trenes Paine':'imagenes/hitos/estacion_paine.webp',
'Estación de Trenes Hospital':'imagenes/hitos/estacion_hospital.webp',
'Laguna de Aculeo':'imagenes/hitos/laguna_aculeo.webp',
'Municipalidad de Paine':'imagenes/hitos/municipalidad.webp',
'Estadio Municipal Tricolor':'imagenes/hitos/estadio_tricolor.webp',
'Estero Pintué':'imagenes/hitos/estero_pintue.webp',
'Plaza de Armas de Paine':'imagenes/hitos/plaza_armas_usuario.webp',
'Camino Padre Hurtado · G-45-H':'imagenes/hitos/huelquen_maipo_andes_usuario.webp',
'Circuito Maipo Andes / Huelquén–Chada':'imagenes/hitos/huelquen_maipo_andes_usuario.webp'
};
const originCentral='-33.4506,-70.6899',originPaine='-33.81625,-70.7437';
const fotoReferencia=(name,p)=>{
 const assets=window.VISOR_ASSETS||{};
 const editable=(window.FOTOS_HITOS||{})[name];
 if(editable&&editable.archivo)return {url:editable.archivo,note:editable.tipo==='fotografia_del_lugar'?(editable.nota||'Fotografía del lugar'):('Imagen referencial: '+(editable.nota||'entorno de Paine'))};
 if(pics[name])return {url:pics[name],note:''};
 if(p.foto&&/^(imagenes\/|https:\/\/)/.test(p.foto))return {url:p.foto,note:''};
 const original=p.foto||'';
 if(original&&/^(imagenes\/|https:\/\/)/.test(original))return {url:original,note:p.foto_aclaracion||''};
 if(original&&assets[original])return {url:assets[original],note:p.foto_aclaracion||''};
 if(/pintué/i.test(name))return {url:'imagenes/hitos/estero_pintue.webp',note:''};
 if(/laguna de aculeo/i.test(name))return {url:'imagenes/hitos/laguna_aculeo.webp',note:''};
 // Nunca asociar fotografías de lugares diferentes a un hito sin evidencia.
 return {url:'',note:''};
};
const relatoDe=(p,name)=>{
 if(p.relato)return p.relato;
 if(p.LOCALIDAD)return 'Cada localidad guarda huellas de la vida rural y de quienes construyen el presente de Paine. Recorre '+name+' y descubre los caminos y paisajes que la rodean.';
 if(/Estero|Río/i.test(name))return 'Escucha el rumor del agua y sigue la huella de '+name+'. Entre cerros, campos y quebradas, este cauce nos invita a conocer el territorio y a cuidar sus ecosistemas.';
 if(/ferroviaria|tren/i.test(String(p.categoria||'')))return 'Sigue las vías que unieron al valle con Santiago: los viajes, las cosechas y las despedidas dibujaron una historia que aún puedes recorrer.';
 if(/camino|ruta|acceso/i.test(name))return 'Insértate en este camino para descubrir los paisajes, los oficios y la memoria rural de Paine. Cada curva abre una historia distinta del valle.';
 if(/Patrimonio/i.test(String(p.categoria||'')))return 'Conoce este patrimonio de Paine: sus espacios y construcciones permiten acercarnos a las huellas de quienes vivieron, trabajaron y dieron forma a la comuna.';
 if(/alojamiento/i.test(String(p.categoria||'')))return 'Haz una pausa en Paine y permite que sus paisajes marquen el ritmo de tu viaje; consulta previamente las condiciones de atención.';
 return 'Ven a descubrir '+name+': un lugar donde el paisaje y la historia de Paine se encuentran y esperan tu visita.';
};
function popup(f,ly){
 const p=f.properties||{},name=n(f);
 let c=coords(f);
 if(!c&&ly&&typeof ly.getBounds==='function'){const b=ly.getBounds();if(b&&b.isValid()){const ctr=b.getCenter();c=[ctr.lat,ctr.lng]}}
 const photo=fotoReferencia(name,p);
 const photoHtml=photo.url?'<img class="ficha-foto" src="'+safe(photo.url)+'" alt="Imagen turística: '+safe(name)+'" loading="lazy" onerror="this.style.display='+"'none'"+'">':'';
 let html='<div class="ficha">'+photoHtml+'<h3>'+safe(tituloHito(name))+'</h3><div class="meta">'+safe(p.categoria||p.categoria_proteccion||p.AREA_C||'Territorio de Paine')+'</div><p>'+safe(textoEvocativo(relatoDe(p,name)))+'</p>';
 // La ficha pública muestra la fotografía sin leyendas de carácter interno.
 if(p.descripcion&&p.descripcion!==p.relato)html+='<p>'+safe(textoEvocativo(p.descripcion))+'</p>';
 if(p.texto_guia_2025)html+='<details class="ficha-doc"><summary>Conocer más sobre este lugar</summary><p>'+safe(p.texto_guia_2025)+'</p></details>';
 if(p.observaciones&&p.observaciones!==p.descripcion)html+='<p class="meta">'+safe(p.observaciones)+'</p>';
 if(p.LOCALIDAD){const num=v=>Number.isFinite(Number(v))?new Intl.NumberFormat('es-CL').format(v):'—';html+='<p class="meta"><b>Censo 2024:</b> '+num(p.n_per)+' habitantes · '+num(p.n_hombres)+' hombres · '+num(p.n_mujeres)+' mujeres · '+num(p.n_hog)+' hogares</p>'}
 if(p.direccion)html+='<p class="meta"><b>Dirección según catastro:</b> '+safe(p.direccion)+'</p>';
 
 // Créditos y fuentes documentales permanecen en la base maestra, no se repiten en cada popup.
 // La precisión técnica se conserva en GeoJSON, no se muestra al visitante.
 if(c){
  html+='<p class="meta"><b>Distancias en línea recta:</b> Estación Paine '+hav(c,[-33.81625,-70.7437])+' km · Estación Central '+hav(c,[-33.4506,-70.6899])+' km. No son distancias de viaje.</p>';
  const dest=c[0]+','+c[1];
  html+='<div class="buttonlinks"><a target="_blank" rel="noopener" href="https://www.google.com/maps/dir/?api=1&origin='+originCentral+'&destination='+dest+'">Desde Estación Central ↗</a><a target="_blank" rel="noopener" href="https://www.google.com/maps/dir/?api=1&origin='+originPaine+'&destination='+dest+'">Desde Estación Paine ↗</a></div>';
  // La geometría no puntual no necesita nota técnica redundante en la ficha turística.
 }
 const link=p.sitio_web||p.url_oficial||'';
 if(/^https:\/\//.test(link))html+='<div class="buttonlinks"><a href="'+safe(link)+'" target="_blank" rel="noopener">Fuente / más información ↗</a></div>';
 return html+'</div>';
}
let glowHito=null;
function destacarCapa(ly){
 if(!ly)return;
 selected(ly);
 let place=ly.getLatLng?.()||ly.getBounds?.()?.getCenter?.();
 if(!place)return;
 if(glowHito)map.removeLayer(glowHito);
 glowHito=L.marker(place,{interactive:false,zIndexOffset:1000,icon:L.divIcon({className:'selected-hito-icon',html:'<span aria-hidden="true"></span>',iconSize:[54,54],iconAnchor:[27,27]})}).addTo(map);
 if(ly.openPopup)setTimeout(()=>ly.openPopup(),480);
}
function selected(ly){
 if(selection&&selection.setStyle){try{selection.setStyle(selection._normalStyle||{})}catch{}}
 selection=ly;
 if(ly.setStyle){
   ly._normalStyle={color:ly.options.color,weight:ly.options.weight,fillColor:ly.options.fillColor,fillOpacity:ly.options.fillOpacity,radius:ly.options.radius};
   ly.setStyle({color:'#FFCB33',weight:6,fillColor:'#FFFF54',fillOpacity:.8,radius:13});
 }
 let bounds=ly.getBounds?.();
 if(bounds?.isValid())map.flyToBounds(bounds.pad(.15),{maxZoom:16,duration:.6});
 else if(ly.getLatLng)map.flyTo(ly.getLatLng(),16,{duration:.6});
}
function lay(g,style,point){let l=L.geoJSON(g,{style:()=>({...style}),pointToLayer:(f,ll)=>L.circleMarker(ll,{radius:7,color:'#fff',weight:2,fillColor:point||'#932475',fillOpacity:1}),onEachFeature:(f,x)=>{const key=n(f);if(!featureLookup.has(key))featureLookup.set(key,[]);featureLookup.get(key).push(x);x.bindPopup(()=>popup(f,x),{maxWidth:360});x.on('click',()=>{destacarCapa(x);setTimeout(()=>x.openPopup(),650)})}});return l;}
function register(id,name,geo,style,color,visible,target,desc){
 let layer=lay(geo,style,color);layerMap[id]={layer,name,visible,desc};
 const host=document.getElementById(target);
 if(['natureLayers','parksLayers','protectedLayers','mountainsLayers'].includes(target)){
   const box=document.createElement('details');box.className='environment-item';
   const title=document.createElement('summary');title.textContent=name;box.appendChild(title);
   const body=document.createElement('div');body.className='environment-body';
   const label=document.createElement('label');label.className='layer';
   const input=document.createElement('input');input.type='checkbox';input.checked=false;
   label.appendChild(input);label.appendChild(document.createTextNode('Mostrar esta capa'));body.appendChild(label);
   if(desc){const p=document.createElement('p');p.className='layer-desc';p.textContent=desc;body.appendChild(p);}
   const zoom=document.createElement('button');zoom.type='button';zoom.className='zoom';zoom.textContent='⌖ Localizar';body.appendChild(zoom);
   input.addEventListener('change',()=>{input.checked?layer.addTo(map):map.removeLayer(layer);if(input.checked&&!BULK_MODE)zoomLayer(layer);});
   zoom.addEventListener('click',()=>{input.checked=true;layer.addTo(map);zoomLayer(layer);});
   box.appendChild(body);host.appendChild(box);return layer;
 }
 if(['attractionLayers','stationsLayers'].includes(target)){
   const children=layer.getLayers();layer.clearLayers();
   layerMap[id].featureIndex=new Map(children.filter(x=>x.feature?.properties?.id).map(x=>[x.feature.properties.id,x]));
   const outer=document.createElement('details');outer.className='attraction-group';
   const title=document.createElement('summary');title.textContent=name+' · '+children.length+' hitos';outer.appendChild(title);
   const body=document.createElement('div');body.className='attraction-group-body';
   const allLabel=document.createElement('label');allLabel.className='all-toggle';
   const allInput=document.createElement('input');allInput.type='checkbox';allInput.checked=false;
   allLabel.appendChild(allInput);allLabel.appendChild(document.createTextNode('Mostrar todos los hitos de este tema'));body.appendChild(allLabel);
   const entries=[];
   for(const [idx,child] of children.entries()){
     const props=child.feature?.properties||{};
     const titleText=tituloHito(n(child.feature||{properties:{nombre:name}}));
     const item=document.createElement('details');item.className='attraction-entry';
     const summary=document.createElement('summary');summary.textContent=titleText;item.appendChild(summary);
     const panel=document.createElement('div');panel.className='attraction-entry-body';
     const descText=[props.texto_documental,props.texto_guia_2025,props.descripcion,props.descripcion_breve].filter(x=>typeof x==='string'&&x.trim());
     const uniqueDesc=[...new Set(descText)];
     if(uniqueDesc.length){for(const value of uniqueDesc){const para=document.createElement('p');para.textContent=textoEvocativo(value);panel.appendChild(para);}}
     else{const para=document.createElement('p');para.textContent=textoEvocativo(props.relato||'Hito identificado en la cartografía de Paine.');panel.appendChild(para);}
     const label=document.createElement('label');label.className='attraction-toggle';
     const check=document.createElement('input');check.type='checkbox';check.checked=false;
     label.appendChild(check);label.appendChild(document.createTextNode('Mostrar este hito'));panel.appendChild(label);
     const go=document.createElement('button');go.type='button';go.className='zoom';go.textContent='⌖ Ubicar y destacar';panel.appendChild(go);
     const sync=()=>{let count=entries.filter(x=>x.check.checked).length;allInput.checked=count===entries.length;allInput.indeterminate=count>0&&count<entries.length;};
     check.addEventListener('change',()=>{if(check.checked){layer.addLayer(child);layer.addTo(map);}else{layer.removeLayer(child);if(layer.getLayers().length===0)map.removeLayer(layer);}sync();});
     go.addEventListener('click',()=>{check.checked=true;layer.addLayer(child);layer.addTo(map);sync();destacarCapa(child);});
     item.appendChild(panel);body.appendChild(item);entries.push({child,check});
   }
   const setAll=(on,zoom)=>{for(const item of entries){item.check.checked=on;if(on)layer.addLayer(item.child);else layer.removeLayer(item.child);}if(on){layer.addTo(map);if(zoom)zoomLayer(layer);}else map.removeLayer(layer);allInput.checked=on;allInput.indeterminate=false;};
   allInput.addEventListener('change',()=>setAll(allInput.checked,false));
   layerMap[id].activateAll=()=>setAll(true,false);
   layerMap[id].activateChild=child=>{const found=entries.find(e=>e.child===child);if(found){found.check.checked=true;layer.addLayer(child);layer.addTo(map);const n=entries.filter(e=>e.check.checked).length;allInput.checked=n===entries.length;allInput.indeterminate=n>0&&n<entries.length;}};
   outer.appendChild(body);host.appendChild(outer);return layer;
 }
 if(visible)layer.addTo(map);
 let label=document.createElement('label');label.className='layer';
 label.innerHTML='<input type="checkbox" '+(visible?'checked':'')+' aria-label="'+safe(name)+'"><span>'+safe(name)+(desc?'<div class="layer-desc">'+safe(desc)+'</div>':'')+'</span><button class="zoom" title="Ir a capa">⌖</button>';
 host.appendChild(label);
 let ck=label.querySelector('input');ck.addEventListener('change',()=>{if(ck.checked){layer.addTo(map);if(!BULK_MODE)zoomLayer(layer)}else map.removeLayer(layer)});
 label.querySelector('button').addEventListener('click',e=>{e.preventDefault();e.stopPropagation();ck.checked=true;layer.addTo(map);zoomLayer(layer)});
 return layer;
}
// Controles generales para grupos de infraestructura y áreas ambientales.
for(const [controlId,containerId] of [
 ['roadsAll','roadsLayers'],['corridorsAll','corridorLayers'],['natureAll','natureLayers']
]){
 const mainCheck=document.getElementById(controlId),holder=document.getElementById(containerId);
 if(!mainCheck||!holder)continue;
 mainCheck.addEventListener('change',()=>{
  BULK_MODE=true;
  for(const check of holder.querySelectorAll('input[type="checkbox"]')){
   if(check.checked!==mainCheck.checked){check.checked=mainCheck.checked;check.dispatchEvent(new Event('change'));}
  }
  BULK_MODE=false;
 });
 holder.addEventListener('change',()=>{
  const controls=[...holder.querySelectorAll('input[type="checkbox"]')];
  if(!controls.length)return;
  const selected=controls.filter(x=>x.checked).length;
  mainCheck.checked=selected===controls.length;
  mainCheck.indeterminate=selected>0&&selected<controls.length;
 });
}
function zoomLayer(layer){let bounds=layer.getBounds?.();if(bounds?.isValid()){map.flyToBounds(bounds.pad(.12),{duration:.7,maxZoom:14});}else document.getElementById('status').textContent='Este catálogo contiene registros sin coordenadas; consulta las fichas del panel para ubicarlos por su dirección.';}
function filt(g,check){return {...g,features:g.features.filter(check)}};
// Al iniciar solo se muestra el callejero base. El visitante activa las capas temáticas cuando quiera.
const MUNICIPIO_LAT=-33.8077603, MUNICIPIO_LON=-70.7419399;
for(const conjunto of [D.hitos,D.culturales,D.estaciones,D.cmn]){
 for(const feat of conjunto?.features||[]){
  const nombre=String(feat.properties?.nombre||feat.properties?.NOMBRE||'').toLocaleLowerCase('es');
  if(nombre.includes('municipalidad de paine') && feat.geometry?.type==='Point'){
    feat.geometry.coordinates=[MUNICIPIO_LON,MUNICIPIO_LAT];
    feat.properties.fuente_ubicacion='MUNICIPALIDAD DE PAINE.kmz · Turismo.zip (octubre 2026)';
  }
 }
}
// Fotografías originales aportadas por el municipio para las fichas cartográficas.
for(const feat of D.plaza?.features||[]){feat.properties=feat.properties||{};feat.properties.foto='imagenes/hitos/plaza_armas_usuario.webp';}
for(const feat of D.routes?.padre?.features||[]){feat.properties=feat.properties||{};feat.properties.foto='imagenes/hitos/huelquen_maipo_andes_usuario.webp';}
// La red vial principal anterior fue sustituida por el nuevo KMZ de vialidades.
for(const [i,park] of (D.parques?.features||[]).entries()){
 const name=n(park);
 register('parque-prms-'+i,name==='Hito de Paine'?'PARQUE METROPOLITANO '+(i+1):tituloHito(name),
  {type:'FeatureCollection',features:[park]},{color:'#258a5f',weight:2,fillColor:'#67bd89',fillOpacity:.2},null,false,'parksLayers');
}
// Las nuevas áreas PRMS se cargan desde AREAS PRMS.zip, no desde la antigua capa genérica.
register('humedal','Humedal Urbano · Estero Pintué – Laguna de Aculeo – Estero Santa Marta',D.humedal,{color:'#0791be',weight:2.5,fillColor:'#34aaca',fillOpacity:.27},null,false,'hiddenLayers');
// Cada río y estero se sirve en una capa específica desde datos/cauces_paine_individuales.geojson.
register('rail','Red ferroviaria · Paine, Hospital y conexión con Estación Central',D.ferrocarril,{color:'#213d64',weight:3.4,dashArray:'8,5',opacity:.95},null,false,'roadsLayers');
register('train-stops','ESTACIONES PAINE, HOSPITAL Y REFERENCIA ESTACIÓN CENTRAL',D.estaciones,{},'#305b83',false,'stationsLayers');
register('valle','Ruta del Valle del Maipo · Champa–Aculeo–Rangue',D.routes.valle,{color:ROAD_COLOR,weight:4,opacity:.94},null,false,'rutasIzquierda');
register('padre','Ruta de la Montaña y sus Viñas · Camino Padre Hurtado · El Tránsito–Huelquén–Chada',D.routes.padre,{color:ROAD_COLOR,weight:4,opacity:.94},null,false,'rutasIzquierda');
// Los dos nuevos KMZ son la referencia cartográfica única de estos espacios de memoria.
// Evitar el antiguo punto del Memorial y eventuales duplicados de EFE en otras capas.
const esMemoriaActualizada=feat=>{
 const nombre=String(feat.properties?.nombre||feat.properties?.NOMBRE||'').toLocaleLowerCase('es');
 return (/memorial/.test(nombre)&&/paine/.test(nombre))||(/estadio/.test(nombre)&&/ferroviario|\befe\b/.test(nombre));
};
for(const base of [D.hitos,D.culturales,D.cmn]){
 if(Array.isArray(base?.features))base.features=base.features.filter(f=>!esMemoriaActualizada(f));
}
register('attractions','Atractivos naturales y culturales',D.hitos,{},'#8c3990',false,'hiddenLayers');
register('cultural','Centro Cultural, Memorial, Municipalidad y otros hitos',D.culturales,{},'#aa4f5d',false,'hiddenLayers');
register('plaza','Plaza de Armas de Paine · polígono del proyecto',D.plaza,{color:'#b51c80',weight:3,fillColor:'#eaaa4a',fillOpacity:.35},null,false,'hiddenLayers','Ámbito del proyecto municipal de mejoramiento integral');
register('tricolor','Estadio Municipal Tricolor',D.tricolor,{color:'#b92378',weight:2,fillColor:'#ffbfdb',fillOpacity:.32},null,false,'hiddenLayers');
// Dos hitos de memoria añadidos con coordenadas exactas de los KMZ entregados.
window.abrirLugarMemoria=id=>{
 const ref=layerMap['lugares-memoria'];
 const feature=ref?.layer?.getLayers?.().find(ly=>ly.feature?.properties?.id===id)
   ||(ref?.featureIndex?.get(id));
 if(!feature){document.getElementById('status').textContent='Cargando los lugares de memoria. Intenta nuevamente.';return;}
 ref.activateChild?.(feature);
 const point=feature.getLatLng?.();
 if(point)map.flyTo(point,16,{duration:.65});
 destacarCapa(feature);
 for(const el of document.querySelectorAll('#attractionLayers .attraction-group')){
  if(el.querySelector('summary')?.textContent?.includes('Lugares de memoria y derechos humanos'))el.open=true;
 }
};
fetch('datos/lugares_memoria_paine_2026.geojson',{cache:'no-store'})
.then(r=>r.ok?r.json():Promise.reject(Error('Archivo de lugares de memoria no disponible')))
.then(g=>{
 if(g.features?.length!==2)throw Error('Se esperaban dos puntos de memoria');
 register('lugares-memoria','Lugares de memoria y derechos humanos',g,{},'#66236f',false,'attractionLayers');
})
.catch(err=>{console.warn('Lugares de memoria:',err);document.getElementById('status').textContent='No se pudieron cargar los hitos de memoria: '+err.message;});
register('cmn','Monumentos Nacionales · CMN',D.cmn,{},'#c37b2e',false,'hiddenLayers');
register('lodgings','Alojamientos · Paine 2025',D.alojamientos,{},'#598447',false,'hiddenLayers');
register('catastro','Catastro Territorial de Atractivos y Lugares de Interés Turístico · diciembre 2025',D.catastro,{},'#91664e',false,'hiddenLayers');
register('architecture','Patrimonio arquitectónico · PRC 2013',D.patrimonio,{},'#704b4b',false,'hiddenLayers');
register('limites','Áreas urbanas PRC',D.areas,{color:'#ba4494',weight:2,fillColor:'#fff5c2',fillOpacity:.07},null,false,'hiddenLayers');
// Localidades censales en una capa informativa separada de áreas urbanas y límite administrativo.
fetch('datos/localidades_censo_2024.geojson',{cache:'no-store'})
 .then(r=>r.ok?r.json():Promise.reject(Error('Capa de localidades no disponible')))
 .then(gj=>register('localidades','40 localidades · Censo 2024',gj,{color:'#2f826a',weight:2,fillColor:'#68b9a1',fillOpacity:.14},null,false,'localityLayers','Polígonos censales; no corresponden al límite comunal'))
 .catch(err=>{console.warn(err);document.getElementById('localityLayers').textContent='No fue posible cargar esta capa. Inténtalo nuevamente.'});

// Vialidades originales reunidas por rol. Una capa por camino; misma simbología institucional.
fetch('datos/vialidades_kmz_unificadas_polyline.json',{cache:'no-store'})
.then(r=>r.ok?r.json():Promise.reject(Error('No se pudo cargar vialidades KMZ')))
.then(data=>{
 for(const [rol,segments] of Object.entries(data.polylines||{})){
  // Se conserva la Ruta 5 dentro del conjunto vial, sin añadir trazados base duplicados.
  const label=rol==='G-555'?'Ruta cerros camino a Angostura':rol==='G-500'?'Ruta Camino Abrantes-Peralillo':rol==='G-45-H'?'Camino Padre Hurtado · G-45-H':rol==='Ruta 79'?'Acceso Sur · Ruta 79':rol;
  const f={type:'Feature',properties:{id:'VIAL-'+rol,nombre:label,categoria:'Vías consolidadas',rol,fuente:'VIALIDADES (2).zip'},geometry:{type:'MultiLineString',coordinates:segments.map(decodeRuta)}};
  if(rol==='Ruta 5'||rol==='G-45-H'){
   // Conservadas al activar toda la red vial, pero sin capa individual repetida.
   const hidden=lay({type:'FeatureCollection',features:[f]},{color:ROAD_COLOR,weight:3.4,opacity:.94});
   const all=document.getElementById('roadsAll');
   all?.addEventListener('change',()=>all.checked?hidden.addTo(map):map.removeLayer(hidden));
  }else register('via-'+rol,label,{type:'FeatureCollection',features:[f]},{color:ROAD_COLOR,weight:3.4,opacity:.94},null,false,'roadsLayers');
 }
})
.catch(err=>{console.warn('Vialidades KMZ:',err);const el=document.getElementById('roadsLayers');if(el)el.textContent='No se pudieron cargar los caminos. Actualiza la página.'});
// Cinco áreas del Plan Regulador Metropolitano de Santiago, desde los KMZ/KML aportados.
// Geometrías visuales generalizadas: consultar KML originales para los deslindes oficiales.
const PRMS_AREAS={
 'PRMS-ACULEO-VALLE':{
 nombre:'Área de Protección Ecológica con Desarrollo Controlado - P. E. D. C. 6 Laguna de Aculeo Valle',
 grupo:'protectedLayers',color:'#2b8c77',
 descripcion:'Corresponde a un área de interés turístico - paisajístico emplazado en la comuna de Paine, en la cual, por encontrarse dentro de un área legalmente protegida por el Ministerio de Agricultura, se deberá cautelar y reforzar el valor ambiental, turístico y paisajístico de su entorno. Comprende el territorio que se encuentra emplazado a partir del borde de la Laguna de Aculeo, hasta la cota 400 m.s.n.m.'},
 'PRMS-PIE-DE-MONTE':{
 nombre:'Área de Protección Ecológica con Desarrollo Controlado - P. E. D. C. 6 Laguna de Aculeo Pie de Monte',
 grupo:'protectedLayers',color:'#397e59',
 descripcion:'Corresponde a un área de interés turístico - paisajístico emplazado en la comuna de Paine, en la cual, por encontrarse dentro de un área legalmente protegida por el Ministerio de Agricultura, se deberá cautelar y reforzar el valor ambiental, turístico y paisajístico de su entorno. Comprende el territorio emplazado sobre la cota 400 m.s.n.m., hasta la cota 600 m.s.n.m.'},
 'PRMS-LA-VACADA':{
 nombre:'Área de Protección Prioritaria La Vacada de Huelquén',
 grupo:'protectedLayers',color:'#648c42',
 descripcion:'Área de Protección de Ecosistemas Vegetacionales. Cordillera Andina, sector Estero El Escorial (contiguo a la Reserva Nacional El Clarillo).'},
 'PRMS-CANTILLANA':{
 nombre:'Área de Protección Prioritaria: Área de Conservación de Fauna Silvestre Sector Cantillana',
 grupo:'protectedLayers',color:'#456d70',
 descripcion:'Área de Protección de Ecosistemas Faunísticos; prohibida de caza, controlada por S.A.G. RM.'},
 'PRMS-CORDONES':{
 nombre:'Cordones Montañosos',
 grupo:'mountainsLayers',color:'#837c54',
 descripcion:'Área donde se propende a mantener y conservar las características del entorno natural e incrementar los valores paisajísticos, los recursos naturales y ambientales.'}
};
fetch('datos/prms_areas_kmz_polyline.json',{cache:'no-store'})
.then(r=>r.ok?r.json():Promise.reject(Error('No fue posible cargar áreas PRMS')))
.then(g=>{
 for(const [id,encoded] of Object.entries(g.polylines||{})){
  const meta=PRMS_AREAS[id];if(!meta)continue;
  const ring=decodeRuta(encoded);
  const f={type:'Feature',properties:{id,nombre:meta.nombre,descripcion:meta.descripcion,fuente:'AREAS PRMS.zip',precision:'Geometría generalizada para el mapa web'},geometry:{type:'Polygon',coordinates:[ring]}};
  register('area-'+id,meta.nombre,{type:'FeatureCollection',features:[f]},{color:meta.color,weight:2,fillColor:meta.color,fillOpacity:.14},null,false,meta.grupo,meta.descripcion);
 }
})
.catch(err=>console.warn('Áreas PRMS:',err));
// Nuevos puntos georreferenciados del KMZ turístico 2026. Se agrupan por tipo, no se mezclan con el catastro sin coordenadas.
const kmzGrupos=[
 {key:'alojamiento',cat:'ALOJAMIENTOS',label:'ALOJAMIENTOS',color:'#5b874c'},
 {key:'cafeterias',cat:'CAFETERIAS Y PASTELERIAS-PANADERIAS',label:'CAFETERÍAS, PASTELERÍAS Y PANADERÍAS',color:'#b58251'},
 {key:'restaurantes',cat:'RESTORANES, RESTAURANES Y BARES',label:'RESTAURANTES Y BARES',color:'#9a6645'},
 {key:'cervecerias',cat:'CERVECERÍAS',label:'CERVECERÍAS',color:'#916b3a'},
 {key:'camping',cat:'CAMPING',label:'CAMPING',color:'#668a51'},
 {key:'eventos',cat:'CENTROS DE EVENTOS',label:'CENTROS DE EVENTOS',color:'#ad734e'},
 {key:'vinas',cat:'VIÑAS',label:'VIÑAS',color:'#8a5998'},
 {key:'emprendimientos',cat:'EMPRENDIMIENTOS',label:'EMPRENDIMIENTOS',color:'#a87a5b'},
 {key:'apr',cat:'APR',label:'APR',color:'#4193aa'},
 {key:'iglesias',cat:'IGLESIAS',label:'IGLESIAS',color:'#86749d'},
 {key:'cementerios',cat:'CEMENTERIOS',label:'CEMENTERIOS',color:'#748793'},
 {key:'cultural',cat:'PATRIMONIO CULTURAL',label:'PATRIMONIO CULTURAL',color:'#934e7e'},
 {key:'natural',cat:'PATRIMONIO NATURAL - ECOLÓGICO',label:'PATRIMONIO NATURAL - ECOLÓGICO',color:'#4c8f68'}
];

// KMZ: temas desplegables, casilla "Mostrar todos" y casilla propia para cada hito.
const kmzById=new Map(),kmzCategoryActions=new Map();
window.abrirHitoKmz=id=>{
 const item=kmzById.get(id);
 if(!item)return;
 item.check.checked=true;
 item.layer.addTo(map);
 item.sync();
 destacarCapa(item.marker);
 const point=item.marker.getLatLng();
 map.flyTo(point,16,{duration:.55});
 setTimeout(()=>item.marker.openPopup(),650);
};
function buildKmzCaseIndex(g,groups){
 const host=document.getElementById('kmzIndex');if(!host)return;
 host.textContent='';
 const input=document.createElement('input');input.className='search';input.type='search';
 input.placeholder='Buscar un hito por nombre';input.setAttribute('aria-label','Buscar hito turístico');
 host.appendChild(input);
 const sets=document.createElement('div');sets.className='kmz-case-groups';host.appendChild(sets);
 const nodes=[];
 for(const group of groups){
  const groupF=g.features.filter(f=>f.properties?.categoria===group.cat&&f.geometry?.type==='Point').sort((a,b)=>String(a.properties.nombre).localeCompare(String(b.properties.nombre),'es'));
  if(!groupF.length)continue;
  const groupEl=document.createElement('details');groupEl.className='kmz-case-group';
  const heading=document.createElement('summary');heading.textContent=group.label+' · '+groupF.length+' lugares';groupEl.appendChild(heading);
  const groupContent=document.createElement('div');groupContent.className='kmz-case-items';
  const checkAllRow=document.createElement('label');checkAllRow.className='all-toggle';
  const checkAll=document.createElement('input');checkAll.type='checkbox';checkAll.checked=false;
  checkAllRow.appendChild(checkAll);checkAllRow.appendChild(document.createTextNode('Mostrar todos los hitos del tema'));
  groupContent.appendChild(checkAllRow);
  const entries=[];
  const sync=()=>{const selectedCount=entries.filter(x=>x.check.checked).length;checkAll.checked=entries.length>0&&selectedCount===entries.length;checkAll.indeterminate=selectedCount>0&&selectedCount<entries.length;};
  for(const f of groupF){
   const p=f.properties||{};if(!p.id)continue;
   const item=document.createElement('details');item.className='kmz-case-entry';
   const summary=document.createElement('summary');summary.textContent=tituloHito(p.nombre||'Lugar sin nombre');item.appendChild(summary);
   const body=document.createElement('div');body.className='kmz-case-body';
   const paragraphs=[p.texto_guia_2025,p.texto_documental,p.descripcion].filter(x=>typeof x==='string'&&x.trim());
   if(!paragraphs.length&&p.relato)paragraphs.push(p.relato);
   for(const paraText of [...new Set(paragraphs)]){const descr=document.createElement('p');descr.textContent=textoEvocativo(paraText);body.appendChild(descr);}
   const oneRow=document.createElement('label');oneRow.className='attraction-toggle';
   const check=document.createElement('input');check.type='checkbox';check.checked=false;
   oneRow.appendChild(check);oneRow.appendChild(document.createTextNode('Mostrar este hito'));body.appendChild(oneRow);
   const spot=lay({type:'FeatureCollection',features:[f]},{},group.color);
   const marker=spot.getLayers()[0];
   check.addEventListener('change',()=>{if(check.checked)spot.addTo(map);else map.removeLayer(spot);sync();});
   const go=document.createElement('button');go.type='button';go.className='btn';go.textContent='⌖ Ubicar y destacar';
   go.addEventListener('click',()=>window.abrirHitoKmz(p.id));body.appendChild(go);
   item.appendChild(body);groupContent.appendChild(item);
   const entry={check,layer:spot,marker,sync,feature:f};
   entries.push(entry);kmzById.set(p.id,entry);
   nodes.push({el:item,groupEl,term:(p.nombre+' '+p.categoria+' '+paragraphs.join(' ')).toLocaleLowerCase('es')});
  }
  const setAll=on=>{for(const item of entries){item.check.checked=on;if(on)item.layer.addTo(map);else map.removeLayer(item.layer);}sync();};
  checkAll.addEventListener('change',()=>setAll(checkAll.checked));
  kmzCategoryActions.set(group.key,{setAll,entries,groupEl});
  groupEl.appendChild(groupContent);sets.appendChild(groupEl);
 }
 input.addEventListener('input',()=>{
  const term=input.value.trim().toLocaleLowerCase('es');
  for(const n of nodes)n.el.hidden=!!term&&!n.term.includes(term);
  for(const groupEl of sets.children){
   const matches=[...groupEl.querySelectorAll('.kmz-case-entry')].some(el=>!el.hidden);
   groupEl.hidden=!matches;if(term&&matches)groupEl.open=true;
  }
 });
}
window.mostrarKmz=key=>{
 const item=kmzCategoryActions.get(key);
 if(!item){document.getElementById('status').textContent='La lista de hitos está cargándose.';return;}
 item.setAll(true);item.groupEl.open=true;
 let bounds=L.latLngBounds(item.entries.map(x=>x.marker.getLatLng()));if(bounds.isValid())map.flyToBounds(bounds.pad(.14),{maxZoom:14});
};

// 119 puntos georreferenciados del ZIP más reciente, asociados a las 13 clases del Excel.
async function descargarInventarioKmz(){
 const [raw,previous]=await Promise.all([
  fetch('datos/atractivos_2026_kmz_puntos.gzip.b64',{cache:'no-store'}).then(r=>r.ok?r.text():Promise.reject(Error('Datos nuevos no disponibles'))),
  fetch('datos/hitos_kmz_2026.geojson',{cache:'no-store'}).then(r=>r.ok?r.json():({features:[]})).catch(()=>({features:[]}))
 ]);
 const bytes=Uint8Array.from(atob(raw.trim()),c=>c.charCodeAt(0));
 const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
 const rows=JSON.parse(await new Response(stream).text());
 const simple=s=>String(s||'').toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
 const originals=new Map();
 for(const feature of previous.features||[]){
  const p=feature.properties||{};
  for(const n of [p.nombre,p.archivo_kmz?.replace(/\.kmz$/i,'')]){
   if(n)originals.set(simple(n),p);
  }
 }
 const features=rows.filter(r=>!/(MEMORIAL PAINE|ESTADIO FERROVIARIO PAINE)/.test(r[0])).map(([nombre,lat,lon,categoria],i)=>{
  const original=originals.get(simple(nombre))||{};
  return {type:'Feature',geometry:{type:'Point',coordinates:[lon,lat]},
   properties:{...original,id:'KMZ-2026-'+i,nombre,categoria:kmzGrupos[categoria]?.cat||'PATRIMONIO CULTURAL',
     fuente:'ATRACTIVOS TURISTICOS.zip',archivo_kmz:nombre+'.kmz'}};
 });
 buildKmzCaseIndex({type:'FeatureCollection',features},kmzGrupos);
 const info=document.getElementById('kmzInfo');
 if(info)info.textContent=rows.length+' hitos puntuales georreferenciados en el nuevo ZIP, agrupados por 13 categorías. Se omiten los marcadores duplicados del Memorial y Estadio EFE, que tienen sus propias fichas.';
}
descargarInventarioKmz().catch(err=>{
 console.warn('Inventario del nuevo ZIP:',err);
 const info=document.getElementById('kmzInfo');if(info)info.textContent='El catálogo no pudo cargarse. Actualiza la página.';
});
fetch('datos/reserva_el_ajial_kmz.geojson',{cache:'no-store'})
.then(r=>r.ok?r.json():Promise.reject(Error('No disponible')))
.then(g=>register('ajial','El Ajial · área natural',g,{color:'#218565',weight:2.5,fillColor:'#98cca3',fillOpacity:.19},null,false,'natureLayers'))
.catch(err=>console.warn('No se cargó reserva El Ajial',err));

// Capa hidrográfica interpretativa: textos completos a la izquierda; lectura geográfica y controles a la derecha.
const hydroColors=Array(10).fill(CYAN_WATER);
const hydroList=document.getElementById('hydroLayers'),poems=document.getElementById('hydroPoetry');
const hydroAll=document.getElementById('hydroAll');
if(hydroAll)hydroAll.addEventListener('change',()=>{BULK_MODE=true;for(const x of document.querySelectorAll('#hydroLayers .water-label input')){if(x.checked!==hydroAll.checked){x.checked=hydroAll.checked;x.dispatchEvent(new Event('change'));}}BULK_MODE=false;});
const syncAllHydro=()=>{const a=[...document.querySelectorAll('#hydroLayers .water-label input')];if(!hydroAll||!a.length)return;const n=a.filter(x=>x.checked).length;hydroAll.checked=n===a.length;hydroAll.indeterminate=n>0&&n<a.length;};
window.abrirCauces=()=>{
 const panel=document.getElementById('hydroLeftSection');
 if(panel){panel.open=true;document.getElementById('left').classList.add('mobile-open');panel.scrollIntoView({block:'nearest',behavior:'smooth'});}
};
window.verCauce=(id)=>{
 const key='hidro-'+id,entry=layerMap[key];
 if(!entry){document.getElementById('status').textContent='La ficha de este estero todavía se está cargando.';return;}
 const section=document.getElementById('hydroLeftSection');
 if(section)section.open=true;
 const item=document.getElementById('hydro-item-'+id);
 if(item)item.open=true;
 const input=document.getElementById('hydro-check-'+id);
 if(input)input.checked=true;
 syncAllHydro();
 entry.layer.addTo(map);
 zoomLayer(entry.layer);
};
fetch('datos/cauces_paine_individuales.geojson',{cache:'no-store'})
.then(r=>r.ok?r.json():Promise.reject(Error('No se descargaron los cauces')))
.then(g=>{
  if(!g.cauces?.length||!g.features?.length)throw Error('La capa de cauces está vacía');
  for(const [i,item] of g.cauces.entries()){
    const collection={type:'FeatureCollection',features:g.features.filter(f=>f.properties?.id===item.id)};
    if(!collection.features.length)continue;
    const color=hydroColors[i%hydroColors.length];
    const style={color,weight:4,opacity:.98};
    const layer=lay(collection,style);
    layerMap['hidro-'+item.id]={layer,name:item.nombre,visible:false,desc:item.descripcion_geo};
    // El panel izquierdo conserva la voz narrativa; la ficha derecha NO la repite.
    const tale=document.createElement('details');tale.className='relato-cauce';
    const title=document.createElement('summary');title.textContent=tituloHito(item.nombre);tale.appendChild(title);
    const paragraph=document.createElement('p');paragraph.className='poema-cauce';paragraph.textContent=textoEvocativo(item.relato);tale.appendChild(paragraph);
    const b=document.createElement('button');b.className='btn';b.textContent='Ver este cauce en el mapa';b.addEventListener('click',()=>window.verCauce(item.id));tale.appendChild(b);
    poems?.appendChild(tale);
    // Acordeón anidado de la leyenda: una ficha geográfica individual y un interruptor explícito.
    const detail=document.createElement('details');detail.className='water-course';detail.id='hydro-item-'+item.id;
    const summary=document.createElement('summary');summary.textContent=tituloHito(item.nombre);summary.style.borderLeft='5px solid '+color;detail.appendChild(summary);
    const body=document.createElement('div');body.className='water-body';
    const geographic=document.createElement('p');geographic.textContent=item.descripcion_geo;body.appendChild(geographic);
    const context=document.createElement('small');context.textContent=item.region;context.className='water-region';body.appendChild(context);
    const controls=document.createElement('div');controls.className='water-controls';
    const label=document.createElement('label');label.className='water-label';
    const check=document.createElement('input');check.type='checkbox';check.id='hydro-check-'+item.id;check.checked=false;
    check.addEventListener('change',()=>{if(check.checked){layer.addTo(map);if(!BULK_MODE)zoomLayer(layer);}else{map.removeLayer(layer)}syncAllHydro();});
    label.appendChild(check);label.appendChild(document.createTextNode('Mostrar en el mapa'));
    const zoom=document.createElement('button');zoom.className='zoom';zoom.type='button';zoom.textContent='⌖ Acercar';zoom.addEventListener('click',()=>window.verCauce(item.id));
    controls.appendChild(label);controls.appendChild(zoom);body.appendChild(controls);detail.appendChild(body);hydroList.appendChild(detail);
  }
  const summary=document.getElementById('hydroCount');
  if(summary)summary.textContent=g.cauces.length+' cursos identificados · despliega cada uno para leer su recorrido y elegir qué mostrar.';
  syncAllHydro();
})
.catch(err=>{console.warn('Cauces separados:',err);if(hydroList)hydroList.textContent='No se pudieron cargar los cursos de agua. Actualiza la página.';});
const captions={'Paine Centro':'Entre la estación, las casonas y los encuentros cotidianos, el corazón de la comuna cuenta su historia.','Champa - Hospital':'La vida de campo en torno al río Angostura, donde el tren y las sandías acompañaron el paso de generaciones.','Pintue':'El valle de Aculeo a los pies del Cordón de Cantillana: la memoria del agua y el paisaje se encuentran aquí.','El Transito':'El camino hacia la precordillera abre puertas a antiguas haciendas, viñas y tradiciones.','Huelquen':'Huelquén enlaza los caminos de Padre Hurtado con la vida rural, las viñas y los cerros de El Ajial.','Chada':'El paso entre valles y montañas, una puerta de caminos y memorias de la Independencia.'};
D.areas.features.forEach((f,i)=>{let name=nombreCorregido(f.properties.nombre_corto),id='urban'+i;let layer=lay({type:'FeatureCollection',features:[f]},{color:'#cb3e86',weight:3,fillColor:'#f9da81',fillOpacity:.16});layerMap[id]={layer,name};let el=document.createElement('label');el.className='listing';el.innerHTML='<input type="checkbox"><div class="body"><strong>'+safe(name)+'</strong><small>'+safe(captions[name]||'Una localidad para recorrer y descubrir.')+'</small></div><button class="go" title="Ir al área urbana">↗</button>';document.getElementById('urbanList').appendChild(el);el.querySelector('input').onchange=e=>e.target.checked?layer.addTo(map):map.removeLayer(layer);const jump=()=>{layer.addTo(map);el.querySelector('input').checked=true;zoomLayer(layer);layer.bringToFront()};el.querySelector('button').onclick=jump;el.querySelector('.body').onclick=jump;});
// Additional verified road classes, selectable individually
let kinds=[['Ruta 5 Sur',/RUTA 5|PANAMERICANA|LONGITUDINAL/],['Acceso Sur',/ACCESO SUR/],['Padre Hurtado',/PADRE HURTADO|G-45/],['Camino a Chada',/CHADA|G-515/],['Champa–Hospital',/CHAMPA|HOSPITAL|G-546/],['Pintué–Rangue',/PINTU|RANGUE|G-54/]];
kinds.forEach(([name,re],i)=>{let g=filt(D.roads,f=>re.test(String(f.properties.NOMBRE_CAL||'')+' '+String(f.properties.LOCALIDAD||'')));if(g.features.length)register('road'+i,name,g,{color:ROAD_COLOR,weight:3,opacity:.92},null,false,'roadsLayers')});
function setBase(type){
 if(base){map.removeLayer(base);base=null}
 const url=baseDefs[type];
 if(!url)return;
 base=L.tileLayer(url,{maxZoom:18,attribution:type==='sat'?'© Esri':'© OpenStreetMap contributors',subdomains:'abc'});
 base.addTo(map);base.bringToBack();
 let errors=0;const selectedType=type;
 base.on('tileerror',()=>{
   if(++errors===5){
     document.getElementById('status').textContent='El servicio de '+(selectedType==='sat'?'satélite':'calles')+' no responde. Las capas municipales siguen disponibles; puedes elegir el otro mapa de fondo.';
   }
 });
}
document.querySelectorAll('input[name="base"]').forEach(i=>i.onchange=()=>setBase(i.value));
document.querySelector('input[name="base"][value="osm"]').checked=true;setBase('osm');
window.toggleAndFocus=id=>{let v=layerMap[id];if(!v)return;if(v.activateAll)v.activateAll();v.layer.addTo(map);zoomLayer(v.layer);document.querySelectorAll('label.layer').forEach(el=>{if(el.textContent.includes(v.name))el.querySelector('input').checked=true});if(['plaza','padre','valle','humedal'].includes(id)){const first=v.layer.getLayers?.()[0];if(first)destacarCapa(first);}};
window.focusPoint=(lat,lon,z,name)=>{
 if(String(name).toLowerCase().includes('municipalidad de paine')){lat=MUNICIPIO_LAT;lon=MUNICIPIO_LON;}
 const layers=featureLookup.get(nombreCorregido(name))||[];
 const target=layers.find(x=>x.getLatLng&&x.getLatLng().distanceTo(L.latLng(lat,lon))<120)||layers[0];
 if(target){
   for(const item of Object.values(layerMap)){
     if(item.activateChild&&item.layer?.getLayers){item.activateChild(target);}
     else if(item.layer?.hasLayer?.(target)&&!map.hasLayer(item.layer)){item.layer.addTo(map);}
   }
   map.flyTo([lat,lon],z,{duration:.6});
   destacarCapa(target);setTimeout(()=>target.openPopup(),650);
   return;
 }
 const point={type:'Feature',geometry:{type:'Point',coordinates:[lon,lat]},properties:{nombre:name,categoria:'Hito turístico',relato:'Descubre este lugar en el paisaje de Paine, sus historias y sus caminos.'}};
 const marker=L.circleMarker([lat,lon],{radius:9,fillColor:'#f7bf3b',color:'#b51c80',fillOpacity:1}).addTo(map);
 destacarCapa(marker);
 marker.bindPopup(()=>popup(point,marker),{maxWidth:360});
 map.flyTo([lat,lon],z,{duration:.6});setTimeout(()=>marker.openPopup(),650);
};
window.togglePanel=id=>{for(let el of document.querySelectorAll('aside'))if(el.id!==id)el.classList.remove('mobile-open');document.getElementById(id).classList.toggle('mobile-open')};
function listCatalog(key,container){let arr=D[key].features,unlocated=arr.filter(f=>!f.geometry);if(!unlocated.length)return;let box=document.getElementById(container);box.insertAdjacentHTML('beforeend','<p class="empty">'+unlocated.length+' registros del documento no cuentan aún con coordenadas verificadas. Están disponibles para consulta por dirección, sin marcador inventado.</p><input class="search" placeholder="Buscar por nombre o dirección"><div class="catalogItems"></div>');let input=box.querySelector('.search'),target=box.querySelector('.catalogItems');function render(){target.innerHTML='';let value=input.value.toLowerCase();for(let f of unlocated.filter(f=>JSON.stringify(f.properties).toLowerCase().includes(value)).slice(0,30)){let p=f.properties;let item=document.createElement('div');item.className='item';item.innerHTML='<b>'+safe(p.nombre)+'</b><br>'+safe(p.direccion||'Dirección pendiente')+'<br><a class="link" href="https://www.google.com/maps/search/?api=1&query='+encodeURIComponent((p.nombre||'')+' '+(p.direccion||'')+' Paine Chile')+'" target="_blank">Buscar dirección ↗</a>';target.appendChild(item)}}input.oninput=render;render()}
listCatalog('catastro','catalogLayers');listCatalog('patrimonio','archLayers');listCatalog('alojamientos','lodgingLayers');
// Límite comunal: nunca se sustituye por un límite inferido de áreas urbanas.
const contorno=document.getElementById('roadsLayers');
const estadoLim=document.createElement('div');estadoLim.className='notice';
estadoLim.textContent='Límite comunal: pendiente de incorporar geometría municipal corregida. Se retiró la delimitación externa incorrecta.';
contorno.prepend(estadoLim);
fetch('datos/limite_comunal_paine.geojson',{cache:'no-store'}).then(r=>r.ok?r.json():Promise.reject(Error('Capa oficial pendiente')))
 .then(geo=>{
    if(!geo.features||!geo.features.length)throw Error('Sin geometrías');
    estadoLim.remove();
    register('limite-comunal','Límite comunal Paine',geo,{color:'#e12f80',weight:3,fillOpacity:0,dashArray:'8,5'},null,false,'boundaryLayers');
 })
 .catch(()=>{});
})();