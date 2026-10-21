// Fantasma Táctico: esquema 4-3-3 (ghost) contra posiciones reales, en un campo de 210 × 136.
export const REPORT_FORMATION = [
  { n: 6, ghost: [52, 22], real: [60, 30] },
  { n: 3, ghost: [44, 54], real: [56, 58] },
  { n: 4, ghost: [44, 82], real: [58, 78] },
  { n: 2, ghost: [52, 114], real: [64, 104] },
  { n: 5, ghost: [86, 68], real: [80, 70] },
  { n: 10, ghost: [108, 42], real: [116, 52] },
  { n: 8, ghost: [108, 94], real: [124, 84] },
  { n: 11, ghost: [150, 26], real: [146, 24] },
  { n: 9, ghost: [162, 68], real: [166, 66] },
  { n: 7, ghost: [150, 110], real: [156, 114] },
];
export const REPORT_LINES = [
  { label: 'Defensa', value: 3.1 },
  { label: 'Mediocampo', value: 4.2 },
  { label: 'Ataque', value: 5.6 },
];
export const REPORT_BREAKS = [
  { minute: "23'", text: 'Línea defensiva adelantada 6,8 m sobre el esquema' },
  { minute: "41'", text: 'Interior derecho fuera de zona en transición defensiva' },
  { minute: "67'", text: 'Bloque partido: 18 m entre mediocampo y defensa' },
];

// Huella de Fatiga: longitud de zancada (% de la línea base) a lo largo del partido.
export const STRIDE_LEFT = [100, 101, 100, 99, 100, 99, 99, 98, 99, 98];
export const STRIDE_RIGHT = [100, 100, 99, 99, 98, 96, 94, 90, 86, 82];
export const FATIGUE_ROWS = [
  { player: '#9 · Delantero centro', value: 18, risk: 'Alto' },
  { player: '#8 · Interior derecho', value: 11, risk: 'Moderado' },
  { player: '#2 · Lateral derecho', value: 7, risk: 'Bajo' },
];

// Tracking: continuidad de cada ID durante los 90 minutos; `gaps` son oclusiones recuperadas.
export const TRACK_ROWS = [
  { id: '09', label: '#9 Local', team: 'home', gaps: [18, 52, 77] },
  { id: '10', label: '#10 Local', team: 'home', gaps: [33, 61] },
  { id: '05', label: '#5 Local', team: 'home', gaps: [44] },
  { id: '14', label: '#3 Visita', team: 'away', gaps: [12, 58] },
  { id: '16', label: '#5 Visita', team: 'away', gaps: [27, 70, 84] },
  { id: '00', label: 'Balón', team: 'ball', gaps: [8, 39, 49, 66, 88] },
];
export const TRACK_KPIS = [
  { value: '23', label: 'objetos con ID' },
  { value: '312', label: 'oclusiones resueltas' },
  { value: '99,2%', label: 'continuidad de ID' },
];
