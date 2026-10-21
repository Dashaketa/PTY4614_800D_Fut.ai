import anime from 'animejs';
import { FATIGUE_ROWS, REPORT_BREAKS, REPORT_FORMATION, REPORT_LINES, STRIDE_LEFT, STRIDE_RIGHT, TRACK_KPIS, TRACK_ROWS } from '@/sections/features/reportData';

const riskStyle = (risk) =>
  ({ Alto: 'bg-alert/15 text-alert', Moderado: 'bg-amber-400/15 text-amber-300', Bajo: 'bg-neon/15 text-neon' })[risk];
const lineColor = (value) => (value >= 5 ? 'bg-alert' : value >= 4 ? 'bg-amber-400' : 'bg-neon');

function PanelTitle({ children, aside }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-gray-500">{children}</p>
      {aside && <p className="font-mono text-[10px] text-gray-500">{aside}</p>}
    </div>
  );
}

function GhostPanel() {
  return (
    <div className="grid gap-5 md:grid-cols-[1.15fr_1fr]">
      <div>
        <PanelTitle aside="4-3-3 · fase defensiva">Esquema vs. posición real</PanelTitle>
        <svg viewBox="0 0 210 136" className="mt-3 w-full rounded-lg border border-white/10 bg-[#081a11]" aria-hidden="true">
          <g fill="none" stroke="#7dffb6" strokeOpacity="0.3">
            <rect x="1" y="1" width="208" height="134" />
            <line x1="105" y1="1" x2="105" y2="135" />
            <circle cx="105" cy="68" r="17" />
            <rect x="1" y="28" width="32" height="80" />
            <rect x="177" y="28" width="32" height="80" />
          </g>
          {REPORT_FORMATION.slice(0, 4).map((p, i, arr) =>
            i < arr.length - 1 ? (
              <line
                key={`dl-${p.n}`} data-anim="draw" x1={p.real[0]} y1={p.real[1]} x2={arr[i + 1].real[0]} y2={arr[i + 1].real[1]}
                stroke="#00d2ff" strokeOpacity="0.7" strokeWidth="1" pathLength="1" strokeDasharray="1 1"
              />
            ) : null,
          )}
          {REPORT_FORMATION.map((p) => (
            <g key={p.n}>
              <line
                data-anim="draw" x1={p.ghost[0]} y1={p.ghost[1]} x2={p.real[0]} y2={p.real[1]}
                stroke="#ffffff" strokeOpacity="0.5" strokeWidth="0.8" pathLength="1" strokeDasharray="1 1"
              />
              <circle cx={p.ghost[0]} cy={p.ghost[1]} r="4.5" fill="none" stroke="#ffffff" strokeOpacity="0.7" strokeWidth="0.8" strokeDasharray="2 1.5" />
              <g data-anim="slide" data-from={`${p.ghost[0] - p.real[0]},${p.ghost[1] - p.real[1]}`}>
                <circle cx={p.real[0]} cy={p.real[1]} r="4" fill="#00e676" stroke="#0a0a0a" strokeWidth="1" />
                <text x={p.real[0]} y={p.real[1] + 1.8} textAnchor="middle" fontSize="4.5" fontWeight="700" fill="#0a0a0a" fontFamily="'JetBrains Mono', monospace">
                  {p.n}
                </text>
              </g>
            </g>
          ))}
        </svg>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-500">
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full border border-dashed border-white/70" /> Posición del esquema</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-neon" /> Posición real</span>
          <span className="flex items-center gap-1.5"><span className="h-px w-3 bg-tech" /> Línea defensiva</span>
        </div>
      </div>

      <div className="flex flex-col gap-5">
        <div>
          <PanelTitle>Desvío medio por línea</PanelTitle>
          <ul className="mt-3 space-y-3">
            {REPORT_LINES.map((line) => (
              <li key={line.label} data-anim="fade">
                <div className="flex items-baseline justify-between text-sm">
                  <span className="text-gray-300">{line.label}</span>
                  <span className="font-mono text-white">{line.value.toFixed(1).replace('.', ',')} m</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-clip rounded-full bg-white/10">
                  <div data-anim="bar" className={`h-full origin-left rounded-full ${lineColor(line.value)}`} style={{ width: `${(line.value / 8) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <PanelTitle>Alertas de quiebre</PanelTitle>
          <ul className="mt-3 space-y-2">
            {REPORT_BREAKS.map((item) => (
              <li key={item.minute} data-anim="fade" className="flex gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-gray-300">
                <span className="font-mono text-amber-300">{item.minute}</span>
                {item.text}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function FatiguePanel() {
  const x = (i) => 44 + i * (496 / (STRIDE_LEFT.length - 1));
  const y = (v) => 16 + ((104 - v) / 26) * 124;
  const path = (values) => values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  const alertIndex = 8;
  const mono = "'JetBrains Mono', monospace";
  return (
    <div>
      <PanelTitle aside="#9 · Delantero centro">Longitud de zancada vs. línea base</PanelTitle>
      <svg viewBox="0 0 560 168" className="mt-3 w-full" aria-hidden="true">
        <rect x="44" y="12" width={x(1.5) - 44} height="132" fill="#00d2ff" fillOpacity="0.06" />
        <text x="50" y="24" fontSize="9" fill="#00d2ff" fillOpacity="0.8" fontFamily={mono}>línea base 0–15'</text>
        {[100, 90, 80].map((v) => (
          <g key={v}>
            <line x1="44" x2="540" y1={y(v)} y2={y(v)} stroke="#ffffff" strokeOpacity="0.07" />
            <text x="36" y={y(v) + 3} textAnchor="end" fontSize="9" fill="#6b7280" fontFamily={mono}>{v}%</text>
          </g>
        ))}
        {[0, 15, 30, 45, 60, 75, 90].map((m) => (
          <text key={m} x={44 + (m / 90) * 496} y="162" textAnchor="middle" fontSize="9" fill="#6b7280" fontFamily={mono}>{m}'</text>
        ))}
        <path data-anim="draw" d={path(STRIDE_LEFT)} fill="none" stroke="#00d2ff" strokeWidth="2" strokeLinecap="round" pathLength="1" strokeDasharray="1 1" />
        <path data-anim="draw" d={path(STRIDE_RIGHT)} fill="none" stroke="#00e676" strokeWidth="2" strokeLinecap="round" pathLength="1" strokeDasharray="1 1" />
        <g data-anim="pop" className="svg-center">
          <line x1={x(alertIndex)} x2={x(alertIndex)} y1="12" y2="144" stroke="#ff4d4f" strokeOpacity="0.6" strokeDasharray="3 3" />
          <circle cx={x(alertIndex)} cy={y(STRIDE_RIGHT[alertIndex])} r="4" fill="#ff4d4f" />
          <rect x={x(alertIndex) - 112} y="114" width="102" height="20" rx="4" fill="#ff4d4f" fillOpacity="0.15" stroke="#ff4d4f" strokeOpacity="0.5" />
          <text x={x(alertIndex) - 61} y="127" textAnchor="middle" fontSize="9" fill="#ff8a8b" fontFamily={mono}>80' · alerta −14%</text>
        </g>
      </svg>
      <div className="mt-1 flex gap-4 text-[11px] text-gray-500">
        <span className="flex items-center gap-1.5"><span className="h-0.5 w-3 bg-tech" /> Pierna izquierda</span>
        <span className="flex items-center gap-1.5"><span className="h-0.5 w-3 bg-neon" /> Pierna derecha</span>
      </div>

      <div className="mt-5">
        <PanelTitle>Riesgo de sobrecarga · plantel</PanelTitle>
        <ul className="mt-3 divide-y divide-white/5 rounded-lg border border-white/10">
          {FATIGUE_ROWS.map((row) => (
            <li key={row.player} data-anim="fade" className="grid grid-cols-[1fr_auto_auto] items-center gap-4 px-3 py-2.5 text-sm">
              <span className="text-gray-300">{row.player}</span>
              <span className="font-mono text-xs text-gray-400">asimetría {row.value}%</span>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${riskStyle(row.risk)}`}>{row.risk}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function TrackingPanel() {
  const teamColor = { home: 'bg-neon', away: 'bg-tech', ball: 'bg-white' };
  return (
    <div>
      <div className="grid grid-cols-3 gap-3">
        {TRACK_KPIS.map((kpi) => (
          <div key={kpi.label} data-anim="fade" className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-3">
            <p className="font-display text-2xl font-bold text-white">{kpi.value}</p>
            <p className="mt-0.5 text-[11px] leading-tight text-gray-500">{kpi.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <PanelTitle aside="0' — 90'">Continuidad de identidad</PanelTitle>
        <ul className="mt-3 space-y-2.5">
          {TRACK_ROWS.map((row) => (
            <li key={row.id} data-anim="fade" className="grid grid-cols-[124px_1fr] items-center gap-3">
              <span className="truncate font-mono text-[11px] text-gray-400">
                ID {row.id} <span className="text-gray-600">· {row.label}</span>
              </span>
              <div className="relative h-2 rounded-full bg-white/5">
                <div data-anim="bar" className={`absolute inset-0 origin-left rounded-full opacity-80 ${teamColor[row.team]}`} />
                {row.gaps.map((minute) => (
                  <span
                    key={minute}
                    data-anim="fade"
                    title={`Oclusión recuperada · ${minute}'`}
                    className="absolute top-1/2 h-3.5 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-400 ring-2 ring-carbon-800"
                    style={{ left: `${(minute / 90) * 100}%` }}
                  />
                ))}
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex gap-4 text-[11px] text-gray-500">
          <span className="flex items-center gap-1.5"><span className="h-2 w-3 rounded-full bg-neon/80" /> ID continuo</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-1 rounded-full bg-amber-400" /> Oclusión recuperada sin cambio de ID</span>
        </div>
      </div>
    </div>
  );
}

export const FEATURE_PANELS = { ghost: GhostPanel, fatigue: FatiguePanel, tracking: TrackingPanel };

/** Anima la entrada de un panel: barras, trazos, desplazamientos y listas. */
export function animatePanel(root) {
  const q = (name) => root.querySelectorAll(`[data-anim="${name}"]`);
  // Estado inicial explícito para que nada aparezca terminado antes de su retraso.
  anime.set(q('bar'), { scaleX: 0 });
  anime.set(q('draw'), { strokeDashoffset: 1 });
  anime.set(q('fade'), { opacity: 0 });
  anime.set(q('pop'), { opacity: 0 });
  q('slide').forEach((el) => {
    const [dx, dy] = el.dataset.from.split(',').map(Number);
    anime.set(el, { translateX: dx, translateY: dy });
  });
  const animations = [
    anime({ targets: q('bar'), scaleX: [0, 1], duration: 900, delay: anime.stagger(70, { start: 150 }), easing: 'easeOutExpo' }),
    anime({ targets: q('draw'), strokeDashoffset: [1, 0], duration: 1300, delay: anime.stagger(40, { start: 100 }), easing: 'easeInOutSine' }),
    anime({
      targets: q('slide'),
      translateX: (el) => [Number(el.dataset.from.split(',')[0]), 0],
      translateY: (el) => [Number(el.dataset.from.split(',')[1]), 0],
      duration: 1400,
      delay: anime.stagger(50, { start: 200 }),
      easing: 'easeInOutQuart',
    }),
    anime({ targets: q('fade'), opacity: [0, 1], translateY: [8, 0], duration: 600, delay: anime.stagger(45, { start: 200 }), easing: 'easeOutQuad' }),
    anime({ targets: q('pop'), opacity: [0, 1], scale: [0.85, 1], duration: 600, delay: 1200, easing: 'easeOutBack' }),
  ];
  return () => {
    animations.forEach((animation) => animation.pause());
    anime.remove(root.querySelectorAll('[data-anim]'));
  };
}
