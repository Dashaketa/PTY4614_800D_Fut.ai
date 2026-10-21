# FUT.AI · Frontend

Interfaz mantenida con React 18, Vite 5, Tailwind CSS 3 y Anime.js 3. Incluye la landing ilustrativa y el centro de análisis conectado a FastAPI.

La preparación y el inicio están en el [índice de documentación](../../../docs/README.md). Ver [Arquitectura y API](../../../docs/arquitectura.md), [Validación](../../../docs/validacion.md) y [Datos y modelos locales](../../../docs/datos-y-modelos.md).

## Pantallas

| Ruta | Funcionalidad |
| --- | --- |
| `/` | Landing, navegación por secciones, simulación táctica SVG, paneles ilustrativos, tecnología y contacto por correo. |
| `/demo` | Salud de API/motor, importación JSON, historial, procesamiento de video con progreso, evidencia y tabla por trayectoria. |

`src/main.jsx` selecciona `/demo` y `/demo/` por pathname; las demás rutas muestran la landing. No se utiliza React Router.

La landing conserva jugadores y telemetría de ejemplo. En `/demo`, los resultados proceden de muestra inicial, JSON importados o trabajos locales. Su origen y el estado provisional se muestran explícitamente. Las métricas ausentes se presentan como “—”.

## Flujos del dashboard

- **Importar resultados JSON:** envía el archivo a la API y abre el análisis devuelto por ID. Conserva el flujo externo de Colab.
- **Procesar video:** envía MP4, WebM o MOV, calibración opcional y estilo de anotación; consulta progreso y recupera el trabajo tras recargar.
- **Estilo de anotación:** elipses en los pies por defecto o cajas. Se envía como `annotation_style` y sólo cambia el nuevo MP4. IDs y colores siguen al track, sin representar equipos; CSV, homografía y métricas conservan su cálculo.
- **Historial y evidencia:** selecciona análisis anteriores y abre su video anotado, CSV y JSON mediante enlaces del backend al trabajo exacto.
- **Previsualización local:** usa un objeto URL del navegador; no sube el archivo ni ejecuta inferencia. No vincula automáticamente ese video con un análisis.
- **Tabla:** ordena distancia, velocidad, duración e ID; conserva la distinción entre tracks y personas identificadas.

La calibración integrada corresponde a cámara fija. Sin calibración no se muestran metros ni velocidades estimadas. Los resultados mantienen `PROVISIONAL_NO_VALIDADO`; revisar sus límites en la [arquitectura](../../../docs/arquitectura.md).

## Estructura

```text
src/
  main.jsx
  pages/
    LandingPage.jsx       Presentación
    DemoPage.jsx          Centro de análisis
  hooks/
    useAnalysisData.js    Salud, selección e historial
    useProcessingJob.js   Envío, seguimiento y recuperación del trabajo
  components/
    demo/
      ProcessingPanel.jsx  Video, calibración y selector elipses/cajas
      AnalysisEvidence.jsx Video y descargas/previsualización
      TrackTable.jsx       Tabla ordenable con valores ausentes
      Panel.jsx            Contenedores e indicadores
    layout/               Navbar y Footer
    ui/                   Icon, Logo, SectionHeader y AnimatedNumber
  sections/
    hero/                 Demo SVG y simulación ilustrativa
    metrics/              Cifras de presentación
    features/             Pestañas y paneles de ejemplo
    technology/           Animación del motor ligada al scroll
    plans/                Planes y contacto del piloto
  lib/
    api.js                Cliente HTTP, errores y URLs de artefactos
    analysis.js           Formato, valores ausentes y etiquetas de origen
    motion.js             Animación y preferencias de movimiento
    math.js, format.js    Utilidades de la landing
  content/                Textos y datos ilustrativos editables
  config/site.js          Contacto y navegación
  styles/index.css        Tailwind y estilos globales
public/                   Logos y favicon
design/logos-originales/   Respaldo de marca
```

## Configuración y comandos

`src/lib/api.js` usa `VITE_API_URL` o `http://127.0.0.1:8000`. Vite no configura proxy de API. Las llamadas HTTP se centralizan en ese cliente y los artefactos sólo aceptan rutas del backend con el patrón previsto.

Desde esta carpeta, con dependencias preparadas:

```powershell
npm run dev
npm run build
npm run preview
```

`build` genera `dist/`. Las instrucciones de inicio del proyecto y de pruebas de navegador están centralizadas en la documentación enlazada arriba.

## Convenciones

- Componentes React en `PascalCase.jsx`; hooks, clientes y datos en archivos `.js`.
- El alias `@/` apunta a `src/`; mantener las llamadas de red en `lib/api.js`.
- Conservar avisos provisionales, origen y valores ausentes al modificar el dashboard.
- Mantener la simulación de la landing independiente de los análisis persistidos.
- Las animaciones respetan `prefers-reduced-motion` y la visibilidad de la sección.
- Consultar el historial por ID; los artefactos del análisis seleccionado no deben depender del último resultado.
