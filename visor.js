(()=>{'use strict';const D=window.VISOR_DATA;const map=L.map('map',{zoomControl:false,preferCanvas:true}).setView([-33.835,-70.79],11);L.control.zoom({position:'bottomright'}).addTo(map);L.control.scale({metric:true,imperial:false,position:'bottomright'}).addTo(map);
const baseDefs={osm:'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',sat:'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'};let base=null;const layerMap={};const featureLookup=new Map();let selection=null;
const safe=s=>String(s??'').replace(/[&<>"']/g,a=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[a]));
const nombreCorregido=v=>String(v||'').replace(/\bHuelquen\b/gi,'Huelquén').replace(/\bEl Transito\b/gi,'El Tránsito').replace(/\bPintue\b/gi,'Pintué').replace(/\bHuiticalan\b/gi,'Huiticalán');const n=f=>nombreCorregido(f.properties?.nombre||f.properties?.nombre_corto||f.properties?.LOCALIDAD||f.properties?.NOMBRE||f.properties?.NOMBRE_CAL||'Hito de Paine');
const hav=(a,b)=>{let rad=Math.PI/180,da=(a[0]-b[0])*rad,db=(a[1]-b[1])*rad,x=Math.sin(da/2)**2+Math.cos(a[0]*rad)*Math.cos(b[0]*rad)*Math.sin(db/2)**2;return (2*6371*Math.atan2(Math.sqrt(x),Math.sqrt(1-x))).toFixed(1)};
const coords=f=>f.geometry?.type==='Point'?[f.geometry.coordinates[1],f.geometry.coordinates[0]]:null;
const pics={
'Estación de Trenes Paine':'imagenes/hitos/estacion_paine.webp',
'Estación de Trenes Hospital':'imagenes/hitos/estacion_hospital.webp',
'Laguna de Aculeo':'imagenes/hitos/laguna_aculeo.webp',
'Municipalidad de Paine':'imagenes/hitos/municipalidad.webp',
'Estadio Municipal Tricolor':'imagenes/hitos/estadio_tricolor.webp',
'Estero Pintué':'imagenes/hitos/estero_pintue.webp'
};
const originCentral='-33.4506,-70.6899',originPaine='-33.81625,-70.7437';
const fotoReferencia=(name,p)=>{
 const assets=window.VISOR_ASSETS||{};
 const editable=(window.FOTOS_HITOS||{})[name];
 if(editable&&editable.archivo)return {url:editable.archivo,note:editable.tipo==='fotografia_del_lugar'?(editable.nota||'Fotografía del lugar'):('Imagen referencial: '+(editable.nota||'entorno de Paine'))};
 if(pics[name])return {url:pics[name],note:''};
 if(p.foto&&/^(imagenes\/|https:\/\/)/.test(p.foto))return {url:p.foto,note:p.foto_estado||'Foto vinculada al hito: verificar atribución'};
 const original=p.foto||'';
 if(original&&/^(imagenes\/|https:\/\/)/.test(original))return {url:original,note:p.foto_aclaracion||''};
 if(original&&assets[original])return {url:assets[original],note:p.foto_aclaracion||''};
 if(/pintué/i.test(name))return {url:'imagenes/hitos/estero_pintue.webp',note:'Fotografía del Estero Pintué'};
 if(/laguna|aculeo|humedal|cantillana/i.test(name))return {url:'imagenes/hitos/laguna_aculeo.webp',note:'Fotografía de la Laguna de Aculeo; imagen referencial cuando el sitio seleccionado es otro'};
 if(/río|estero|cauce|agua|peralillo|abrantes/i.test(name))return {url:'imagenes/hitos/estero_pintue.webp',note:'Fotografía del Estero Pintué utilizada como imagen referencial del paisaje hídrico'};
 if(/tren|ferrovia|estación/i.test(name))return {url:'imagenes/hitos/estacion_paine.webp',note:'Fotografía de Estación Paine utilizada como imagen ferroviaria referencial'};
 if(/ruta|camino|acceso|g-54|g-45|g-568|valle/i.test(name))return {url:'imagenes/hitos/laguna_aculeo.webp',note:'Paisaje de Aculeo utilizado como fotografía referencial del entorno de Paine'};
 return {url:'imagenes/hitos/municipalidad.webp',note:'Fotografía aérea de Paine utilizada como referencia visual; no representa necesariamente este lugar'};
};
const relatoDe=(p,name)=>{
 if(p.relato)return p.relato;
 if(p.LOCALIDAD)return 'Cada localidad guarda huellas de la vida rural y de quienes construyen el presente de Paine. Recorre '+name+' y descubre los caminos y paisajes que la rodean.';
 if(/Estero|Río/i.test(name))return 'Escucha el rumor del agua y sigue la huella de '+name+'. Entre cerros, campos y quebradas, este cauce nos invita a conocer el territorio y a cuidar sus ecosistemas.';
 if(/ferroviaria|tren/i.test(String(p.categoria||'')))return 'Sigue las vías que unieron al valle con Santiago: los viajes, las cosechas y las despedidas dibujaron una historia que aún puedes recorrer.';
 if(/camino|ruta|acceso/i.test(name))return 'Toma este camino para descubrir los paisajes, los oficios y la memoria rural de Paine. Cada curva abre una historia distinta del valle.';
 if(/Patrimonio/i.test(String(p.categoria||'')))return 'Las casas y construcciones del pasado narran historias de trabajo y comunidad. Descubre su memoria respetando los espacios privados y las condiciones de visita.';
 if(/alojamiento/i.test(String(p.categoria||'')))return 'Haz una pausa en Paine y permite que sus paisajes marquen el ritmo de tu viaje; consulta previamente las condiciones de atención.';
 return 'Ven a descubrir '+name+': un lugar donde el paisaje y la historia de Paine se encuentran y esperan tu visita.';
};
function popup(f,ly){
 const p=f.properties||{},name=n(f);
 let c=coords(f);
 if(!c&&ly&&typeof ly.getBounds==='function'){const b=ly.getBounds();if(b&&b.isValid()){const ctr=b.getCenter();c=[ctr.lat,ctr.lng]}}
 const photo=fotoReferencia(name,p);
 const photoHtml=photo.url?'<img class="ficha-foto" src="'+safe(photo.url)+'" alt="Imagen turística: '+safe(name)+'" loading="lazy" onerror="this.style.display='+"'none'"+'">':'';
 let html='<div class="ficha">'+photoHtml+'<h3>'+safe(name)+'</h3><div class="meta">'+safe(p.categoria||p.categoria_proteccion||p.AREA_C||'Territorio de Paine')+'</div><p>'+safe(relatoDe(p,name))+'</p>';
 if(photo.note)html+='<p class="meta"><i>'+safe(photo.note)+'</i></p>';
 if(p.descripcion&&p.descripcion!==p.relato)html+='<p><b>Información del catastro:</b> '+safe(p.descripcion)+'</p>';
 if(p.texto_guia_2025)html+='<details class="ficha-doc"><summary>Leer descripción del documento turístico 2025</summary><p>'+safe(p.texto_guia_2025)+'</p><p class="meta"><b>Fuente:</b> '+safe(p.fuente_guia_2025||'Guía de Turismo Paine 2025')+'</p></details>';
 if(p.observaciones&&p.observaciones!==p.descripcion)html+='<p class="meta">'+safe(p.observaciones)+'</p>';
 if(p.LOCALIDAD){const num=v=>Number.isFinite(Number(v))?new Intl.NumberFormat('es-CL').format(v):'—';html+='<p class="meta"><b>Censo 2024:</b> '+num(p.n_per)+' habitantes · '+num(p.n_hombres)+' hombres · '+num(p.n_mujeres)+' mujeres · '+num(p.n_hog)+' hogares</p>'}
 if(p.direccion)html+='<p class="meta"><b>Dirección según catastro:</b> '+safe(p.direccion)+'</p>';
 if(p.archivo_kmz)html+='<p class="meta"><b>Localización:</b> archivo KMZ «'+safe(p.archivo_kmz)+'» · ubicación por revisar</p>';
 if(p.fuente)html+='<p class="meta"><b>Fuente:</b> '+safe(p.fuente)+'</p>';
 if(p.precision||p.precision_geometrica)html+='<p class="meta"><b>Precisión:</b> '+safe(p.precision||p.precision_geometrica)+'</p>';
 if(c){
  html+='<p class="meta"><b>Distancias en línea recta:</b> Estación Paine '+hav(c,[-33.81625,-70.7437])+' km · Estación Central '+hav(c,[-33.4506,-70.6899])+' km. No son distancias de viaje.</p>';
  const dest=c[0]+','+c[1];
  html+='<div class="buttonlinks"><a target="_blank" rel="noopener" href="https://www.google.com/maps/dir/?api=1&origin='+originCentral+'&destination='+dest+'">Desde Estación Central ↗</a><a target="_blank" rel="noopener" href="https://www.google.com/maps/dir/?api=1&origin='+originPaine+'&destination='+dest+'">Desde Estación Paine ↗</a></div>';
  if(f.geometry?.type!=='Point')html+='<p class="meta">Las indicaciones conducen a un punto orientativo de esta geometría. Verifica el acceso y no ingreses a predios privados.</p>';
 }
 const link=p.sitio_web||p.url_oficial||'';
 if(/^https:\/\//.test(link))html+='<div class="buttonlinks"><a href="'+safe(link)+'" target="_blank" rel="noopener">Fuente / más información ↗</a></div>';
 return html+'</div>';
}
function selected(ly){if(selection&&selection.setStyle){try{selection.setStyle(selection._normalStyle||{})}catch{}}selection=ly;if(ly.setStyle){ly._normalStyle={color:ly.options.color,weight:ly.options.weight,fillColor:ly.options.fillColor,fillOpacity:ly.options.fillOpacity,radius:ly.options.radius};ly.setStyle({color:'#db2f89',weight:5,fillColor:'#fcbd3b',fillOpacity:0.6,radius:12})}let b=ly.getBounds?.();if(b&&b.isValid())map.flyToBounds(b.pad(.15),{maxZoom:15,duration:.6});else if(ly.getLatLng)map.flyTo(ly.getLatLng(),15,{duration:.6});}
function lay(g,style,point){let l=L.geoJSON(g,{style:()=>({...style}),pointToLayer:(f,ll)=>L.circleMarker(ll,{radius:7,color:'#fff',weight:2,fillColor:point||'#932475',fillOpacity:1}),onEachFeature:(f,x)=>{const key=n(f);if(!featureLookup.has(key))featureLookup.set(key,[]);featureLookup.get(key).push(x);x.bindPopup(()=>popup(f,x),{maxWidth:360});x.on('click',()=>{selected(x);setTimeout(()=>x.openPopup(),650)})}});return l;}
function register(id,name,geo,style,color,visible,target,desc){let layer=lay(geo,style,color);layerMap[id]={layer,name,visible,desc};if(visible)layer.addTo(map);const d=document.getElementById(target);let label=document.createElement('label');label.className='layer';label.innerHTML='<input type="checkbox" '+(visible?'checked':'')+' aria-label="'+safe(name)+'"><span>'+safe(name)+(desc?'<div class="layer-desc">'+safe(desc)+'</div>':'')+'</span><button class="zoom" title="Ir a capa">⌖</button>';d.appendChild(label);let ck=label.querySelector('input');ck.addEventListener('change',()=>{if(ck.checked){layer.addTo(map);zoomLayer(layer)}else map.removeLayer(layer)});label.querySelector('button').addEventListener('click',e=>{e.preventDefault();e.stopPropagation();ck.checked=true;layer.addTo(map);zoomLayer(layer)});return layer;}
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
const roads=register('roads','Red vial principal',D.roads,{color:'#9b9f9a',weight:2,opacity:.72},null,false,'roadsLayers','Red municipal de calles y caminos');
register('metropolitan','Parques Metropolitanos · Plan Regulador Metropolitano de Santiago',D.parques,{color:'#258a5f',weight:2,fillColor:'#67bd89',fillOpacity:.2},null,false,'natureLayers');
register('protection','Protección ecológica · Plan Regulador Metropolitano de Santiago',D.proteccion,{color:'#347554',weight:1.5,fillColor:'#4c9b65',fillOpacity:.12},null,false,'natureLayers');
register('humedal','Humedal Urbano · Estero Pintué – Laguna de Aculeo – Estero Santa Marta',D.humedal,{color:'#0791be',weight:2.5,fillColor:'#34aaca',fillOpacity:.27},null,false,'natureLayers');
// Cada río y estero se sirve en una capa específica desde datos/cauces_paine_individuales.geojson.
register('rail','Red ferroviaria · Paine, Hospital y conexión con Estación Central',D.ferrocarril,{color:'#213d64',weight:3.4,dashArray:'8,5',opacity:.95},null,false,'roadsLayers');
register('train-stops','Estaciones Paine, Hospital y referencia Estación Central',D.estaciones,{},'#305b83',false,'roadsLayers');
register('valle','Ruta del Valle del Maipo · Champa–Aculeo–Rangue',D.routes.valle,{color:'#dc8821',weight:5,opacity:.9},null,false,'roadsLayers');
register('padre','Camino Padre Hurtado · El Tránsito–Huelquén–Chada',D.routes.padre,{color:'#9e42a7',weight:4,opacity:.9},null,false,'roadsLayers');
register('attractions','Atractivos naturales y culturales',D.hitos,{},'#8c3990',false,'attractionLayers');
register('cultural','Centro Cultural, Memorial, Municipalidad y otros hitos',D.culturales,{},'#aa4f5d',false,'attractionLayers');
register('plaza','Plaza de Armas de Paine · polígono del proyecto',D.plaza,{color:'#b51c80',weight:3,fillColor:'#eaaa4a',fillOpacity:.35},null,false,'attractionLayers','Ámbito del proyecto municipal de mejoramiento integral');
register('tricolor','Estadio Municipal Tricolor',D.tricolor,{color:'#b92378',weight:2,fillColor:'#ffbfdb',fillOpacity:.32},null,false,'attractionLayers');
register('cmn','Monumentos Nacionales · CMN',D.cmn,{},'#c37b2e',false,'heritageLayers');
register('lodgings','Alojamientos · Paine 2025',D.alojamientos,{},'#598447',false,'lodgingLayers');
register('catastro','Catastro Territorial de Atractivos y Lugares de Interés Turístico · diciembre 2025',D.catastro,{},'#91664e',false,'catalogLayers');
register('architecture','Patrimonio arquitectónico · PRC 2013',D.patrimonio,{},'#704b4b',false,'archLayers');
register('limites','Áreas urbanas PRC — referencia de límites de localidades',D.areas,{color:'#ba4494',weight:2,fillColor:'#fff5c2',fillOpacity:.07},null,false,'roadsLayers');
// Localidades censales en una capa informativa separada de áreas urbanas y límite administrativo.
fetch('datos/localidades_censo_2024.geojson',{cache:'no-store'})
 .then(r=>r.ok?r.json():Promise.reject(Error('Capa de localidades no disponible')))
 .then(gj=>register('localidades','40 localidades · Censo 2024',gj,{color:'#2f826a',weight:2,fillColor:'#68b9a1',fillOpacity:.14},null,false,'localityLayers','Polígonos censales; no corresponden al límite comunal'))
 .catch(err=>{console.warn(err);document.getElementById('localityLayers').textContent='No fue posible cargar esta capa. Inténtalo nuevamente.'});

fetch('datos/corredores_turisticos.geojson',{cache:'no-store'})
.then(r=>r.ok?r.json():Promise.reject(Error('No se cargaron las rutas destacadas')))
.then(g=>{
 for(const f of g.features||[]){
  const q=f.properties;
  register('corridor-'+q.id,q.nombre,{type:'FeatureCollection',features:[f]},{color:q.color||'#db6c25',weight:5,opacity:.95},null,false,'corridorLayers','Trazado simplificado de referencia');
 }
})
.catch(err=>{console.warn(err);document.getElementById('corridorLayers').textContent='No fue posible cargar estas rutas. Recarga la página.'});

// Nuevos puntos georreferenciados del KMZ turístico 2026. Se agrupan por tipo, no se mezclan con el catastro sin coordenadas.
const kmzGrupos=[
  {key:'gastronomia',cat:'Gastronomía y productos locales',label:'Sabores y productos de Paine',color:'#d47733',defaultOn:false},
  {key:'alojamientos',cat:'Alojamientos y camping',label:'Alojamientos y camping',color:'#528b50',defaultOn:false},
  {key:'vinas',cat:'Viñas y enoturismo',label:'Viñas y enoturismo',color:'#9d529c',defaultOn:false},
  {key:'patrimonio',cat:'Patrimonio e historia',label:'Patrimonio e historia',color:'#bb557b',defaultOn:false},
  {key:'naturaleza',cat:'Naturaleza y paisaje',label:'Naturaleza y paisaje',color:'#268a69',defaultOn:true},
  {key:'experiencias',cat:'Experiencias y eventos',label:'Experiencias y eventos',color:'#ca8945',defaultOn:false},
  {key:'comunidad',cat:'Patrimonio comunitario',label:'Patrimonio comunitario',color:'#527caf',defaultOn:false}
];

// Índice de casos turísticos: explorar cada sitio sin activar de golpe sus categorías.
const kmzById=new Map();let kmzSpotlight=null;
window.abrirHitoKmz=id=>{
 const f=kmzById.get(id);if(!f||f.geometry?.type!=='Point')return;
 const c=f.geometry.coordinates;if(!Array.isArray(c)||c.length<2)return;
 if(kmzSpotlight)map.removeLayer(kmzSpotlight);
 kmzSpotlight=L.circleMarker([c[1],c[0]],{radius:10,weight:2,color:'#fff',fillColor:'#a4237d',fillOpacity:1}).addTo(map);
 kmzSpotlight.bindPopup(()=>popup(f,kmzSpotlight),{maxWidth:360});
 map.flyTo([c[1],c[0]],16,{duration:.55});setTimeout(()=>kmzSpotlight?.openPopup(),600);
};
function buildKmzCaseIndex(g,groups){
 const host=document.getElementById('kmzIndex');
 if(!host)return;
 host.textContent='';
 const input=document.createElement('input');input.className='search';input.type='search';
 input.placeholder='Buscar un hito por nombre';input.setAttribute('aria-label','Buscar hito turístico');
 host.appendChild(input);
 const sets=document.createElement('div');sets.className='kmz-case-groups';host.appendChild(sets);
 const nodes=[];
 for(const group of groups){
  const groupF=g.features.filter(f=>f.properties?.categoria===group.cat).sort((a,b)=>String(a.properties.nombre).localeCompare(String(b.properties.nombre),'es'));
  if(!groupF.length)continue;
  const groupEl=document.createElement('details');groupEl.className='kmz-case-group';
  const heading=document.createElement('summary');heading.textContent=group.label+' · '+groupF.length+' lugares';groupEl.appendChild(heading);
  const items=document.createElement('div');items.className='kmz-case-items';
  for(const f of groupF){
   const p=f.properties||{};if(!p.id)continue;kmzById.set(p.id,f);
   const el=document.createElement('details');el.className='kmz-case-entry';
   const summary=document.createElement('summary');summary.textContent=p.nombre||'Lugar sin nombre';el.appendChild(summary);
   const body=document.createElement('div');body.className='kmz-case-body';
   const descr=document.createElement('p');
   const original=String(p.texto_guia_2025||p.texto_documental||p.descripcion||p.direccion||'Ficha georreferenciada desde el KMZ aportado.');
   descr.textContent=original.length>350?original.slice(0,347)+'…':original;body.appendChild(descr);
   const go=document.createElement('button');go.type='button';go.className='btn';go.textContent='Ubicar y abrir ficha completa';
   go.addEventListener('click',()=>window.abrirHitoKmz(p.id));body.appendChild(go);
   el.appendChild(body);items.appendChild(el);nodes.push({el,groupEl,term:(p.nombre+' '+p.categoria+' '+original).toLowerCase()});
  }
  groupEl.appendChild(items);sets.appendChild(groupEl);
 }
 input.addEventListener('input',()=>{
  const term=input.value.trim().toLocaleLowerCase('es');
  for(const n of nodes)n.el.hidden=!!term&&!n.term.includes(term);
  for(const groupEl of sets.children){
   const matches=[...groupEl.querySelectorAll('.kmz-case-entry')].some(el=>!el.hidden);
   groupEl.hidden=!matches;
   if(term&&matches)groupEl.open=true;
  }
 });
}
window.mostrarKmz=(key)=>{
  const item=layerMap['kmz-'+key];
  if(!item){document.getElementById('status').textContent='Los hitos del ZIP todavía se están cargando; vuelve a pulsar en un instante.';return;}
  item.layer.addTo(map);zoomLayer(item.layer);
  document.querySelectorAll('#kmzLayers label.layer').forEach(el=>{if(el.textContent.includes(item.name))el.querySelector('input').checked=true});
};

fetch('datos/conexion_valdivia_paine_vial.geojson',{cache:'no-store'})
.then(r=>r.ok?r.json():Promise.reject(Error('No se pudo cargar conexión vial')))
.then(g=>{for(const f of g.features||[]){
 const q=f.properties||{};
 register('tramo-'+q.id,q.nombre,{type:'FeatureCollection',features:[f]},{color:q.rol==='G-500'?'#d54b42':'#713fa0',weight:5,opacity:.95},null,false,'corridorLayers','Trazado de red vial KMZ aportada; activa la casilla para visualizar');
}})
.catch(err=>console.warn('Conexión vial Valdivia de Paine:',err));
fetch('datos/hitos_kmz_2026.geojson',{cache:'no-store'})
.then(r=>r.ok?r.json():Promise.reject(Error('No se pudo abrir el inventario de KMZ')))
.then(g=>{
  for(const group of kmzGrupos){
    const features=g.features.filter(f=>f.properties?.categoria===group.cat);
    if(!features.length)continue;
    register('kmz-'+group.key,group.label+' ('+features.length+')',{type:'FeatureCollection',features},{},group.color,false,'kmzLayers','Ubicación digitalizada en KMZ. Haz clic para relato, documento y cómo llegar.');
  }
  buildKmzCaseIndex(g,kmzGrupos);
  const info=document.getElementById('kmzInfo');
  if(info)info.textContent=g.features.length+' hitos digitalizados. Relatos poéticos + catastro 2025 cuando hay coincidencia. La información comercial y las ubicaciones requieren revisión.';
})
.catch(err=>{console.error(err);document.getElementById('kmzInfo').textContent='No se pudo abrir la capa KMZ: '+err.message;});
fetch('datos/reserva_el_ajial_kmz.geojson',{cache:'no-store'})
.then(r=>r.ok?r.json():Promise.reject(Error('No disponible')))
.then(g=>register('ajial','El Ajial · área natural (KMZ)',g,{color:'#218565',weight:2.5,fillColor:'#98cca3',fillOpacity:.19},null,false,'natureLayers','Polígono KMZ aportado, sujeto a validación'))
.catch(err=>console.warn('No se cargó reserva El Ajial',err));

// Capa hidrográfica interpretativa: textos completos a la izquierda; lectura geográfica y controles a la derecha.
const hydroColors=['#146DAB','#217A92','#268A78','#5B60A5','#4875AD','#98668F','#8568A6','#417DB1','#14859A','#3E9090','#5F78A6'];
const hydroList=document.getElementById('hydroLayers'),poems=document.getElementById('hydroPoetry');
window.abrirCauces=()=>{
 const panel=document.getElementById('hydroSection');
 if(panel){panel.open=true;document.querySelectorAll('aside').forEach(el=>el.classList.remove('mobile-open'));document.getElementById('right').classList.add('mobile-open');panel.scrollIntoView({block:'nearest',behavior:'smooth'});}
};
window.verCauce=(id)=>{
 const key='hidro-'+id,entry=layerMap[key];
 if(!entry){document.getElementById('status').textContent='La ficha de este estero todavía se está cargando.';return;}
 const section=document.getElementById('hydroSection');
 if(section)section.open=true;
 const item=document.getElementById('hydro-item-'+id);
 if(item)item.open=true;
 const input=document.getElementById('hydro-check-'+id);
 if(input)input.checked=true;
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
    const style={color,weight:4,opacity:.95,dashArray:i%3===0?'9,4':i%3===1?'':'3,6'};
    const layer=lay(collection,style);
    layerMap['hidro-'+item.id]={layer,name:item.nombre,visible:false,desc:item.descripcion_geo};
    // El panel izquierdo conserva la voz narrativa; la ficha derecha NO la repite.
    const tale=document.createElement('details');tale.className='relato-cauce';
    const title=document.createElement('summary');title.textContent=item.nombre;tale.appendChild(title);
    const paragraph=document.createElement('p');paragraph.className='poema-cauce';paragraph.textContent=item.relato;tale.appendChild(paragraph);
    const b=document.createElement('button');b.className='btn';b.textContent='Ver este cauce en el mapa';b.addEventListener('click',()=>window.verCauce(item.id));tale.appendChild(b);
    poems?.appendChild(tale);
    // Acordeón anidado de la leyenda: una ficha geográfica individual y un interruptor explícito.
    const detail=document.createElement('details');detail.className='water-course';detail.id='hydro-item-'+item.id;
    const summary=document.createElement('summary');summary.textContent=item.nombre;summary.style.borderLeft='5px solid '+color;detail.appendChild(summary);
    const body=document.createElement('div');body.className='water-body';
    const geographic=document.createElement('p');geographic.textContent=item.descripcion_geo;body.appendChild(geographic);
    const context=document.createElement('small');context.textContent=item.region;context.className='water-region';body.appendChild(context);
    const controls=document.createElement('div');controls.className='water-controls';
    const label=document.createElement('label');label.className='water-label';
    const check=document.createElement('input');check.type='checkbox';check.id='hydro-check-'+item.id;check.checked=false;
    check.addEventListener('change',()=>{if(check.checked){layer.addTo(map);zoomLayer(layer);}else{map.removeLayer(layer)}});
    label.appendChild(check);label.appendChild(document.createTextNode('Mostrar en el mapa'));
    const zoom=document.createElement('button');zoom.className='zoom';zoom.type='button';zoom.textContent='⌖ Acercar';zoom.addEventListener('click',()=>window.verCauce(item.id));
    controls.appendChild(label);controls.appendChild(zoom);body.appendChild(controls);detail.appendChild(body);hydroList.appendChild(detail);
  }
  const summary=document.getElementById('hydroCount');
  if(summary)summary.textContent=g.cauces.length+' cursos identificados · despliega cada uno para leer su recorrido y elegir qué mostrar.';
})
.catch(err=>{console.warn('Cauces separados:',err);if(hydroList)hydroList.textContent='No se pudieron cargar los cursos de agua. Actualiza la página.';});
const captions={'Paine Centro':'Entre la estación, las casonas y los encuentros cotidianos, el corazón de la comuna cuenta su historia.','Champa - Hospital':'La vida de campo en torno al río Angostura, donde el tren y las sandías acompañaron el paso de generaciones.','Pintue':'El valle de Aculeo a los pies del Cordón de Cantillana: la memoria del agua y el paisaje se encuentran aquí.','El Transito':'El camino hacia la precordillera abre puertas a antiguas haciendas, viñas y tradiciones.','Huelquen':'Huelquén enlaza los caminos de Padre Hurtado con la vida rural, las viñas y los cerros de El Ajial.','Chada':'El paso entre valles y montañas, una puerta de caminos y memorias de la Independencia.'};
D.areas.features.forEach((f,i)=>{let name=nombreCorregido(f.properties.nombre_corto),id='urban'+i;let layer=lay({type:'FeatureCollection',features:[f]},{color:'#cb3e86',weight:3,fillColor:'#f9da81',fillOpacity:.16});layerMap[id]={layer,name};let el=document.createElement('label');el.className='listing';el.innerHTML='<input type="checkbox"><div class="body"><strong>'+safe(name)+'</strong><small>'+safe(captions[name]||'Una localidad para recorrer y descubrir.')+'</small></div><button class="go" title="Ir al área urbana">↗</button>';document.getElementById('urbanList').appendChild(el);el.querySelector('input').onchange=e=>e.target.checked?layer.addTo(map):map.removeLayer(layer);const jump=()=>{layer.addTo(map);el.querySelector('input').checked=true;zoomLayer(layer);layer.bringToFront()};el.querySelector('button').onclick=jump;el.querySelector('.body').onclick=jump;});
// Additional verified road classes, selectable individually
let kinds=[['Ruta 5 Sur',/RUTA 5|PANAMERICANA|LONGITUDINAL/],['Acceso Sur',/ACCESO SUR/],['Padre Hurtado',/PADRE HURTADO|G-45/],['Camino a Chada',/CHADA|G-515/],['Champa–Hospital',/CHAMPA|HOSPITAL|G-546/],['Pintué–Rangue',/PINTU|RANGUE|G-54/]];
kinds.forEach(([name,re],i)=>{let g=filt(D.roads,f=>re.test(String(f.properties.NOMBRE_CAL||'')+' '+String(f.properties.LOCALIDAD||'')));if(g.features.length)register('road'+i,name,g,{color:'#dc8821',weight:3,opacity:.9},null,false,'roadsLayers')});
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
window.toggleAndFocus=id=>{let v=layerMap[id];if(!v)return;v.layer.addTo(map);zoomLayer(v.layer);document.querySelectorAll('label.layer').forEach(el=>{if(el.textContent.includes(v.name))el.querySelector('input').checked=true})};
window.focusPoint=(lat,lon,z,name)=>{
 if(String(name).toLowerCase().includes('municipalidad de paine')){lat=MUNICIPIO_LAT;lon=MUNICIPIO_LON;}
 const layers=featureLookup.get(nombreCorregido(name))||[];
 const target=layers.find(x=>x.getLatLng&&x.getLatLng().distanceTo(L.latLng(lat,lon))<120)||layers[0];
 if(target){
   for(const item of Object.values(layerMap)){if(item.layer?.hasLayer?.(target)&&!map.hasLayer(item.layer)){item.layer.addTo(map);}}
   map.flyTo([lat,lon],z,{duration:.6});
   setTimeout(()=>target.openPopup(),650);
   return;
 }
 const point={type:'Feature',geometry:{type:'Point',coordinates:[lon,lat]},properties:{nombre:name,categoria:'Hito turístico',relato:'Descubre este lugar en el paisaje de Paine, sus historias y sus caminos.'}};
 const marker=L.circleMarker([lat,lon],{radius:9,fillColor:'#f7bf3b',color:'#b51c80',fillOpacity:1}).addTo(map);
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
    register('limite-comunal','Límite comunal corregido · Paine',geo,{color:'#e12f80',weight:3,fillOpacity:0,dashArray:'8,5'},null,false,'roadsLayers','Fuente: archivo municipal');
 })
 .catch(()=>{});
})();