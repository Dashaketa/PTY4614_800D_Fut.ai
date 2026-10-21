import { pad2 } from '@/lib/format';
import { clamp } from '@/lib/math';
import { PLAYERS } from '@/sections/hero/matchData';

/* -----------------------------------------------------------------------------
   SIMULACIÓN DE JUEGO
   Posesiones encadenadas: el portador conduce el balón, los pases viajan a velocidad
   real y frenan por roce, los cambios largos van por aire (con sombra), el bloque de
   cada equipo bascula hacia el balón y el rival más cercano presiona al portador.
   -------------------------------------------------------------------------- */

// Jugada que se repite en bucle: salida desde atrás, centro, remate, atajada,
// salida rival y recuperación. `kind`: 'pass' (raso), 'loft' (por aire) o 'shot';
// `label` es el nombre del evento en el feed en vivo.
const PLAY_SEQUENCE = [
  { to: 'home-5' },
  { to: 'home-10' },
  { to: 'home-6' },
  { to: 'home-11', label: 'Cambio de frente' },
  { to: 'home-9', kind: 'loft', label: 'Centro' },
  { to: 'home-8', label: 'Descarga' },
  { to: 'home-7' },
  { to: 'home-9', kind: 'loft', label: 'Centro' },
  { to: 'away-1', kind: 'shot', label: 'Remate' },
  { to: 'away-4', label: 'Saque del arquero' },
  { to: 'away-5' },
  { to: 'away-11', kind: 'loft', label: 'Cambio de frente' },
  { to: 'home-8', label: 'Recuperación' }, // pase interceptado
  { to: 'home-2' },
  { to: 'home-4' },
];

// Líneas defensivas que se dibujan con la capa "Líneas".
export const DEFENSIVE_LINES = {
  home: ['home-6', 'home-3', 'home-4', 'home-2'],
  away: ['away-2', 'away-4', 'away-3', 'away-6'],
};

export const MATCH_CLOCK_START = 67 * 60 + 12; // segundos
const TRAIL_POINTS = 10;
export const formatClock = (seconds) => `${pad2(Math.floor(seconds / 60))}:${pad2(Math.floor(seconds % 60))}`;
const shirt = (b) => `#${b.n}${b.team === 'away' ? ' V' : ''}`;

const START_HOLDER = 'home-4';
const TEAM_DIR = { home: 1, away: -1 };
const PASS_SPEED = { pass: 260, loft: 200, shot: 520 }; // decímetros por segundo
const FIELD_PAD = 14;

