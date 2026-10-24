(()=>{'use strict';const D=window.VISOR_DATA;const map=L.map('map',{zoomControl:false,preferCanvas:true}).setView([-33.835,-70.79],11);L.control.zoom({position:'bottomright'}).addTo(map);L.control.scale({metric:true,imperial:false,position:'bottomright'}).addTo(map);
const baseDefs={osm:'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',sat:'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'};let base=null;const layerMap={};let selection=null;
const safe=s=>String(s??'').replace(/[&<>"']/g,a=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[a]));
const nombreCorregido=v=>String(v||'').replace(/\bHuelquen\b/gi,'Huelquén').replace(/\bEl Transito\b/gi,'El Tránsito').replace(/\bPintue\b/gi,'Pintué');const n=f=>nombreCorregido(f.properties?.nombre||f.properties?.nombre_corto||f.properties?.NOMBRE||f.properties?.NOMBRE_CAL||'Hito de Paine');
const hav=(a,b)=>{let rad=Math.PI/180,da=(a[0]-b[0])*rad,db=(a[1]-b[1])*rad,x=Math.sin(da/2)**2+Math.cos(a[0]*rad)*Math.cos(b[0]*rad)*Math.sin(db/2)**2;return (2*6371*Math.atan2(Math.sqrt(x),Math.sqrt(1-x))).toFixed(1)};
const coords=f=>f.geometry?.type==='Point'?[f.geometry.coordinates[1],f.geometry.coordinates[0]]:null;
const pics={'Estación de Trenes Paine':'assets/estacion_paine.jpg','Estación de Trenes Hospital':'assets/estacion_hospital.jpg','Laguna de Aculeo':'assets/laguna_aculeo_real.jpg','Municipalidad de Paine':'assets/municipalidad.jpg','Estadio Municipal Tricolor':'assets/estadio_tricolor_festival.jpg','Estero Pintue':'assets/estero_pintue_real.jpg'};
function popup(f){
 const p=f.properties||{},name=n(f),c=coords(f);
 let original=p.foto||pics[name]||'';
 const realPhoto=(window.VISOR_ASSETS||{})[original]||(window.VISOR_ASSETS||{})[pics[name]||'']||'';
 const image=realPhoto?'<img class="ficha-foto" src="'+safe(realPhoto)+'" alt="Fotografía de '+safe(name)+'" loading="lazy">':'<div class="ficha-pendiente">Fotografía de este lugar pendiente de incorporar</div>';
 const story=p.relato||p.descripcion||p.especialidad||p.observaciones||'Descubre las historias, el paisaje y los encuentros que dan vida a este rincón de Paine.';
 let html='<div class="ficha">'+image+'<h3>'+safe(name)+'</h3><div class="meta">'+safe(p.categoria||p.categoria_proteccion||p.localidad||'Territorio de Paine')+'</div><p>'+safe(story)+'</p>';
 if(p.descripcion&&p.relato&&p.descripcion!==p.relato)html+='<p>'+safe(p.descripcion)+'</p>';
 if(p.foto_aclaracion)html+='<p class="meta">'+safe(p.foto_aclaracion)+'</p>';
 if(p.direccion)html+='<p class="meta"><b>Ubicación:</b> '+safe(p.direccion)+'</p>';
 if(p.fuente)html+='<p class="meta"><b>Fuente:</b> '+safe(p.fuente)+'</p>';
 if(c)html+='<p class="meta"><b>Distancias en línea recta:</b> Estación Paine '+hav(c,[-33.81625,-70.7437])+' km · Estación Central de Santiago '+hav(c,[-33.4506,-70.6899])+' km</p>';
 html+='<div class="buttonlinks">';
 if(c)html+='<a target="_blank" rel="noopener" href="https://www.google.com/maps/dir/?api=1&destination='+c[0]+','+c[1]+'">Cómo llegar ↗</a>';
 if(/^https:\/\//.test(p.sitio_web||''))html+='<a href="'+safe(p.sitio_web)+'" target="_blank" rel="noopener">Más información ↗</a>';
 html+='</div>';
 if(p.precision||p.precision_geometrica)html+='<div class="meta">Ubicación: '+safe(p.precision||p.precision_geometrica)+'</div>';
 return html+'</div>';
}
function selected(ly){if(selection&&selection.setStyle){try{selection.setStyle(selection._normalStyle||{})}catch{}}selection=ly;if(ly.setStyle){ly._normalStyle={color:ly.options.color,weight:ly.options.weight,fillColor:ly.options.fillColor,fillOpacity:ly.options.fillOpacity,radius:ly.options.radius};ly.setStyle({color:'#db2f89',weight:5,fillColor:'#fcbd3b',fillOpacity:0.6,radius:12})}let b=ly.getBounds?.();if(b&&b.isValid())map.flyToBounds(b.pad(.15),{maxZoom:15,duration:.6});else if(ly.getLatLng)map.flyTo(ly.getLatLng(),15,{duration:.6});}
function lay(g,style,point){let l=L.geoJSON(g,{style:()=>({...style}),pointToLayer:(f,ll)=>L.circleMarker(ll,{radius:7,color:'#fff',weight:2,fillColor:point||'#932475',fillOpacity:1}),onEachFeature:(f,x)=>{x.bindPopup(popup(f),{maxWidth:330});x.on('click',()=>{selected(x);map.once('moveend',()=>x.openPopup());setTimeout(()=>x.openPopup(),350)})}});return l;}
function register(id,name,geo,style,color,visible,target,desc){let layer=lay(geo,style,color);layerMap[id]={layer,name,visible,desc};if(visible)layer.addTo(map);const d=document.getElementById(target);let label=document.createElement('label');label.className='layer';label.innerHTML='<input type="checkbox" '+(visible?'checked':'')+' aria-label="'+safe(name)+'"><span>'+safe(name)+(desc?'<div class="layer-desc">'+safe(desc)+'</div>':'')+'</span><button class="zoom" title="Ir a capa">⌖</button>';d.appendChild(label);let ck=label.querySelector('input');ck.addEventListener('change',()=>{if(ck.checked){layer.addTo(map);zoomLayer(layer)}else map.removeLayer(layer)});label.querySelector('button').addEventListener('click',e=>{e.preventDefault();e.stopPropagation();ck.checked=true;layer.addTo(map);zoomLayer(layer)});return layer;}
function zoomLayer(layer){let bounds=layer.getBounds?.();if(bounds?.isValid()){map.flyToBounds(bounds.pad(.12),{duration:.7,maxZoom:14});}else document.getElementById('status').textContent='Este catálogo contiene registros sin coordenadas; consulta las fichas del panel para ubicarlos por su dirección.';}
function filt(g,check){return {...g,features:g.features.filter(check)}};
// Backbone local-first. External tiles are optional; local vector background never disappears.
const roads=register('roads','Red vial principal',D.roads,{color:'#9b9f9a',weight:2,opacity:.72},null,true,'roadsLayers','Red municipal de calles y caminos');
register('metropolitan','Parques Metropolitanos · Plan Regulador Metropolitano de Santiago',D.parques,{color:'#258a5f',weight:2,fillColor:'#67bd89',fillOpacity:.2},null,false,'natureLayers');
register('protection','Protección ecológica · Plan Regulador Metropolitano de Santiago',D.proteccion,{color:'#347554',weight:1.5,fillColor:'#4c9b65',fillOpacity:.12},null,false,'natureLayers');
register('humedal','Humedal Urbano · Estero Pintué – Laguna de Aculeo – Estero Santa Marta',D.humedal,{color:'#0791be',weight:2.5,fillColor:'#34aaca',fillOpacity:.27},null,true,'natureLayers');
register('aguas','Ríos y esteros destacados',D.hidrografia,{color:'#218dbe',weight:2.6,opacity:.92},null,true,'natureLayers');
register('rail','Paine y sus estaciones de tren · corredor a Estación Central',D.ferrocarril,{color:'#365275',weight:2,dashArray:'6,5',opacity:.85},null,true,'roadsLayers');
register('train-stops','Estaciones Paine, Hospital y referencia Estación Central',D.estaciones,{},'#305b83',true,'roadsLayers');
register('valle','Ruta del Valle · Champa–Aculeo–Rangue',D.routes.valle,{color:'#dc8821',weight:5,opacity:.9},null,true,'roadsLayers');
register('padre','Camino Padre Hurtado · El Tránsito–Huelquén–Chada',D.routes.padre,{color:'#9e42a7',weight:4,opacity:.9},null,true,'roadsLayers');
register('attractions','Atractivos naturales y culturales',D.hitos,{},'#8c3990',true,'attractionLayers');
register('cultural','Centro Cultural, Memorial, Municipalidad y otros hitos',D.culturales,{},'#aa4f5d',true,'attractionLayers');
register('plaza','Plaza de Armas de Paine · polígono del proyecto',D.plaza,{color:'#b51c80',weight:3,fillColor:'#eaaa4a',fillOpacity:.35},null,true,'attractionLayers','Ámbito del proyecto municipal de mejoramiento integral');
register('tricolor','Estadio Municipal Tricolor',D.tricolor,{color:'#b92378',weight:2,fillColor:'#ffbfdb',fillOpacity:.32},null,true,'attractionLayers');
register('cmn','Monumentos Nacionales · CMN',D.cmn,{},'#c37b2e',false,'heritageLayers');
register('lodgings','Alojamientos · Paine 2025',D.alojamientos,{},'#598447',false,'lodgingLayers');
register('catastro','Catastro Territorial de Atractivos y Lugares de Interés Turístico · diciembre 2025',D.catastro,{},'#91664e',false,'catalogLayers');
register('architecture','Patrimonio arquitectónico · PRC 2013',D.patrimonio,{},'#704b4b',false,'archLayers');
register('limites','Áreas urbanas PRC — referencia de límites de localidades',D.areas,{color:'#ba4494',weight:2,fillColor:'#fff5c2',fillOpacity:.07},null,false,'roadsLayers');
const captions={'Paine Centro':'Entre la estación, las casonas y los encuentros cotidianos, el corazón de la comuna cuenta su historia.','Champa - Hospital':'La vida de campo en torno al río Angostura, donde el tren y las sandías acompañaron el paso de generaciones.','Pintue':'El valle de Aculeo a los pies del Cordón de Cantillana: la memoria del agua y el paisaje se encuentran aquí.','El Transito':'El camino hacia la precordillera abre puertas a antiguas haciendas, viñas y tradiciones.','Huelquen':'Huelquén enlaza los caminos de Padre Hurtado con la vida rural, las viñas y los cerros de El Ajial.','Chada':'El paso entre valles y montañas, una puerta de caminos y memorias de la Independencia.'};
D.areas.features.forEach((f,i)=>{let name=nombreCorregido(f.properties.nombre_corto),id='urban'+i;let layer=lay({type:'FeatureCollection',features:[f]},{color:'#cb3e86',weight:3,fillColor:'#f9da81',fillOpacity:.16});layerMap[id]={layer,name};layer.addTo(map);let el=document.createElement('label');el.className='listing';el.innerHTML='<input type="checkbox" checked><div class="body"><strong>'+safe(name)+'</strong><small>'+safe(captions[name]||'Una localidad para recorrer y descubrir.')+'</small></div><button class="go" title="Ir al área urbana">↗</button>';document.getElementById('urbanList').appendChild(el);el.querySelector('input').onchange=e=>e.target.checked?layer.addTo(map):map.removeLayer(layer);const jump=()=>{layer.addTo(map);el.querySelector('input').checked=true;zoomLayer(layer);roads.addTo(map);layer.bringToFront()};el.querySelector('button').onclick=jump;el.querySelector('.body').onclick=jump;});
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
window.focusPoint=(lat,lon,z,name)=>{map.flyTo([lat,lon],z,{duration:.8});let marker=L.circleMarker([lat,lon],{radius:10,fillColor:'#f7bf3b',color:'#b51c80',fillOpacity:1}).addTo(map).bindPopup('<b>'+safe(name)+'</b>').openPopup();setTimeout(()=>map.removeLayer(marker),7500)};
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