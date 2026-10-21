// Planes comerciales y pasos del piloto.

export const PLANS = [
  {
    name: 'Plan Formativo',
    audience: 'Academias y fútbol formativo',
    icon: 'graduation',
    volume: '~5 partidos / mes',
    priceNote: 'Suscripción mensual por academia',
    features: [
      'Hasta 5 partidos procesados por mes',
      'Tracking de 22 jugadores + balón con IDs persistentes',
      'Métricas MVP: distancia, velocidad máxima, sprints y mapas de calor',
      'Fantasma Táctico por línea (defensa, medio, ataque)',
      'Reporte por partido listo para el cuerpo técnico',
      'Historial de la temporada en curso',
    ],
    cta: 'Solicitar cotización',
  },
  {
    name: 'Plan Profesional',
    audience: 'Clubes de Primera y Segunda División',
    icon: 'trophy',
    volume: 'Ilimitado · alto volumen',
    priceNote: 'Suscripción mensual por club',
    highlight: true,
    features: [
      'Partidos ilimitados con prioridad de procesamiento GPU',
      'Todo lo incluido en el Plan Formativo',
      'Huella de Fatiga Biomecánica y alertas de sobrecarga',
      'Historial biomecánico multi-temporada por jugador',
      'Almacenamiento en la nube de videos y series temporales',
      'Auditoría táctica completa vs esquema del DT, por fase de juego',
      'API REST y exportación CSV/JSON para el área de datos',
      'Onboarding dedicado y soporte prioritario',
    ],
    cta: 'Solicitar cotización',
  },
];

export const PILOT_STEPS = [
  {
    when: 'Semana 1–2',
    title: 'Onboarding',
    text: 'Carga de partidos históricos, calibración de cancha y configuración del esquema táctico del DT.',
  },
  {
    when: 'Mes 1–2',
    title: 'Auditoría técnica',
    text: 'Reportes de tracking, fatiga y posicionamiento validados en reuniones con el cuerpo técnico.',
  },
  {
    when: 'Expansión',
    title: 'Plan a medida',
    text: 'El club elige el plan según su volumen real. Sin cámaras que comprar ni contratos de hardware.',
  },
];
