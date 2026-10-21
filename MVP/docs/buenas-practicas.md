# Buenas prácticas para mantener el MVP

## Código y documentación

La aplicación mantenida vive en `FUTAI_DEMO_INTEGRADA/FUTAI_DEMO/`. Los experimentos de Colab permanecen en `Procesamiento/`; los duplicados anteriores no se agregan a nuevos commits. No mover la aplicación sin actualizar primero las rutas del backend, las plantillas de entorno y los scripts de inicio.

Mantener cada explicación en un lugar principal: instalación en `docs/instalacion.md`, arquitectura en `docs/arquitectura.md`, resultados de pruebas en `docs/validacion.md` y contrato detallado del motor en `backend/vision/README.md`. Los README cercanos al código sirven de entrada y enlazan esas guías. Un diagrama de planificación debe identificarse como histórico o propuesto.

Documentar lo implementado: la landing contiene simulaciones; `/demo` muestra resultados importados o procesados; detección/tracking no equivale a identidad permanente del jugador, equipos ni diagnóstico biomecánico.

## Dependencias y configuración

- Versionar `package-lock.json` y usar `npm ci` para instalar el frontend.
- Mantener API y visión en entornos separados. Usar los `requirements*.txt` correspondientes, sin copiar entornos virtuales al repositorio.
- Versionar `.env.example` con valores de ejemplo, nunca el `.env` de cada equipo. Las variables `VITE_*` se incorporan al frontend y no sirven para guardar secretos.
- Registrar cambios relevantes de dependencias y comprobar `pip check`. Si se necesita una reproducción estricta, generar un archivo de versiones probadas para cada entorno y plataforma, sin mezclar la API con el motor.

## Datos y experimentos

Guardar videos, pesos y resultados locales en las ubicaciones documentadas, excluidas de Git. Mantener en el repositorio muestras pequeñas deliberadas, como el JSON inicial. No aplicar una exclusión global a todo `*.json`, `*.csv` o `*.png`.

Los notebooks se revisan igual que el código: celdas, parámetros, salidas y metadatos. Para agregar una evidencia a la documentación, seleccionarla, darle contexto/fecha y explicar cómo repetirla. Los resultados deportivos conservan `PROVISIONAL_NO_VALIDADO` mientras no exista validación de mediciones.

## Cambios y colaboración

Trabajar en una rama, hacer commits que describan un cambio concreto y revisar las diferencias antes de subir. Para integrar a la rama compartida, utilizar pull requests con problema, solución y validación. Los cambios sólo documentales se verifican con enlaces y reglas de Git; cambios del motor requieren las pruebas de comportamiento pertinentes.

No se añadió una licencia automáticamente: el equipo debe acordar la licencia del proyecto y revisar las condiciones de sus dependencias/datos antes de publicar una declaración de licencia.
