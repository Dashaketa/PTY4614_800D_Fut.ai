/* =============================================================================
   DATOS DE LA MAQUETA TÁCTICA (coordenadas en decímetros: 1050 × 680 = 105 × 68 m)
   ========================================================================== */

// [dorsal, posición, x, y, desvío del Fantasma Táctico [dx, dy] | null, overrides de telemetría]
const HOME_SQUAD = [
  [1, 'Arquero', 70, 340, null],
  [6, 'Lateral izquierdo', 240, 105, [10, 34]],
  [3, 'Defensa central', 205, 260, [26, 12]],
  [4, 'Defensa central', 205, 420, [30, -14]],
  [2, 'Lateral derecho', 240, 575, [22, -38]],
  [5, 'Volante de contención', 370, 340, [-28, 4]],
  [10, 'Interior izquierdo', 420, 200, [16, 30]],
  [8, 'Interior derecho', 420, 480, [38, -36]],
  [11, 'Extremo izquierdo', 600, 120, null],
  [9, 'Delantero centro', 630, 340, null, { speed: 31.4, distance: 10.2, sprints: 27, asymmetry: 18 }],
  [7, 'Extremo derecho', 600, 560, null],
];

const AWAY_SQUAD = [
  [1, 'Arquero', 980, 340],
  [2, 'Lateral derecho', 830, 120],
  [4, 'Defensa central', 850, 270, { asymmetry: 12 }],
  [3, 'Defensa central', 850, 410],
  [6, 'Lateral izquierdo', 830, 560],
  [7, 'Volante derecho', 700, 140],
  [5, 'Volante central', 720, 285],
  [8, 'Volante central', 720, 400],
  [11, 'Volante izquierdo', 700, 540],
  [9, 'Delantero', 540, 300],
  [10, 'Segundo delantero', 560, 430],
];

export const PLAYERS = [
  ...HOME_SQUAD.map(([n, role, x, y, ghost, override]) => ({
    key: `home-${n}`, team: 'home', n, role, x, y, ghost, override, trackId: n,
  })),
  ...AWAY_SQUAD.map(([n, role, x, y, override]) => ({
    key: `away-${n}`, team: 'away', n, role, x, y, ghost: null, override, trackId: n + 11,
  })),
];

export const LABELED_PLAYERS = new Set(['home-9', 'home-10', 'home-5', 'home-4', 'away-9', 'away-5']);

export const BBOX_PATH = 'M-24 -15 V-24 H-15 M15 -24 H24 V-15 M24 15 V24 H15 M-15 24 H-24 V15';

export const TEAM_COLORS = { home: '#00e676', away: '#00d2ff' };

export function playerTelemetry(player) {
  const seed = player.n * 7 + (player.team === 'home' ? 1 : 4);
  const base = {
    speed: 24 + ((seed * 37) % 90) / 10,
    distance: 7.4 + ((seed * 13) % 38) / 10,
    sprints: 9 + ((seed * 5) % 19),
    asymmetry: 3 + ((seed * 3) % 9),
    confidence: 0.88 + ((seed * 17) % 11) / 100,
  };
  if (player.role === 'Arquero') Object.assign(base, { speed: 18.6, distance: 4.9, sprints: 2 });
  return { ...base, ...player.override };
}

export function riskLevel(asymmetry) {
  if (asymmetry >= 15) return { label: 'Riesgo alto', color: 'text-alert', bar: 'bg-alert' };
  if (asymmetry >= 10) return { label: 'Riesgo moderado', color: 'text-amber-400', bar: 'bg-amber-400' };
  return { label: 'Riesgo bajo', color: 'text-neon', bar: 'bg-neon' };
}
