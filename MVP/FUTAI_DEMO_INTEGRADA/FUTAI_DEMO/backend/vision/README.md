# Motor de visión opcional

El API y la demo de JSON precalculado no importan OpenCV, Ultralytics ni PyTorch. Cada trabajo ejecuta un proceso y una instancia YOLO independientes; ByteTrack se solicita explícitamente con `tracker="bytetrack.yaml"` y `persist=True`. Los frames y CSV se escriben de forma incremental. Las métricas conservan solamente un estado por ID.

Desde `backend`, usando el Python del entorno de visión:

```powershell
.\.venv-vision\Scripts\python.exe -m vision.worker --request C:\ruta\trabajo\request.json
```

`request.json` (todas las rutas absolutas; entrada fuera de la carpeta de salida):

```json
{
  "input_path": "C:/ruta/trabajo/input.mp4",
  "output_dir": "C:/ruta/trabajo/artifacts",
  "video_name": "partido.mp4",
  "model_path": "C:/ruta/Procesamiento/yolov8n.pt",
  "device": "cpu",
  "image_size": 640,
  "max_frames": 0,
  "max_seconds": 0,
  "confidence": 0.1,
  "max_speed_kmh": 45,
  "annotation_style": "ellipses",
  "calibration": null
}
```

`max_frames` y `max_seconds` en cero no limitan el video; si ambos están configurados se aplica el menor. `image_size` debe ser múltiplo de 32 entre 32 y 2048. Los pesos `.pt` deben existir: no se descargan modelos ni dependencias durante un trabajo. Usar únicamente pesos locales de confianza. Instalar previamente `requirements-vision.txt` en un entorno separado y configurar su Python en el API.

`annotation_style` admite `ellipses` (predeterminado) y `boxes`. El selector de `/demo` envía este valor en el formulario `POST /api/jobs`; también queda registrado en `procesamiento.annotation_style`. Solo cambia el dibujo del MP4 nuevo: los IDs, coordenadas CSV, homografía y métricas conservan su cálculo original. El dibujo se realiza sobre una copia del frame, después de registrar las observaciones.

Para elipses se reutilizan `supervision.EllipseAnnotator` y `LabelAnnotator`, con IDs encima de cada jugador y colores estables por track (no representan equipos). La dependencia es opcional y se instala únicamente en el entorno de visión con `python -m pip install -r requirements-annotations.txt` desde `backend`; se verificó Supervision 0.31.1 con NumPy 2.4.6 y OpenCV 5.0.0.93. Si no está disponible o su API no es compatible, se dibujan las elipses y etiquetas con OpenCV. El estilo cajas utiliza OpenCV.

Calibración opcional **solo para cámara fija**:

```json
{
  "mode": "static",
  "image_points": [[100, 100], [900, 100], [900, 600], [100, 600]],
  "field_points": [[0, 0], [105, 0], [105, 68], [0, 68]],
  "field_size": [105, 68]
}
```

Las coordenadas son correspondencias reales del mismo plano, no valores de ejemplo para reutilizar. Se validan al menos cuatro puntos distintos no colineales, dimensiones de imagen/cancha, estabilidad y error de reproyección. Solo se aceptan posiciones dentro de la cancha. Una homografía fija deja de ser válida al mover la cámara, hacer zoom o cambiar de toma; para esos videos dejar `calibration: null` o generar resultados con un pipeline externo de homografía dinámica validada. No se incluye una estimación automática de homografía ni se promete identidad permanente por jugador.

Los artefactos son `result.json` (mismo esquema que `/demo`), `tracks.csv`, `video.mp4` y `progress.json`. CSV común: `frame,tiempo_s,track_id,class_id,x1,y1,x2,y2,confidence,x_pixel,y_pixel,x_metro,y_metro`. Sin calibración las columnas métricas están vacías y las distancias/velocidades JSON son `null`. Con calibración se suman pasos contiguos observados y se descartan saltos sobre el límite de velocidad; no se rellenan oclusiones. `duracion_observada_s` cuenta frames observados, no tiempo entre primera y última detección. La cobertura de homografía informa frames con una transformación disponible; no certifica precisión.

`progress.json` se reemplaza atómicamente con `{progress,stage,message,processed_frames,total_frames}`. Las etapas son `loading`, `tracking`, `encoding`, `completed` o `failed`. En error el proceso termina con código 1 y `error.json: {"error":"..."}`; no publica `result.json` parcial. Los CSV/videos parciales no deben servirse como análisis completos.

Si FFmpeg está en PATH o instalado con `imageio-ffmpeg`, se genera H.264/yuv420p con faststart y se indica `procesamiento.video_browser_compatible: true`. Si falla o falta, se conserva MPEG-4 Part 2, se marca `false` y se muestra una advertencia; el frontend debe ofrecer descarga. El video anotado no conserva audio. Los resultados mantienen siempre `PROVISIONAL_NO_VALIDADO`.
