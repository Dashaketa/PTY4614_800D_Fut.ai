# Fase 2 · versión 2

Versión ajustada al producto final (15 de noviembre de 2026). La [Fase 2 original](../Fase%202) describía un pipeline en Google Cloud que se probó con otro modelo y se descartó; esta versión describe lo que realmente se construyó: motor de visión local, servidor FastAPI y plataforma web con datos en archivos JSON y CSV.

## Contenido

| Pauta | Archivo | Estado |
|---|---|---|
| Evidencias Grupales | `2.4_GuiaEstudiante_Fase 2_DesarrolloProyecto APT.docx` | Reescrita |
| Evidencias Grupales | `2.6_GuiaEstudiante_Fase 2_Informe Final Proyecto APT.docx` | Reescrita |
| Evidencias Proyecto · documentación | `Entregables_Metodologia_Agil/00` a `10` | Reescritos |
| Evidencias Proyecto · diagramas | `Entregables_Metodologia_Agil/Diagramas/*.png` | Nuevos (Archify) |
| Evidencias Proyecto · diagramas interactivos | `Entregables_Metodologia_Agil/Diagramas/interactivos/*.html` | Nuevos, con recorrido guiado |

También publicados en **[futai-diagramas.netlify.app](https://futai-diagramas.netlify.app)**.

Los diarios individuales 2.1 y las planillas de evaluación siguen en la carpeta [Fase 2](../Fase%202).

## Qué cambió respecto de la versión 1

- **Arquitectura:** de Google Cloud (Cloud Run, Cloud SQL, Docker) al motor local; los datos viven en archivos, no en una base SQL.
- **Motor:** YOLO + ByteTrack + calibración con 32 puntos, en lugar de Roboflow + BoT-SORT.
- **Producto:** se agregaron cuentas y espacios por equipo, registro con pago de prueba (Webpay Plus) y panel de administración.
- **Metodología:** Scrum hasta el 18 de octubre y Kanban después.
- **Roles:** Sebastián López (motor, servidor y web), Héctor Arriagada (motor), Renato Palma y Cristóbal Sepúlveda (documentación).
- **Resultados:** medidos sobre 5 partidos reales y validados contra SoccerTrack v2.
