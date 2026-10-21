# Validación y comprobaciones

Esta guía conserva la evidencia registrada y los comandos para repetirla. La preparación del entorno se explica en el [índice](README.md). Los pesos y videos locales, excluidos de Git, se preparan siguiendo [Datos y modelos](datos-y-modelos.md).

## Registro del 21 de octubre de 2026

- **32 pruebas aprobadas** de API, cola, configuración, métricas, worker y anotaciones tras incorporar el selector de elipses/cajas.
- Compilación de producción y prueba de navegador aprobadas. Se revisaron muestra, importación, valores ausentes, procesamiento, descargas, selección de estilo, vista móvil y landing.
- La comparación con inferencia real procesó 10 frames de `prueba2_20s.mp4` por estilo: 180 observaciones y 18 tracks en cada ejecución. El CSV fue idéntico byte por byte y las métricas coincidieron. Se verificaron MP4 H.264, CSV, JSON y HTTP Range del video.
- Sin calibración, distancia y velocidad permanecieron `null`. Esta prueba no validó precisión física ni identidad permanente de futbolistas.

Este registro describe esa ejecución en el equipo de desarrollo; no garantiza resultados o tiempos idénticos con otros modelos, versiones o videos. La evidencia de interfaz usa un worker de prueba y la inferencia real se comprueba por separado.

Durante la verificación se corrigió un bloqueo intermitente de Windows al reemplazar el JSON de progreso mientras la API lo leía. La escritura atómica realiza hasta seis intentos breves. Las pruebas comprueban que publica JSON completo y que un bloqueo persistente termina sin reemplazar el anterior; este mecanismo no modifica inferencia, homografía ni métricas.

## Pruebas de API y motor

Con el entorno de desarrollo preparado, ejecutar desde `FUTAI_DEMO_INTEGRADA/FUTAI_DEMO/backend/`:

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s tests -v
```

La integración de API usa bases temporales y un worker de prueba; no consume GPU ni reemplaza resultados de presentación. Las pruebas de anotación usan entradas controladas para verificar que ambos estilos conservan CSV, métricas y frames de inferencia. Las pruebas de métricas revisan valores ausentes, oclusiones y rechazo de saltos, no el rendimiento del detector sobre un partido real.

## Compilación del frontend

Desde `FUTAI_DEMO_INTEGRADA/FUTAI_DEMO/frontend/`, con sus dependencias preparadas:

```powershell
npm run build
```

Esto valida React/Vite y genera `dist/` localmente. No ejecuta inferencia ni sustituye las comprobaciones de interacción.

## Inferencia real y comparación de estilos

Requiere entorno de visión configurado, modelo local y video legible. Desde `backend/`:

```powershell
.\.venv\Scripts\python.exe smoke_processing.py --video "..\..\..\Procesamiento\Videos de prueba\prueba2_20s.mp4" --frames 10
```

La comprobación crea almacenamiento temporal y recorre subida → worker real → análisis por ID → descargas. Usa su propia base y elimina el directorio temporal al terminar.

Para comparar elipses/cajas y guardar el primer frame de cada video:

```powershell
.\.venv\Scripts\python.exe smoke_processing.py --video "..\..\..\Procesamiento\Videos de prueba\prueba2_20s.mp4" --frames 10 --compare-styles --preview-dir ".\data\smoke_vision\comparacion-estilos"
```

`--compare-styles` ejecuta ambos estilos y compara CSV/métricas. `--preview-dir` es opcional: conserva `ellipses.png` y `boxes.png` en la ruta indicada como evidencia local excluida de Git. Para revisar sólo cajas se puede usar `--annotation-style boxes` sin comparar estilos.

## Navegador con worker de prueba

La comprobación opcional requiere Chrome o Edge instalado y los entornos de desarrollo preparados. Desde `backend/`, sustituir la ruta por un ejecutable existente:

```powershell
.\.venv\Scripts\python.exe smoke_browser.py --browser "C:\ruta\a\chrome.exe"
```

`smoke_browser.py` levanta API temporal, Vite y navegador headless. Comprueba dashboard, importación, selector de estilo, descargas, vista móvil y landing sin alterar la base de presentación. Usa un worker de prueba: aprobarla no demuestra que YOLO esté disponible o que las métricas físicas sean precisas.

Para revisión manual, abrir `/` y `/demo`, conservar los avisos provisionales y comprobar que elegir un video sólo para previsualizar no envía un trabajo. Revisar que un fallo preserve el análisis anterior y que los artefactos correspondan al análisis seleccionado.
