# Arquitectura y contrato de FUT.AI

La aplicación mantenida está en `FUTAI_DEMO_INTEGRADA/FUTAI_DEMO/`. La landing ilustrativa, la importación de JSON de Colab y el procesamiento local conservan flujos independientes. La API y la importación funcionan aunque el motor de visión esté desactivado o no esté instalado.

Volver al [índice](README.md). Consultar [Datos y modelos](datos-y-modelos.md) para preparar archivos locales y [Validación](validacion.md) para repetir comprobaciones.

## Componentes

```text
FUTAI_DEMO_INTEGRADA/FUTAI_DEMO/
  backend/
    app.py                 Factory FastAPI y rutas HTTP
    futai_api/
      config.py            Configuración y resolución de rutas
      schemas.py           Validación de resultados y calibración
      storage.py           SQLite y publicación transaccional
      jobs.py              Cola persistente y supervisión del worker
    vision/
      config.py            Contrato de entrada del worker
      worker.py            YOLO + ByteTrack + OpenCV y codificación
      metrics.py           Métricas por track y segmentos válidos
      annotations.py       Elipses/cajas, etiquetas y colores por track
    data/
      demo_parcial_provisional.json  Muestra inicial versionada
      futai.sqlite3        Historial local, excluido de Git
      jobs/<id>/           Entrada, request.json, worker.log y output/
  frontend/src/
    lib/api.js             Cliente HTTP y enlaces de artefactos
    hooks/                 Datos, historial y ciclo de vida del trabajo
    components/demo/       Controles, evidencia y tabla
    pages/DemoPage.jsx     Dashboard /demo
    pages/LandingPage.jsx  Presentación y simulaciones ilustrativas
```

Las dependencias pesadas se cargan en un proceso separado por trabajo. El entorno de la API y el de visión pueden ser distintos. Las rutas relativas de configuración se resuelven desde `backend/`; la ubicación de `Procesamiento/` se deriva de la jerarquía actual. Mover la aplicación o un entorno virtual exige revisar esas rutas y recrear los entornos correspondientes.

## Flujo de procesamiento

1. `/demo` envía un MP4, WebM o MOV, calibración JSON opcional y estilo de anotación a `POST /api/jobs`.
2. La API valida la entrada, la guarda en un directorio propio y registra el trabajo `queued` en SQLite.
3. Un ejecutor toma el trabajo, lo marca `running` y lanza el worker. Usar una sola instancia de Uvicorn; un bloqueo de archivo impide dos ejecutores simultáneos sobre los mismos datos.
4. OpenCV decodifica los frames. YOLO detecta personas y ByteTrack mantiene tracks con `tracker="bytetrack.yaml"` y `persist=True`.
5. Se registran cajas, IDs, confianza y posición del punto de apoyo en píxeles. Si existe calibración válida, se proyecta a metros y se acumulan métricas.
6. Se anota una copia del frame y se escriben CSV/video incrementalmente. `progress.json` se publica mediante reemplazo atómico.
7. Guardar el análisis validado y marcar el trabajo `completed` ocurre en una misma transacción. El frontend consulta su `analysis_id` y ofrece las tres descargas.

Un fallo marca el trabajo `failed` y conserva el último análisis válido. Los archivos parciales no se sirven como resultados completos. Al reiniciar, los trabajos que estaban ejecutándose pasan a fallidos y los pendientes continúan si el motor está disponible. Al apagar o alcanzar el timeout se termina el árbol de procesos del trabajo. Los archivos locales se conservan; no hay borrado automático.

La salida se convierte a H.264/yuv420p con faststart si FFmpeg está disponible. Si sólo puede conservarse MPEG-4 Part 2, `video_browser_compatible` es `false` y se ofrece descarga con un aviso. El video anotado no conserva audio.

## API actual

| Método y ruta | Contrato principal |
| --- | --- |
| `GET /api/health` | Salud de SQLite y `processing.enabled`, `ready`, `reason` del motor. |
| `GET /api/analyses` | Resúmenes de los últimos 25 análisis. |
| `GET /api/analyses/latest` | Último análisis publicado. |
| `GET /api/analyses/{analysis_id}` | Registro exacto con sus enlaces `artifacts`. |
| `POST /api/analyses/import` | Multipart `file`: resultados JSON de hasta 5 MB; origen `IMPORTADO_COLAB`. |
| `GET /api/jobs` | Últimos 25 trabajos, con estado y progreso. |
| `POST /api/jobs` | Multipart `file`: video; `calibration`: JSON opcional; `annotation_style`: `ellipses` o `boxes`. Devuelve HTTP 202. |
| `GET /api/jobs/{job_id}` | Estado, progreso, error y `analysis_id` cuando termina. |
| `GET /api/jobs/{job_id}/artifacts/{kind}` | `video`, `tracks` o `result` de un trabajo completado. El video admite HTTP Range. |

