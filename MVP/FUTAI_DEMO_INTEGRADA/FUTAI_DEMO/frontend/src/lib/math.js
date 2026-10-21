// Utilidades numéricas compartidas por las animaciones.

export const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

export const clamp01 = (v) => Math.min(1, Math.max(0, v));
export const lerp = (a, b, t) => a + (b - a) * t;
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
export const seg = (u, a, b) => easeInOut(clamp01((u - a) / (b - a)));
export const fadeWindow = (u, inA, inB, outA, outB) => seg(u, inA, inB) * (1 - seg(u, outA, outB));
export const quadPoint = (a, c, b, t) => [
  (1 - t) ** 2 * a[0] + 2 * (1 - t) * t * c[0] + t ** 2 * b[0],
  (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * c[1] + t ** 2 * b[1],
];
