# FUT.AI — Inicio rápido

Esta es la aplicación mantenida: backend FastAPI/SQLite, frontend React/Vite y motor YOLO + ByteTrack + OpenCV.

## Iniciar en Windows

1. En una copia nueva, seguir [Instalación y uso local](../../docs/instalacion.md). Requisitos: Python 3.11, Node.js y npm.
2. Ejecutar `INICIAR_BACKEND.bat` y `INICIAR_FRONTEND.bat` en terminales separadas.
3. Abrir http://localhost:5173/demo. La API está en http://127.0.0.1:8000 y su documentación en http://127.0.0.1:8000/docs.
4. Para inferencia real, obtener los pesos según [Datos y modelos](../../docs/datos-y-modelos.md), ejecutar `CONFIGURAR_PROCESAMIENTO.bat` y reiniciar el backend.
5. Para comprobar la instalación, ejecutar `VERIFICAR.bat`; las pruebas de inferencia real se explican en [Validación](../../docs/validacion.md).

La importación JSON y la muestra inicial funcionan sin el motor habilitado. La previsualización local no procesa el video. Al crear un trabajo se elige elipses o cajas; cada resultado conserva sus propias descargas. Sin calibración, distancia y velocidad quedan sin datos.

## Guías

- [Instalación, configuración y operación](../../docs/instalacion.md)
- [Arquitectura, endpoints y contratos](../../docs/arquitectura.md)
- [Datos, modelos y archivos excluidos de Git](../../docs/datos-y-modelos.md)
- [Pruebas y registro de validación](../../docs/validacion.md)
- [GitHub Desktop y consola](../../docs/git-y-github.md)
- [Contrato detallado del motor y calibración](backend/vision/README.md)
- [Índice completo](../../docs/README.md)

La documentación técnica se mantiene en `MVP/docs/` para evitar duplicar instrucciones. La calibración integrada sigue siendo para cámara fija y los resultados mantienen `PROVISIONAL_NO_VALIDADO`.
