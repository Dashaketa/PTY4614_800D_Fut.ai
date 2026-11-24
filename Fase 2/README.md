# Fase 2 · Desarrollo del proyecto

Actualizada el 15 de noviembre de 2026 para que coincida con lo que realmente se construyó: motor de visión local, servidor FastAPI y plataforma web con datos en archivos JSON y CSV. La primera versión describía un pipeline en Google Cloud que se probó con otro modelo y se descartó.

## Contenido

| Pauta | Archivo |
|---|---|
| Evidencias Individuales | Diarios de reflexión 2.1 de cada integrante |
| Evidencias Grupales | `2.4_GuiaEstudiante_Fase 2_DesarrolloProyecto APT.docx` |
| Evidencias Grupales | `2.6_GuiaEstudiante_Fase 2_Informe Final Proyecto APT.docx` |
| Evidencias Proyecto · documentación | `Entregables_Metodologia_Agil/00` a `10` |
| Evidencias Proyecto · diagramas | `Entregables_Metodologia_Agil/Diagramas/*.png` (hechos con Archify) |
| Evidencias Proyecto · diagramas interactivos | `Entregables_Metodologia_Agil/Diagramas/interactivos/*.html`, con recorrido guiado |

Los diagramas también están publicados en **[futai-diagramas.netlify.app](https://futai-diagramas.netlify.app)**.

## Qué cambió respecto de la primera versión

- **Arquitectura:** de Google Cloud (Cloud Run, Cloud SQL, Docker) al motor local; los datos viven en archivos, no en una base SQL.
- **Motor:** YOLO + ByteTrack + calibración con 32 puntos, en lugar de Roboflow + BoT-SORT.
- **Producto:** se agregaron cuentas y espacios por equipo, registro con pago de prueba (Webpay Plus) y panel de administración.
- **Roles:** Sebastián López (líder técnico y desarrollador principal), Héctor Arriagada (motor de visión e infraestructura: seguimiento, identidad y migración a Azure), Renato Palma (investigación y nube: prueba en Google Cloud) y Cristóbal Sepúlveda (calidad de entregables).
- **Resultados:** medidos sobre 5 partidos reales y validados contra SoccerTrack v2.
