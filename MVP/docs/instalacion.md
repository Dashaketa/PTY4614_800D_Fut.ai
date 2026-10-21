# Instalación y uso local

## Ubicación

Después de clonar el repositorio, entrar en `PTY4614_800D_Fut.ai/MVP/`. La aplicación está en `FUTAI_DEMO_INTEGRADA/FUTAI_DEMO/`. Necesitas Python 3.11, Node.js y npm. No copies `.venv`, `node_modules` o `.env` de otro equipo.

## Demo e importación JSON

Desde `MVP/` puedes preparar la API y el frontend con PowerShell:

```powershell
Set-Location .\FUTAI_DEMO_INTEGRADA\FUTAI_DEMO
py -3.11 -m venv backend\.venv
.\backend\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
if (-not (Test-Path backend\.env)) {
    Copy-Item backend\.env.example backend\.env
}
npm --prefix frontend ci
```

Abrir dos terminales o ejecutar los dos BAT:

1. `INICIAR_BACKEND.bat`: API en http://127.0.0.1:8000 y documentación en http://127.0.0.1:8000/docs.
2. `INICIAR_FRONTEND.bat`: sitio en http://localhost:5173 y dashboard en http://localhost:5173/demo.

Los BAT crean/instalan lo que falta para la API/frontend. Usar una sola instancia del backend; la cola local tiene un único ejecutor. Los puertos son fijos para mantener la configuración CORS.

Comandos manuales desde la carpeta correspondiente:

```powershell
# En backend/
.\.venv\Scripts\python.exe -m uvicorn app:app --host 127.0.0.1 --port 8000 --workers 1

# En frontend/, en otra terminal
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

La muestra inicial de ocho tracks se crea sólo cuando la base está vacía. **Importar resultados JSON** permite cargar resultados de Colab de hasta 5 MB. Este modo no necesita los pesos YOLO ni las dependencias de visión.

## Habilitar procesamiento real

1. Obtener `yolov8n.pt` como indica [Datos y modelos](datos-y-modelos.md) y guardarlo en `MVP/Procesamiento/`.
2. Desde la carpeta de la aplicación, ejecutar `CONFIGURAR_PROCESAMIENTO.bat`.
3. Reiniciar el backend y comprobar `GET /api/health`: `processing.enabled` y `processing.ready` deben ser verdaderos. `reason` explica una configuración incompleta.

La configuración reutiliza `Procesamiento/.venv` si existe; de lo contrario crea `backend/.venv-vision`. No instala bibliotecas pesadas en el entorno de la API. Escribe en el `.env` local las rutas de Python/modelo y activa el motor. El arranque normal no descarga pesos ni instala dependencias automáticamente durante un trabajo.

Para reutilizar otro entorno/modelo, desde la carpeta de la aplicación:

```powershell
.\backend\.venv\Scripts\python.exe .\backend\configure_processing.py --python "C:\ruta\entorno\Scripts\python.exe" --model "C:\ruta\yolov8n.pt"
```

Para Supervision, instalar opcionalmente `backend/requirements-annotations.txt` **con el Python de visión elegido**, desde `backend/`. Si no está instalado, elipses y etiquetas utilizan OpenCV. Ver [Motor de visión](../FUTAI_DEMO_INTEGRADA/FUTAI_DEMO/backend/vision/README.md).

## Uso del dashboard

- Seleccionar un MP4, WebM o MOV y elegir **Elipses en los pies** o **Cajas de detección** antes de pulsar **Procesar video**. La previsualización local no ejecuta inferencia.
- Seguir el progreso; cada trabajo completado conserva su análisis, MP4 anotado, CSV y JSON. El historial permite volver a otro resultado.
- Sin calibración, distancia y velocidad son `null` y se muestran como “—”. La calibración web actual es estática y requiere cámara fija; los notebooks de homografía dinámica siguen siendo un flujo externo importable.
- Los MP4 previos conservan su anotación original. Los resultados permanecen provisionales y el video anotado no conserva audio.

## Configuración por equipo

`backend/.env.example` documenta CPU, tamaño de inferencia, confianza, máximo de subida y límites. Las rutas relativas se resuelven desde `backend/`. Los valores iniciales permiten hasta 200 MB por subida y procesan hasta 120 segundos de video; el límite de cómputo por trabajo es 1800 segundos. Un clip más largo produce un resultado parcial identificado.

La GPU es opcional y requiere configurar Torch/CUDA en el entorno de visión. El modo CPU mantiene la configuración inicial. Para volver a la presentación sin inferencia, establecer `FUTAI_PROCESSING_ENABLED=false` y reiniciar el backend.

El frontend usa `VITE_API_URL` o `http://127.0.0.1:8000`. Su `.env.example` es una plantilla; los cambios de URL/origen deben concordar con CORS. Esta configuración es una demo local sin autenticación; la publicación del código en GitHub no despliega automáticamente la aplicación.