Errores relevantes: 400 para contenido/extensión inválidos; 413 por tamaño; 422 por contrato/calibración/estilo inválidos; 429 por cola llena; 503 por motor no disponible; 409 para artefactos de un trabajo sin completar. La documentación interactiva local está en `http://127.0.0.1:8000/docs`. Esta es una demo local sin autenticación.

El registro conserva `result.procesamiento` y `result.metricas_por_track`. `job_id` y `artifacts` vinculan el resultado local a su trabajo; el origen es `PIPELINE_LOCAL`. La muestra usa `MUESTRA_PARCIAL` y sólo se inserta si no hay análisis guardados. Importar JSON o elegir una previsualización local no inicia YOLO.

El CSV común permite reutilizar las entradas de los notebooks:

```text
frame,tiempo_s,track_id,class_id,x1,y1,x2,y2,confidence,x_pixel,y_pixel,x_metro,y_metro
```

## Estilo de anotación

`annotation_style` vale `ellipses` por defecto: elipses en los pies y etiquetas de ID sobre las personas. `boxes` conserva cajas de detección. Los colores son estables por track y no representan equipos. Se utiliza Supervision para elipses/etiquetas cuando está disponible; OpenCV ofrece el dibujo de respaldo.

El estilo sólo cambia el nuevo video. Se registra en `procesamiento.annotation_style` y no altera la entrada de inferencia, el CSV, la homografía ni las métricas. Los videos anteriores mantienen su anotación original.

## Calibración y métricas

La calibración opcional v1 es para **cámara fija**: `mode="static"`, al menos cuatro pares reales `image_points`/`field_points` no colineales y `field_size` en metros. Se revisan puntos, dimensiones, estabilidad y error de reproyección. Consultar el [contrato detallado del motor](../FUTAI_DEMO_INTEGRADA/FUTAI_DEMO/backend/vision/README.md) antes de prepararla.

Una matriz fija pierde validez con movimiento, zoom o cambios de toma. Para esos videos se debe omitir la calibración o importar resultados del flujo externo de homografía dinámica de `Procesamiento/`. La estimación automática de homografía dinámica no está integrada.

- Sin calibración se exportan píxeles e IDs; las columnas métricas del CSV quedan vacías y distancia/velocidad son `null`, mostradas como “—”.
- Distancia y velocidad sólo usan pasos consecutivos calibrados aceptados por el filtro de saltos. No se rellenan oclusiones ni se conectan segmentos separados.
- `duracion_observada_s` cuenta frames observados, no el intervalo entre primera y última detección.
- La cobertura homográfica indica disponibilidad de transformación; no certifica precisión física.
- Los IDs representan trayectorias y pueden fragmentarse. Observaciones y tracks no equivalen al número de futbolistas.

Todo resultado mantiene `PROVISIONAL_NO_VALIDADO`. El motor detecta personas; no implementa identidad permanente, clasificación de equipos, tracking del balón, pose, fatiga ni diagnóstico de lesiones. Los paneles ilustrativos de la landing no son mediciones del motor.

## Límites iniciales

| Configuración | Valor predeterminado |
| --- | --- |
| Dispositivo | CPU; GPU opcional mediante `FUTAI_DEVICE`. |
| Inferencia | Tamaño 640; confianza 0,1. |
| Video subido | Hasta 200 MB. |
| Duración procesada | Hasta 120 segundos de video; no es una promesa de tiempo de cómputo. |
| Frames | Sin límite adicional (`FUTAI_MAX_FRAMES=0`). |
| Capacidad de cola | Cuatro trabajos entre `queued` y `running`; uno se ejecuta a la vez. |
| Timeout | 1800 segundos de ejecución por trabajo. |
| Filtro de saltos | 45 km/h como máximo predeterminado. |

Los valores son configurables en `backend/.env` y se documentan en `.env.example`. Alcanzar un límite de frames o duración produce un análisis parcial identificado por `procesamiento.parcial` y advertencias. El inicio de la API no descarga pesos ni instala bibliotecas de visión.
