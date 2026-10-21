# Datos, pesos y resultados fuera de Git

El código y la muestra pequeña permiten ejecutar la demo después de clonar. El procesamiento real necesita un modelo local y un video que se obtienen por separado. `.gitignore` mantiene esos archivos en el disco sin agregarlos al repositorio.

| Recurso | Ubicación local esperada | Cómo compartirlo |
|---|---|---|
| Modelo YOLOv8n | `MVP/Procesamiento/yolov8n.pt` o `FUTAI_MODEL_PATH` | Enlace oficial del modelo, versión y hash; opcionalmente Release/LFS acordado por el equipo |
| Videos de prueba | `MVP/Procesamiento/Videos de prueba/` o una ruta elegida en la web | Almacenamiento externo con acceso del equipo |
| Base de datos | `backend/data/futai.sqlite3` | Se crea localmente; compartir un JSON exportado seleccionado si hace falta |
| Videos/CSV/JSON de trabajos | `backend/data/jobs/<id>/output/` | Descargar desde `/demo`; no subir automáticamente cada corrida |
| Resultados de Colab | Carpetas de fases dentro de `Procesamiento/` | Seleccionar una muestra o evidencia revisada y documentada |
| Muestra inicial | `backend/data/demo_parcial_provisional.json` | Se incluye en Git: es pequeña y la demo la necesita |
| Capturas seleccionadas | `docs/imagenes/` o `docs/diagramas/` | Se pueden versionar cuando son pequeñas y tienen contexto |

Las ubicaciones relativas a `backend/` se explican en [Instalación](instalacion.md). Los videos y pesos existentes no se borraron ni movieron como parte del ordenamiento.

## Obtener YOLOv8n

Descargar el peso de detección `yolov8n.pt` desde las [fuentes oficiales de Ultralytics](https://docs.ultralytics.com/models/yolov8/) / [releases de sus assets](https://github.com/ultralytics/assets/releases), y colocarlo en `MVP/Procesamiento/yolov8n.pt` antes de configurar el motor. Un peso de pose/segmentación con otro nombre no sustituye este modelo de detección.

El modelo preentrenado se distribuye por separado; no es un entrenamiento propio del equipo. Registrar la procedencia y las condiciones del proveedor al documentar resultados. Para registrar el hash de un archivo concreto en PowerShell:

```powershell
Get-FileHash -Algorithm SHA256 -LiteralPath .\Procesamiento\yolov8n.pt
```

Si se decide almacenar modelos en Git LFS, el equipo debe modificar explícitamente las reglas que hoy ignoran `*.pt` y configurar LFS antes de agregarlos. Este repositorio no configura LFS automáticamente.

## Videos y reproducción de pruebas

Los tests unitarios de API/motor usan datos temporales y funcionan sin videos ni pesos. El smoke real requiere un clip local: las verificaciones anteriores utilizaron `prueba2_20s.mp4`, pero ese video no se incluye en Git. Si se usa otro, registrar procedencia, duración, parámetros y hash; los recuentos de detecciones no tienen por qué coincidir.

Los resultados CSV/JSON de investigación se mantienen locales por defecto. Para publicar una calibración o muestra deliberada, guardarla en una carpeta versionable de ejemplos/documentación y enlazarla; no quitar todas las reglas de exclusión de resultados ni usar `git add -f` para subir el directorio completo.
