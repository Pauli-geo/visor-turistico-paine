# Manual de mantenimiento — Visor Turístico Municipal de Paine

## 1. Criterio de organización

Cada hito turístico tiene un identificador único, nombre, categoría, coordenadas WGS84 (EPSG:4326), descripción breve, relato, sector, dirección, enlaces, fotografía principal, galería, fuente y estado de validación. El ID no cambia aunque se modifique el nombre.

El contenido turístico pertenece a `contenidos/hitos.json`; la cartografía técnica se registra en `datos/catalogo_capas.json`. Los GeoJSON normativos nunca deben sustituirse por polígonos aproximados.

## 2. Actualizar un hito

1. Abrir `contenidos/hitos.json` en GitHub y elegir Edit.
2. Buscar el `id` del hito y editar únicamente sus campos, sin alterar los corchetes ni las comas.
3. Especificar `fuente` y registrar la fecha de actualización.
4. Mantener `estado_publicacion: "en_revision"` hasta la validación de la Oficina de Turismo.
5. Guardar (Commit changes). **Actualmente la página conserva una copia interna de sus puntos y no consume todavía este JSON**. Es necesario conectar la página a la base maestra antes de que estos cambios aparezcan automáticamente en el mapa.

## 3. Capas espaciales

La capa de trabajo se conservará en QGIS con EPSG:32719 y su copia para Leaflet estará en EPSG:4326. Cualquier modificación exige comprobar geometría, origen, permisos de publicación, CRS y vigencia. La capa publicada debe nombrarse con el ID del catálogo.

## 4. Fotografías

Registrar foto, permiso de uso, crédito, fecha y nombre del hito en `contenidos/registro_imagenes.csv`. No agregar una fotografía cuya licencia o autorización se desconozca. Mantener rutas relativas como `imagenes/hitos/TUR-estacion-hospital/principal.jpg`.

## 5. Flujo de revisión y publicación

- Borrador: contenido sin revisar.
- En revisión: recopilado, pendiente de ubicación/fuente/licencias.
- Publicado: aprobado por responsable designado.
- Archivado: hito oculto, registro conservado para trazabilidad.

Responsabilidades propuestas: Oficina de Turismo revisa fichas, horarios, servicios y fotos; Asesoría Urbana valida geometrías y antecedentes territoriales; Informática administra publicación, accesibilidad y copias de seguridad.

## 6. Advertencia sobre el estado actual

El primer mapa público utiliza 21 puntos de la versión web de trabajo y servicios de mapa externos. Las 6 áreas urbanas, 119 vías, 426 trazados hidrográficos, 10 líneas ferroviarias y humedal se identificaron en los archivos fuente originales, pero todavía no se han transferido todos esos GeoJSON al repositorio GitHub. Este documento no certifica su vigencia normativa.
