# FUT.AI — MVP

Aplicación local para detectar y seguir personas en videos de fútbol con YOLO + ByteTrack + OpenCV. Incluye FastAPI, SQLite y un frontend React/Vite con landing y dashboard en `/demo`.

El dashboard importa resultados JSON o procesa videos y ofrece MP4 anotado, CSV de tracks y JSON de métricas. Permite elegir elipses en los pies o cajas; las métricas físicas siguen siendo provisionales y requieren calibración válida.

## Empezar

- [Instalación y uso local](docs/instalacion.md)
- [Guía rápida de la aplicación](FUTAI_DEMO_INTEGRADA/FUTAI_DEMO/INICIO_RAPIDO.md)
- [Índice de documentación](docs/README.md)
- [Qué subir y cómo usar GitHub Desktop/consola](docs/git-y-github.md)

## Estructura mantenida

```text
MVP/
  README.md
  .gitignore
  .gitattributes
  docs/                              Guías, arquitectura, validación y diagramas
  FUTAI_DEMO_INTEGRADA/FUTAI_DEMO/
    backend/                         API, motor, tests y dependencias
    frontend/                        Código React, recursos y package-lock.json
    INICIAR_BACKEND.bat
    INICIAR_FRONTEND.bat
    CONFIGURAR_PROCESAMIENTO.bat
    VERIFICAR.bat
    INICIO_RAPIDO.md                  Entrada breve a las guías
  Procesamiento/                     Notebooks y scripts de investigación
```

La aplicación conserva su ubicación para mantener las rutas existentes. `FrontEnd/` es una copia histórica; `BackEnd/` y `docker-compose.yml` son una estructura inicial vacía. Se mantienen localmente, excluidos de nuevos commits. El diagrama histórico fue trasladado a [docs/diagramas/](docs/diagramas/README.md).

## Código y recursos locales

Se versionan código, tests, notebooks revisados, dependencias declaradas, plantillas de configuración, logos, scripts y documentación. La muestra `backend/data/demo_parcial_provisional.json` también se incluye para ejecutar la demo sin inferencia.

Los entornos virtuales, `node_modules`, `.env`, videos, pesos, SQLite, resultados y ZIP/RAR quedan fuera de Git. Permanecen en el disco; para preparar otra máquina, consultar [Datos y modelos](docs/datos-y-modelos.md).

El repositorio Git real está en la carpeta superior `PTY4614_800D_Fut.ai/`, junto a las evidencias académicas de las fases. La guía de Git reutiliza ese repositorio y su rama de trabajo existente.
