# FUT.AI — Estado de proyecto (Chat Maestro)

**Fecha:** 19 de octubre de 2026.  **Alcance:** segundo avance universitario y planificación del MVP.

## Fuente de verdad y cautelas
Este archivo resume evidencia disponible en archivos del Proyecto y Library recuperados desde el trabajo del chat 02, además del SRS v3. No certifica que el sistema extremo a extremo funcione. Actualizar cada estado después de la prueba correspondiente.

## Objetivo del MVP (SRS v3)
Usuario fijo → crear partido → subir MP4 → marcar al menos 4 puntos de cancha → procesar (detección, tracking, homografía, distancia y velocidad) → consultar tabla por `track_id`. Implementar inicialmente monolito modular Python + frontend React separado. Se posponen clasificación por equipo, número/dorsal, mapas de calor, biometría y otras mejoras.

## Avance del motor de visión — evidencias recuperadas
- Archivo `reporte_calidad.json` para `prueba2_20s.mp4`: 500 fotogramas a 25 FPS (20 s), 428/500 fotogramas con homografía (85,6 %), 11.233 observaciones de tracking y 8.504 observaciones en cancha/calibradas.
- Archivo `prueba_20s_homografia_frame_375.json`: entrada `/content/prueba_20s_yolo11s.csv`; homografía de un fotograma (375), RMSE de ajuste reportado 0,180 m; las dimensiones de campo 105 × 68 m son supuestas.
- Se recuperó otro archivo de homografía para fotograma 125 (RMSE 0,253 m); también existe referencia a prueba 2 con homografía.
- Hay un `resultados_para_backend_PROVISIONALES.json` con filas de `track_id`, distancia observada, velocidad máxima estimada, duración, tramos y marca `PROVISIONAL_NO_VALIDADO`.
- `FUTAI_Fase5_Validacion_Metricas_Colab.ipynb` prepara auditorías, gráficos y exportaciones; el notebook recuperado tiene celdas sin execution_count, por lo que su ejecución completa no está certificada por ese artefacto.
- No se pudo recuperar de manera íntegra el texto del chat 02; la implementación exacta del algoritmo de tracking y su correcta ejecución integrada deben confirmarse en código y demo.

## Riesgos conocidos (no ocultar)
- `85,6 %` es cobertura de homografía, **NO** precisión de detección/tracking ni exactitud de distancia.
- Fragmentación de `track_id` en oclusiones; pérdida de calibraciones; deriva Optical Flow con movimiento de cámara; pies estimados por el borde inferior del bbox.
- Las dimensiones 105 x 68 metros para la cancha NO están verificadas; las métricas de velocidad y distancia no han sido validadas contra valores reales.
- La homografía estática es local al fotograma calibrado o un período sin movimiento de cámara significativo.

## Estado de integración
- Frontend recibido y revisado previamente: React 18 + Vite 5 + Tailwind CSS; principalmente landing promocional y simulación con datos ficticios, no dashboard conectado al procesamiento real.
- Backend FastAPI/monolito Python: arquitectura y requisitos definidos; no hay prueba de servicio desplegado y conectado con frontend.
- MVP exige RF-01..RF-13 del SRS v3; progreso real de Sebastián y Cristóbal debe reconfirmarse para evitar duplicar trabajo.

## Estimaciones orientativas (NO son tiempos garantizados)
- Demostración convincente del motor con 20 s, resultados verificados visualmente y limitaciones explícitas: ~2–5 h si los artefactos originales siguen disponibles; si falta el video o se perdió el entorno, más tiempo.
- Validación básica sobre varios videos y saneamiento de métricas exploratorias: ~1–3 días de trabajo concentrado. Validación de precisión física real: varios días o semanas según grabaciones y datos de referencia.
- Demo web mostrando **resultados preprocesados** desde JSON: 4–10 horas-persona para endpoint + pantalla + integración rápida, asumiendo que el código base está ejecutable.
- Web real que procesa nuevos MP4 de principio a fin y almacena resultados: ~2–5 días de trabajo del equipo si el pipeline es portable y el backend existe; más si aparecen incompatibilidades.
- MVP completo de la SRS v3 con login, partidos, subida, calibración, procesamiento, persistencia, estados y tabla: ~1–3 semanas con trabajo paralelo coordinado del equipo y pruebas, sujeto al estado real del backend/frontend.

## Orden de acciones inmediatas
1. Congelar los resultados y notebook actuales; descargar sus salidas a un lugar seguro.
2. Ejecutar y grabar demo verificable del clip de 20 s: detecciones, IDs y tabla exploratoria, sin vender los valores como precisos.
3. Revisar IDs/oclusiones y visualización sobre al menos algunos fotogramas/segundos; documentar limitaciones.
4. Hacer demo de presentación con video/tabla precomputada; reservar margen para pruebas y ensayo.
5. Para integración, definir JSON estable (`procesamiento`, `metricas_por_track`) y un endpoint FastAPI que lo sirva.
6. Crear panel React/Vite mínimo con selector de partido y tabla real; integrar luego botón de procesamiento con backend local, no depender de Colab como servidor web.
7. Codex: usarlo para migrar notebooks probados a `processing/`, APIs, validaciones y pruebas, preservando el comportamiento existente.

## Responsable sugerido según SRS
- Héctor: motor IA, tracking, homografía y métricas.
- Sebastián: backend FastAPI, uploads, endpoints, almacenamiento.
- Cristóbal: frontend React/Vite, formulario de calibración, estado y tabla.
- Renato: coordinación, documentación y presentación.

## Próxima actualización de estado
Indicar: último notebook realmente ejecutado; si `prueba2_20s.mp4` y MP4 anotado están guardados; si ByteTrack está activo y se han revisado IDs; si existe endpoint FastAPI probado; si React consume datos reales; fecha/hora exacta de la presentación.