export function runMatchSimulation(root, hud, reduced) {
  const bodies = PLAYERS.map((p, i) => {
    const node = root.querySelector(`[data-player="${p.key}"]`);
    return {
      ...p,
      motion: node.querySelector('.player-motion'),
      anchor: node.querySelector('.ghost-anchor'),
      link: node.querySelector('.ghost-link'),
      keeper: p.role === 'Arquero',
      sx: 0, sy: 0, // basculación del bloque (también mueve la posición del esquema)
      ex: 0, ey: 0, // movimiento individual: deriva, conducción y presión
      carry: 0,
      speed: 0, // km/h, suavizada
      trail: [],
      trailEl: root.querySelector(`[data-trail="${p.key}"]`),
      phase: [i * 1.7, i * 2.3, i * 0.9, i * 3.1],
      freq: [0.35 + (i % 5) * 0.06, 0.5 + (i % 3) * 0.08],
    };
  });
  const byKey = Object.fromEntries(bodies.map((b) => [b.key, b]));
  const ballEl = root.querySelector('.ball');
  const ballBody = root.querySelector('.ball-body');
  const ballShadow = root.querySelector('.ball-shadow');
  const carrierRing = root.querySelector('.carrier-ring');
  const passLine = root.querySelector('.pass-line');
  const passTarget = root.querySelector('.pass-target');
  const defLines = {
    home: root.querySelector('[data-defline="home"]'),
    away: root.querySelector('[data-defline="away"]'),
  };

  const pos = (b) => ({ x: b.x + b.sx + b.ex, y: b.y + b.sy + b.ey });
  // Punto de control del balón: delante del jugador, con pequeños toques al conducir.
  const feet = (b, t, touch = 0) => {
    const p = pos(b);
    return { x: p.x + TEAM_DIR[b.team] * (12 + touch * Math.sin(t * 9)), y: p.y + 6 };
  };

  const holder0 = byKey[START_HOLDER];
  const state = {
    t: 0,
    step: 0,
    holder: holder0,
    holdUntil: 1.2,
    pass: null,
    ball: feet(holder0, 0),
    height: 0,
    frame: -1,
    second: -1,
    trailClock: 0,
    hudClock: 0,
    possession: { home: 56, away: 44 }, // segundos previos, para partir con un valor realista
  };

  const emit = (team, text) => hud.onEvent?.({ clock: formatClock(MATCH_CLOCK_START + state.t), team, text });

  function startPass() {
    const play = PLAY_SEQUENCE[state.step % PLAY_SEQUENCE.length];
    state.step += 1;
    const to = byKey[play.to];
    const from = { ...state.ball };
    const target = feet(to, state.t);
    const dist = Math.hypot(target.x - from.x, target.y - from.y);
    const kind = play.kind ?? (dist > 320 ? 'loft' : 'pass');
    const passer = state.holder;
    const meters = Math.round(dist / 10);
    if (play.label === 'Recuperación') emit(to.team, `Recuperación · ${shirt(to)} intercepta`);
    else if (kind === 'shot') emit(passer.team, `Remate · ${shirt(passer)} · ${meters} m`);
    else emit(passer.team, `${play.label ?? 'Pase'} · ${shirt(passer)} → ${shirt(to)} · ${meters} m`);
    state.pass = {
      from,
      to,
      kind,
      start: state.t,
      duration: Math.max(0.35, dist / PASS_SPEED[kind]),
      apex: kind === 'loft' ? Math.min(60, dist * 0.16) : kind === 'shot' ? 5 : 0,
    };
    state.holder = null;
  }

  function step(dt) {
    state.t += dt;
    const { t, ball, pass } = state;
    const holder = state.holder;
    const smooth = 1 - Math.exp(-dt * 2.4);

    // Rival más cercano al portador: sale a presionar.
    let presser = null;
    if (holder) {
      let best = Infinity;
      bodies.forEach((b) => {
        if (b.team === holder.team || b.keeper) return;
        const p = pos(b);
        const d = Math.hypot(p.x - ball.x, p.y - ball.y);
        if (d < best) { best = d; presser = b; }
      });
    }

    bodies.forEach((b) => {
      const k = b.team === 'home' ? [0.2, 0.24] : [0.16, 0.28];
      const shiftX = b.keeper ? 0 : (ball.x - 525) * k[0];
      const shiftY = (ball.y - 340) * (b.keeper ? 0.12 : k[1]);

      // Deriva natural: nunca quietos, sin patrones repetitivos evidentes.
      let tx = 7 * Math.sin(t * b.freq[0] + b.phase[0]) + 3 * Math.sin(t * b.freq[1] + b.phase[1]);
      let ty = 5 * Math.sin(t * b.freq[1] * 0.8 + b.phase[2]) + 3 * Math.sin(t * b.freq[0] * 1.3 + b.phase[3]);
      if (b.keeper) { tx *= 0.3; ty *= 0.5; }

      // Conducción del portador hacia el arco rival.
      b.carry = b === holder ? Math.min(b.keeper ? 25 : 70, b.carry + dt * 45) : b.carry * Math.exp(-dt * 0.7);
      tx += TEAM_DIR[b.team] * b.carry;

      const p = pos(b);
      // Presión sobre el balón.
      if (b === presser) {
        const d = Math.hypot(ball.x - p.x, ball.y - p.y) || 1;
        const reach = clamp(d - 30, 0, 110);
        tx += ((ball.x - p.x) / d) * reach;
        ty += ((ball.y - p.y) / d) * reach;
      }
      // El receptor sale al encuentro del pase.
      if (pass && b === pass.to && !b.keeper) {
        const d = Math.hypot(pass.from.x - p.x, pass.from.y - p.y) || 1;
        tx += ((pass.from.x - p.x) / d) * 18;
        ty += ((pass.from.y - p.y) / d) * 18;
      }

      b.sx += (shiftX - b.sx) * smooth;
      b.sy += (shiftY - b.sy) * smooth;
      b.ex += (tx - b.ex) * smooth;
      b.ey += (ty - b.ey) * smooth;
      b.ex = clamp(b.ex, FIELD_PAD - b.x - b.sx, 1050 - FIELD_PAD - b.x - b.sx);
      b.ey = clamp(b.ey, FIELD_PAD - b.y - b.sy, 680 - FIELD_PAD - b.y - b.sy);

      // Velocidad instantánea (decímetros/s → km/h), suavizada como en un tracker real.
      const now = pos(b);
      if (dt > 0) {
        const kmh = (Math.hypot(now.x - p.x, now.y - p.y) / dt) * 0.36;
        b.speed += (kmh - b.speed) * (1 - Math.exp(-dt * 3));
      }
    });

    if (holder) state.possession[holder.team] += dt;

    if (holder) {
      // Balón pegado al pie, con toques de conducción.
      const f = feet(holder, t, 3);
      const grip = 1 - Math.exp(-dt * 14);
      ball.x += (f.x - ball.x) * grip;
      ball.y += (f.y - ball.y) * grip;
      state.height = 0;
      if (t >= state.holdUntil) startPass();
    } else if (pass) {
      const p = clamp((t - pass.start) / pass.duration, 0, 1);
      // Raso: frena por roce. Por aire y remate: velocidad casi constante.
      const e = pass.kind === 'pass' ? 1 - (1 - p) ** 2 : p;
      const target = feet(pass.to, t);
      ball.x = pass.from.x + (target.x - pass.from.x) * e;
      ball.y = pass.from.y + (target.y - pass.from.y) * e;
      state.height = 4 * pass.apex * p * (1 - p);
      if (p >= 1) {
        if (pass.kind === 'shot') emit(pass.to.team, 'Atajada · arquero visita');
        state.holder = pass.to;
        state.holdUntil = t + (pass.to.keeper ? 1.8 : 0.6 + Math.random() * 0.9);
        state.pass = null;
      }
    }
  }

  function render() {
    bodies.forEach((b) => {
      b.motion.setAttribute('transform', `translate(${(b.sx + b.ex).toFixed(1)} ${(b.sy + b.ey).toFixed(1)})`);
      if (b.anchor) {
        b.anchor.setAttribute('transform', `translate(${b.sx.toFixed(1)} ${b.sy.toFixed(1)})`);
        b.link.setAttribute('x1', b.ex.toFixed(1));
        b.link.setAttribute('y1', b.ey.toFixed(1));
      }
    });
    const { ball, height } = state;
    ballEl.setAttribute('transform', `translate(${ball.x.toFixed(1)} ${ball.y.toFixed(1)})`);
    ballBody.setAttribute('transform', `translate(0 ${(-height).toFixed(1)}) scale(${(1 + height / 120).toFixed(3)})`);
    ballShadow.setAttribute('opacity', (0.45 - height / 160).toFixed(2));
    ballShadow.setAttribute('transform', `scale(${(1 - height / 140).toFixed(3)})`);

    // Anillo del portador y línea del pase en curso.
    const { holder, pass } = state;
    if (holder) {
      const p = pos(holder);
      carrierRing.setAttribute('transform', `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) rotate(${(state.t * 90).toFixed(1)})`);
      carrierRing.setAttribute('opacity', '1');
    } else {
      carrierRing.setAttribute('opacity', '0');
    }
    if (pass) {
      const target = feet(pass.to, state.t);
      const progress = clamp((state.t - pass.start) / pass.duration, 0, 1);
      passLine.setAttribute('x1', pass.from.x.toFixed(1));
      passLine.setAttribute('y1', pass.from.y.toFixed(1));
      passLine.setAttribute('x2', target.x.toFixed(1));
      passLine.setAttribute('y2', target.y.toFixed(1));
      passLine.setAttribute('stroke', pass.kind === 'shot' ? '#ff4d4f' : '#ffffff');
      passLine.setAttribute('opacity', (0.75 * (1 - progress * 0.6)).toFixed(2));
      passTarget.setAttribute('transform', `translate(${target.x.toFixed(1)} ${target.y.toFixed(1)})`);
      passTarget.setAttribute('opacity', (0.9 * (1 - progress * 0.5)).toFixed(2));
    } else {
      passLine.setAttribute('opacity', '0');
      passTarget.setAttribute('opacity', '0');
    }

    // Líneas defensivas.
    Object.entries(DEFENSIVE_LINES).forEach(([team, keys]) => {
      const points = keys.map((key) => {
        const p = pos(byKey[key]);
        return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
      });
      defLines[team].setAttribute('points', points.join(' '));
    });

    // Estelas de movimiento: últimas posiciones muestreadas cada 0,1 s.
    if (state.t - state.trailClock >= 0.1) {
      state.trailClock = state.t;
      bodies.forEach((b) => {
        const p = pos(b);
        b.trail.push(`${p.x.toFixed(1)},${p.y.toFixed(1)}`);
        if (b.trail.length > TRAIL_POINTS) b.trail.shift();
        b.trailEl?.setAttribute('points', b.trail.join(' '));
      });
    }

    const frame = 1284 + Math.floor(state.t * 8); // 8 FPS efectivos de muestreo
    if (frame !== state.frame && hud.frameEl) {
      state.frame = frame;
      hud.frameEl.textContent = String(frame).padStart(6, '0');
    }
    const second = Math.floor(state.t);
    if (second !== state.second && hud.clockEl) {
      state.second = second;
      hud.clockEl.textContent = formatClock(MATCH_CLOCK_START + state.t);
    }

    // Velocidad actual del jugador seleccionado y posesión, 4 veces por segundo.
    if (state.t - state.hudClock >= 0.25) {
      state.hudClock = state.t;
      const selected = byKey[hud.getSelected?.()];
      if (selected && hud.speedEl) hud.speedEl.textContent = selected.speed.toFixed(1).replace('.', ',');
      if (hud.possessionEl) {
        const total = state.possession.home + state.possession.away;
        const home = Math.round((state.possession.home / total) * 100);
        hud.possessionEl.textContent = `${home}% · ${100 - home}%`;
      }
    }
  }

  step(0);
  render();
  if (reduced) return () => {};

  // Solo anima mientras la maqueta está en pantalla.
  let visible = true;
  const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; });
  observer.observe(root);

  let last = performance.now();
  let raf = requestAnimationFrame(function tick(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (visible) {
      step(dt);
      render();
    }
    raf = requestAnimationFrame(tick);
  });

  return () => {
    cancelAnimationFrame(raf);
    observer.disconnect();
  };
}
