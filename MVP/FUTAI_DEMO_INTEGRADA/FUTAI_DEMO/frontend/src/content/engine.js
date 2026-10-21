// Nombre del motor propietario que agrupa todo el pipeline de visión.
export const ENGINE_NAME = 'FUT.AI Vision Engine';

export const ENGINE_MODULES = [
  {
    title: 'Ingesta universal',
    icon: 'video',
    description:
      'Acepta cualquier MP4: trípode, drone, transmisión de TV o smartphone. Calibra la cancha y proyecta cada cuadro a coordenadas reales de 105 × 68 m.',
  },
  {
    title: 'Muestreo inteligente',
    icon: 'layers',
    description:
      'Procesa entre 5 y 10 cuadros por segundo según la intensidad del juego, sin perder sprints, duelos ni transiciones.',
  },
  {
    title: 'Detección especializada',
    icon: 'target',
    description:
      'Modelos entrenados específicamente para fútbol que distinguen jugadores, árbitros y balón en tomas abiertas.',
  },
  {
    title: 'Identidad persistente',
    icon: 'scan',
    description:
      'Cada jugador conserva su ID durante cruces, oclusiones y jugadas a balón parado, los 90 minutos.',
  },
  {
    title: 'Biomecánica sin sensores',
    icon: 'activity',
    description:
      'Estimación esquelética de 17 puntos clave por jugador para medir zancada, asimetría y fatiga, sin GPS ni wearables.',
  },
  {
    title: 'Nube escalable',
    icon: 'cloud',
    description:
      'Procesamiento con GPU bajo demanda que escala por partido, con dashboard para el cuerpo técnico y API para el área de datos.',
  },
];
