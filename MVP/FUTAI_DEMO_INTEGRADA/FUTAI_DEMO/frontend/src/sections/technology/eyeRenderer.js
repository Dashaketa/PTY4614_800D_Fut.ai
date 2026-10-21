import { clamp01, fadeWindow, lerp, quadPoint, seg } from '@/lib/math';
import { BALL_PANELS, BONES, EYE, EYE_BALL_CARRIER, EYE_LINES, EYE_METRIC_CENTER, EYE_METRICS, EYE_PLAYERS, EYE_STAGES, eyeClipPath, eyePath, POSE_A, POSE_B, trailControl } from '@/sections/technology/eyeData';

// Último valor escrito por atributo: evita tocar el DOM si nada cambió.
const eyeAttrCache = new WeakMap();
export function setEyeAttr(el, name, value) {
  if (!el) return;
  let cache = eyeAttrCache.get(el);
  if (!cache) {
    cache = {};
    eyeAttrCache.set(el, cache);
  }
  if (cache[name] === value) return;
  cache[name] = value;
  if (value === null) el.removeAttribute(name);
  else el.setAttribute(name, value);
}

export function renderEye(els, u, p, reduced) {
  const set = setEyeAttr;
  const draw = (el, t) => set(el, 'stroke-dashoffset', (1 - t).toFixed(4));

  // Apertura y parpadeo en cada cambio de etapa.
  let open = seg(u, 0.25, 0.75);
  if (!reduced) {
    let blink = 0;
    for (let k = 1; k < EYE_STAGES.length; k += 1) blink = Math.max(blink, 1 - Math.abs(u - k) / 0.06);
    open *= 1 - 0.92 * blink;
  }
  set(els.clip, 'd', eyeClipPath(open));
  els.lines.forEach((el, i) => {
    const line = EYE_LINES[i];
    const d = eyePath(line, Math.max(open, 0.002));
    const drawn = seg(u, line.draw[0], line.draw[1]);
    set(el, 'd', d);
    draw(el, drawn);
    set(els.lineHalos[i], 'd', d);
    draw(els.lineHalos[i], drawn);
  });

  // Iris, anillo de progreso y cancha.
  set(els.irisFill, 'opacity', seg(u, 0.3, 0.8).toFixed(3));
  draw(els.irisRing, seg(u, 0.3, 0.9));
  draw(els.irisHalo, seg(u, 0.3, 0.9));
  set(els.ticks, 'opacity', (0.9 * seg(u, 0.5, 1)).toFixed(3));
  set(els.progress, 'stroke-dasharray', `${p.toFixed(4)} 1`);
  const pitchDraw = seg(u, 0.45, 1);
  els.pitchLines.forEach((el) => draw(el, pitchDraw));
  const skeletonWindow = fadeWindow(u, 4, 4.3, 4.85, 5.1);
  const explodeDim = seg(u, 6, 6.3);
  set(els.pitch, 'opacity', (1 - 0.8 * skeletonWindow - 0.65 * explodeDim).toFixed(3));

  // 1 · Ingesta: barrido de video.
  set(els.video, 'opacity', fadeWindow(u, 1, 1.25, 1.8, 2).toFixed(3));
  set(els.sweep, 'y', (110 + ((u * 1.6) % 1) * 300).toFixed(1));

  // 2-3 · Detección y tracking.
  const playersOpacity = fadeWindow(u, 1.95, 2.3, 3.9, 4.15);
  const track = seg(u, 3, 3.8);
  const ids = seg(u, 3, 3.25);
  const playerPos = EYE_PLAYERS.map((player) => quadPoint(player.a, trailControl(player), player.b, track));
  EYE_PLAYERS.forEach((player, i) => {
    const [x, y] = playerPos[i];
    set(els.players[i], 'transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
    set(els.players[i], 'opacity', playersOpacity.toFixed(3));
    set(els.boxes[i], 'opacity', seg(u, 2.05 + i * 0.03, 2.3 + i * 0.03).toFixed(3));
    set(els.ids[i], 'opacity', ids.toFixed(3));
    set(els.trails[i], 'opacity', playersOpacity.toFixed(3));
    draw(els.trails[i], track);
  });

  // 4 · Biomecánica: esqueleto corriendo al ritmo del scroll.
  set(els.skeleton, 'opacity', skeletonWindow.toFixed(3));
  const stride = 0.5 + 0.5 * Math.sin((u - 4) * Math.PI * 3);
  const bob = -4 * Math.abs(Math.sin((u - 4) * Math.PI * 3));
  const joints = POSE_A.map((a, i) => [lerp(a[0], POSE_B[i][0], stride), lerp(a[1], POSE_B[i][1], stride) + bob]);
  const bonesDraw = seg(u, 4, 4.45);
  BONES.forEach(([from, to], i) => {
    const el = els.bones[i];
    set(el, 'x1', joints[from][0].toFixed(1));
    set(el, 'y1', joints[from][1].toFixed(1));
    set(el, 'x2', joints[to][0].toFixed(1));
    set(el, 'y2', joints[to][1].toFixed(1));
    draw(el, bonesDraw);
  });
  joints.forEach(([x, y], i) => {
    set(els.joints[i], 'cx', x.toFixed(1));
    set(els.joints[i], 'cy', y.toFixed(1));
    set(els.joints[i], 'opacity', seg(u, 4.1 + i * 0.012, 4.3 + i * 0.012).toFixed(3));
  });
  const [lx, rx] = [joints[15][0], joints[16][0]].sort((a, b) => a - b);
  set(els.strideLine, 'x1', lx.toFixed(1));
  set(els.strideLine, 'x2', rx.toFixed(1));
  set(els.stride, 'opacity', seg(u, 4.35, 4.55).toFixed(3));

  // 5 · Fantasma Táctico.
  set(els.ghosts, 'opacity', fadeWindow(u, 5, 5.3, 5.85, 6.05).toFixed(3));
  els.ghostLinks.forEach((el) => draw(el, seg(u, 5.15, 5.45)));

  // Balón-pupila: centro del ojo, balón del partido y, al final, se desarma.
  const carrier = playerPos[EYE_BALL_CARRIER];
  const atFeet = [carrier[0] + 7, carrier[1] + 5];
  const skelBall = [446, 346 - 6 * Math.abs(Math.sin((u - 4) * Math.PI * 3))];
  const center = [EYE.x, EYE.y];
  let ball;
  let scale;
  if (u < 1.9) { ball = center; scale = 1; } else if (u < 2.3) {
    const t = seg(u, 1.9, 2.3);
    ball = [lerp(center[0], atFeet[0], t), lerp(center[1], atFeet[1], t)];
    scale = lerp(1, 0.4, t);
  } else if (u < 3.9) { ball = atFeet; scale = 0.4; } else if (u < 4.3) {
    const t = seg(u, 3.9, 4.3);
    ball = [lerp(atFeet[0], skelBall[0], t), lerp(atFeet[1], skelBall[1], t)];
    scale = lerp(0.4, 0.5, t);
  } else if (u < 4.9) { ball = skelBall; scale = 0.5; } else if (u < 5.25) {
    const t = seg(u, 4.9, 5.25);
    ball = [lerp(skelBall[0], center[0], t), lerp(skelBall[1], center[1], t)];
    scale = lerp(0.5, 0.4, t);
  } else {
    ball = center;
    scale = lerp(0.4, 2.4, seg(u, 6, 6.3));
  }
  scale *= seg(u, 0.55, 0.85);
  set(els.ballPos, 'transform', `translate(${ball[0].toFixed(1)} ${ball[1].toFixed(1)}) scale(${Math.max(scale, 0.001).toFixed(3)})`);
  set(els.ballPos, 'opacity', (u < 6 ? clamp01(open * 1.4) : 1).toFixed(3));
  const spin = u < 6 ? u * 130 : lerp(780, 792, seg(u, 6, 6.35));
  set(els.ballSpin, 'transform', `rotate(${spin.toFixed(1)})`);

  const explode = seg(u, 6.3, 6.75);
  set(els.ballClip, 'clip-path', explode > 0.001 ? null : 'url(#eye-ball-clip)');
  set(els.ballBase, 'opacity', (1 - explode).toFixed(3));
  set(els.seams, 'opacity', (1 - explode).toFixed(3));
  const rad = (-spin * Math.PI) / 180;
  const toLocal = ([x, y]) => {
    const dx = (x - EYE.x) / Math.max(scale, 0.001);
    const dy = (y - EYE.y) / Math.max(scale, 0.001);
    return [dx * Math.cos(rad) - dy * Math.sin(rad), dx * Math.sin(rad) + dy * Math.cos(rad)];
  };
  BALL_PANELS.forEach((panel, i) => {
    const target = toLocal(i === 0 ? EYE_METRIC_CENTER.at : EYE_METRICS[i - 1].at);
    const x = lerp(panel.home[0], target[0], explode);
    const y = lerp(panel.home[1], target[1], explode);
    const rot = lerp(panel.rot, -spin, explode);
    set(els.panels[i], 'transform', `translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${rot.toFixed(1)})`);
    set(els.panels[i], 'stroke', explode > 0.15 ? '#00e676' : '#0a0a0a');
  });
  els.metrics.forEach((el, i) => set(el, 'opacity', seg(u, 6.55 + i * 0.04, 6.75 + i * 0.04).toFixed(3)));
}
