// Capacidades de la sección Características.

export const FEATURES = [
  {
    id: 'ghost',
    icon: 'ghost',
    tag: 'Auditoría táctica',
    title: 'Fantasma Táctico',
    description:
      'Superponemos el esquema del DT sobre la posición real de cada jugador, cuadro a cuadro: quién rompe la estructura, cuándo y por cuántos metros.',
    bullets: [
      'Esquema base por fase de juego: 4-3-3, 4-4-2, 3-5-2 o personalizado',
      'Desvío en metros por jugador y por línea',
      'Alertas de quiebre sincronizadas con el minuto del video',
    ],
  },
  {
    id: 'fatigue',
    icon: 'activity',
    tag: 'Prevención de lesiones',
    title: 'Huella de Fatiga',
    description:
      'Comparamos la mecánica de carrera de cada jugador contra sus propios primeros 15 minutos para detectar la fatiga antes de que se convierta en lesión.',
    bullets: [
      'Asimetría de zancada izquierda/derecha en piques',
      'Riesgo de sobrecarga por jugador y por partido',
      'Historial biomecánico para planificar cargas',
    ],
  },
  {
    id: 'tracking',
    icon: 'scan',
    tag: 'Identidad de jugadores',
    title: 'Tracking Persistente',
    description:
      'Cada jugador y el balón conservan su identidad los 90 minutos, incluso en cruces, oclusiones y jugadas a balón parado.',
    bullets: [
      'Recupera jugadores tapados sin cambiarles el ID',
      'Re-identificación por equipo según color de camiseta',
      'Posiciones en coordenadas reales de cancha (105 × 68 m)',
    ],
  },
];
