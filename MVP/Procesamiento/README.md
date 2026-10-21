# Investigación y experimentos

Esta carpeta conserva notebooks y scripts de las fases de detección, tracking, homografía y validación de métricas. El motor usado por la web está en [backend/vision](../FUTAI_DEMO_INTEGRADA/FUTAI_DEMO/backend/vision/README.md).

Se versionan los `.py`, los `.ipynb`, este README y `requirements.txt`. Los videos, pesos, entornos y resultados CSV/JSON/PNG generados en las carpetas experimentales se conservan localmente y están excluidos por [MVP/.gitignore](../.gitignore).

Los notebooks incluyen configuración para Colab y rutas `/content`; no se ejecutan automáticamente al iniciar la API. Antes de subir un notebook, revisar celdas, metadatos y salidas, y limpiar las salidas voluminosas o con información de la cuenta.

`requirements.txt` es una referencia del entorno experimental original. Para instalar la aplicación actual se utilizan los archivos `requirements*.txt` de su backend; no se mezclan ambos entornos.

Los pesos y clips se obtienen por separado siguiendo [Datos y modelos](../docs/datos-y-modelos.md). La ausencia de esos archivos en Git no impide ejecutar la landing ni importar JSON en `/demo`.
