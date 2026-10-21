export const EYE_STAGES = [
  {
    label: 'Visión',
    title: 'Un ojo entrenado para el fútbol',
    text: 'FUT.AI Vision Engine mira el partido como lo haría un analista, cuadro a cuadro, sin cámaras especiales ni sensores.',
  },
  {
    label: 'Ingesta',
    title: 'Cualquier video, un mismo análisis',
    text: 'MP4 de trípode, drone, transmisión de TV o celular. El motor calibra la cancha a 105 × 68 m y muestrea entre 5 y 10 cuadros por segundo.',
  },
  {
    label: 'Detección',
    title: 'Cada jugador, árbitro y balón',
    text: 'Modelos entrenados específicamente para fútbol reconocen a los 22 jugadores y al balón en tomas abiertas.',
  },
  {
    label: 'Tracking',
    title: 'Identidad persistente, 90 minutos',
    text: 'Cada jugador conserva su ID durante cruces, oclusiones y jugadas a balón parado. Así cada métrica tiene dueño.',
  },
  {
    label: 'Biomecánica',
    title: '17 puntos por jugador',
    text: 'La estimación esquelética mide zancada y asimetría frente a la línea base del propio jugador, para anticipar la fatiga.',
  },
  {
    label: 'Fantasma Táctico',
    title: 'El esquema del DT contra la realidad',
    text: 'Superponemos la posición ideal de cada jugador sobre la real y medimos el desvío en metros, por jugador y por línea.',
  },
  {
    label: 'Métricas',
    title: 'Todo, en un solo reporte',
    text: 'El análisis se desarma en métricas accionables para el cuerpo técnico: velocidad, distancia, sprints, asimetría y desvío táctico.',
  },
];

export const EYE = { x: 400, y: 260 };
export const EYE_TEAM_COLORS = { home: '#00e676', away: '#00d2ff' };

// Trazos del ojo: contorno principal y trazos exteriores, como en el logo.
export const EYE_LINES = [
  { x0: 40, x1: 760, base: 260, amp: 400, dir: -1, width: 3, opacity: 1, draw: [0, 0.55] },
  { x0: 40, x1: 760, base: 260, amp: 400, dir: 1, width: 3, opacity: 1, draw: [0, 0.55] },
  { x0: 10, x1: 790, base: 248, amp: 470, dir: -1, width: 1.5, opacity: 0.45, draw: [0.15, 0.75] },
  { x0: 10, x1: 790, base: 272, amp: 470, dir: 1, width: 1.5, opacity: 0.45, draw: [0.15, 0.75] },
];

// Jugadores del mini-campo del iris: posición al detectar (a) y tras el tracking (b).
export const EYE_PLAYERS = [
  { id: '07', team: 'home', a: [328, 222], b: [352, 210] },
  { id: '09', team: 'home', a: [392, 246], b: [428, 236] },
  { id: '10', team: 'home', a: [356, 290], b: [382, 284] },
  { id: '04', team: 'home', a: [316, 302], b: [328, 288] },
  { id: '14', team: 'away', a: [446, 222], b: [436, 220] },
  { id: '16', team: 'away', a: [458, 284], b: [446, 270] },
  { id: '19', team: 'away', a: [484, 252], b: [476, 244] },
  { id: '15', team: 'away', a: [416, 306], b: [410, 298] },
];
export const EYE_BALL_CARRIER = 1;

export const EYE_GHOSTS = [
  { real: [322, 222], ghost: [340, 206], label: '2,4 m' },
  { real: [330, 296], ghost: [346, 312], label: '2,3 m' },
  { real: [372, 238], ghost: [366, 216], label: '2,3 m' },
  { real: [442, 226], ghost: [458, 240], label: '2,1 m' },
  { real: [456, 300], ghost: [470, 286], label: '2,0 m' },
];

// Pose esquelética de 17 puntos (orden COCO) en dos fases de la carrera.
export const POSE_A = [
  [420, 190], [417, 185], [423, 185], [410, 187], [412, 189],
  [398, 215], [408, 217], [384, 240], [426, 236], [394, 262], [440, 218],
  [394, 268], [402, 270], [424, 300], [384, 306], [418, 340], [360, 326],
];
export const POSE_B = [
  [420, 190], [417, 185], [423, 185], [410, 187], [412, 189],
  [398, 215], [408, 217], [420, 238], [388, 240], [436, 220], [396, 262],
  [394, 268], [402, 270], [386, 304], [424, 298], [362, 328], [420, 340],
];
export const BONES = [
  [0, 1], [0, 2], [1, 3], [2, 4], [5, 6], [5, 7], [7, 9], [6, 8], [8, 10],
  [5, 11], [6, 12], [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
];

// Métricas en las que se convierten los paneles del balón al desarmarse.
export const EYE_METRICS = [
  { value: '31,4 km/h', label: 'VEL. MÁX', at: [650, 196] },
  { value: '27', label: 'SPRINTS', at: [650, 282] },
  { value: '18%', label: 'ASIMETRÍA', at: [150, 282], alert: true },
  { value: '10,2 km', label: 'DISTANCIA', at: [150, 196] },
  { value: 'Δ 4,2 m', label: 'DESVÍO TÁCTICO', at: [400, 128] },
];
export const EYE_METRIC_CENTER = { value: '22 + 1', label: 'IDS PERSISTENTES', at: [400, 318] };

export const PITCH_LINE = { pathLength: 1, strokeDasharray: '1 1', strokeDashoffset: 1 };

export const BALL_R = 20;
export const BALL_PANELS = [
  { home: [0, 0], r: 7, rot: 0 },
  ...[0, 1, 2, 3, 4].map((k) => {
    const a = ((-90 + 72 * k) * Math.PI) / 180;
    return { home: [Math.cos(a) * 17, Math.sin(a) * 17], r: 6, rot: -90 + 72 * k + 270 };
  }),
];

export const pentagon = (r) =>
  Array.from({ length: 5 }, (_, i) => {
    const a = ((-90 + 72 * i) * Math.PI) / 180;
    return `${(Math.cos(a) * r).toFixed(2)},${(Math.sin(a) * r).toFixed(2)}`;
  }).join(' ');

export const eyePath = ({ x0, x1, base, amp, dir }, open) =>
  `M${x0} ${base} Q${EYE.x} ${(base + dir * amp * open).toFixed(1)} ${x1} ${base}`;
export const eyeClipPath = (open) =>
  `M40 260 Q400 ${(260 - 400 * open).toFixed(1)} 760 260 Q400 ${(260 + 400 * open).toFixed(1)} 40 260 Z`;

export const trailControl = ({ a, b }) => [(a[0] + b[0]) / 2 + (b[1] - a[1]) * 0.4, (a[1] + b[1]) / 2 - (b[0] - a[0]) * 0.4];
