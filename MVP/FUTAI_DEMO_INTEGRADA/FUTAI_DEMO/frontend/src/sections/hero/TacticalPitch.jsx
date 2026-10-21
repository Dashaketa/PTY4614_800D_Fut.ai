import { useEffect, useRef, useState } from 'react';
import anime from 'animejs';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { pad2 } from '@/lib/format';
import { prefersReducedMotion } from '@/lib/motion';
import { PitchMarkings } from '@/sections/hero/PitchMarkings';
import { PlayerNode } from '@/sections/hero/PlayerNode';
import { LABELED_PLAYERS, PLAYERS, playerTelemetry, riskLevel, TEAM_COLORS } from '@/sections/hero/matchData';
import { DEFENSIVE_LINES, formatClock, MATCH_CLOCK_START, runMatchSimulation } from '@/sections/hero/matchSimulation';

export function TacticalPitch() {
  const svgRef = useRef(null);
  const frameRef = useRef(null);
  const clockRef = useRef(null);
  const speedRef = useRef(null);
  const possessionRef = useRef(null);
  const selectedRef = useRef('home-9');
  const [selectedKey, setSelectedKey] = useState('home-9');
  const [showTracking, setShowTracking] = useState(true);
  const [showGhost, setShowGhost] = useState(true);
  const [showLines, setShowLines] = useState(false);
  const [events, setEvents] = useState([]);
  selectedRef.current = selectedKey;

  const selected = PLAYERS.find((p) => p.key === selectedKey);
  const telemetry = playerTelemetry(selected);
  const risk = riskLevel(telemetry.asymmetry);
  const deviation = selected.ghost ? Math.hypot(...selected.ghost) / 10 : null;

  // Simulación de juego: jugadores, balón, capas de análisis y HUD en vivo.
  useEffect(
    () =>
      runMatchSimulation(
        svgRef.current,
        {
          frameEl: frameRef.current,
          clockEl: clockRef.current,
          speedEl: speedRef.current,
          possessionEl: possessionRef.current,
          getSelected: () => selectedRef.current,
          onEvent: (event) => setEvents([{ ...event, id: `${event.clock}-${event.text}` }]),
        },
        prefersReducedMotion(),
      ),
    [],
  );

  // Efectos de interfaz: barrido del escáner y pulso suave del esquema táctico.
  useEffect(() => {
    const root = svgRef.current;
    if (prefersReducedMotion()) return undefined;
    const ghosts = root.querySelectorAll('.ghost-node');
    const scan = root.querySelector('.scan-line');
    const animations = [
      anime({
        targets: ghosts,
        opacity: [0.5, 1],
        duration: 1600,
        delay: anime.stagger(120),
        direction: 'alternate',
        loop: true,
        easing: 'easeInOutSine',
      }),
      anime({
        targets: scan,
        translateX: [-80, 1050],
        duration: 5200,
        loop: true,
        easing: 'linear',
      }),
    ];
    return () => {
      animations.forEach((animation) => animation.pause());
      anime.remove([...ghosts, scan]);
    };
  }, []);

  // Anillo giratorio sobre el jugador seleccionado.
  useEffect(() => {
    const ring = svgRef.current?.querySelector('.selected-ring');
    if (!ring || prefersReducedMotion()) return undefined;
    const animation = anime({ targets: ring, rotate: [0, 360], duration: 6000, loop: true, easing: 'linear' });
    return () => {
      animation.pause();
      anime.remove(ring);
    };
  }, [selectedKey]);

  const toggles = [
    { label: 'Tracking', active: showTracking, onClick: () => setShowTracking((v) => !v), dot: 'bg-neon' },
    { label: 'Fantasma Táctico', active: showGhost, onClick: () => setShowGhost((v) => !v), dot: 'bg-white' },
    { label: 'Líneas', active: showLines, onClick: () => setShowLines((v) => !v), dot: 'bg-tech' },
  ];

  return (
    <div className="relative overflow-clip rounded-3xl border border-white/10 bg-carbon-800/70 shadow-[0_0_80px_-20px_rgba(0,230,118,0.35)] backdrop-blur-md">
      {/* Barra superior del visor */}
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3 font-mono text-[11px] text-gray-400">
        <div className="flex min-w-0 items-center gap-2">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-neon opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-neon" />
          </span>
          <span className="font-semibold text-neon">DEMO</span>
          <span className="truncate">sub17_fecha12_vs_visita.mp4</span>
        </div>
        <div className="shrink-0">
          <span ref={clockRef} className="font-semibold text-gray-200">{formatClock(MATCH_CLOCK_START)}</span>
          <span className="hidden sm:inline">
            {' '}· FRAME <span ref={frameRef} className="text-gray-200">001284</span> · 8 FPS
          </span>
        </div>
      </div>

      {/* Cancha */}
      <div className="relative">
        <svg
          ref={svgRef}
          viewBox="-30 -30 1110 740"
          className="block h-auto w-full"
          role="group"
          aria-label="Simulación de tracking táctico: haz clic en un jugador para ver su telemetría"
        >
          <defs>
            <linearGradient id="fut-pitch" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0d2a1b" />
              <stop offset="100%" stopColor="#081a11" />
            </linearGradient>
            <linearGradient id="fut-scan" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#00e676" stopOpacity="0" />
              <stop offset="85%" stopColor="#00e676" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#7dffb6" stopOpacity="0.55" />
            </linearGradient>
            <radialGradient id="fut-heat">
              <stop offset="0%" stopColor="#00e676" stopOpacity="0.32" />
              <stop offset="100%" stopColor="#00e676" stopOpacity="0" />
            </radialGradient>
            <filter id="fut-glow" x="-10%" y="-10%" width="120%" height="120%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <clipPath id="fut-pitch-clip">
              <rect x="-30" y="-30" width="1110" height="740" />
            </clipPath>
          </defs>

          <rect x="-30" y="-30" width="1110" height="740" fill="url(#fut-pitch)" />
          {Array.from({ length: 10 }, (_, i) => (
            <rect key={i} x={i * 105} y="0" width="105" height="680" fill="#ffffff" fillOpacity={i % 2 ? 0.018 : 0} />
          ))}
          <ellipse cx="610" cy="330" rx="170" ry="130" fill="url(#fut-heat)" />
          <ellipse cx="300" cy="470" rx="120" ry="90" fill="url(#fut-heat)" opacity="0.6" />

          <PitchMarkings />

          <g clipPath="url(#fut-pitch-clip)">
            <rect className="scan-line" x="0" y="-30" width="80" height="740" fill="url(#fut-scan)" />
          </g>

          {/* Capas de análisis bajo los jugadores */}
          <g style={{ opacity: showLines ? 1 : 0, transition: 'opacity 400ms ease' }}>
            {Object.keys(DEFENSIVE_LINES).map((team) => (
              <polyline
                key={team} data-defline={team} fill="none" stroke={TEAM_COLORS[team]} strokeOpacity="0.7"
                strokeWidth="3" strokeDasharray="14 8" strokeLinejoin="round"
              />
            ))}
          </g>
          <g style={{ opacity: showTracking ? 1 : 0, transition: 'opacity 400ms ease' }}>
            {PLAYERS.map((player) => (
              <polyline
                key={player.key} data-trail={player.key} fill="none" stroke={TEAM_COLORS[player.team]}
                strokeOpacity="0.35" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"
              />
            ))}
          </g>
          <line className="pass-line" stroke="#ffffff" strokeWidth="2.5" strokeDasharray="10 8" opacity="0" />
          <g className="pass-target" opacity="0">
            <circle r="20" fill="none" stroke="#ffffff" strokeOpacity="0.8" strokeWidth="2" />
            <circle r="3" fill="#ffffff" />
          </g>
          <circle className="carrier-ring" r="26" fill="none" stroke="#ffffff" strokeOpacity="0.85" strokeWidth="2.5" strokeDasharray="12 9" opacity="0" />

          {PLAYERS.map((player) => (
            <PlayerNode
              key={player.key}
              player={player}
              selected={player.key === selectedKey}
              labeled={LABELED_PLAYERS.has(player.key)}
              showTracking={showTracking}
              showGhost={showGhost}
              onSelect={setSelectedKey}
            />
          ))}

          <g className="ball">
            <ellipse className="ball-shadow" cy="5" rx="9" ry="4" fill="#000000" opacity="0.45" />
            <g className="ball-body">
              <circle r="16" fill="#ffffff" fillOpacity="0.12" />
              <circle r="7" fill="#ffffff" stroke="#0a0a0a" strokeWidth="2" />
            </g>
          </g>
        </svg>

        <p className="pointer-events-none absolute bottom-2 right-3 hidden rounded-md bg-carbon-900/70 px-2 py-1 font-mono text-[10px] text-gray-400 sm:block">
          Clic en un jugador para ver su telemetría
        </p>
      </div>

      {/* Feed de eventos detectados en vivo */}
      <div className="flex items-center gap-3 border-t border-white/10 px-4 py-2.5 font-mono text-[11px]" aria-live="off">
        <span className="shrink-0 rounded bg-white/5 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-gray-400">Eventos</span>
        <ol className="flex min-w-0 flex-1 items-center gap-5 overflow-clip">
          {events.length === 0 && <li className="text-gray-500">Analizando jugada…</li>}
          {events.slice(0, 1).map((event) => (
            <li key={event.id} className="flex min-w-0 animate-[event-in_400ms_ease-out] items-center gap-2 truncate text-gray-200">
              <span className={`h-1.5 w-1.5 rounded-full ${event.team === 'home' ? 'bg-neon' : 'bg-tech'}`} />
              <span className="text-gray-500">{event.clock}</span>
              {event.text}
            </li>
          ))}
        </ol>
        <span className="hidden shrink-0 text-gray-500 lg:inline">
          Posesión <span ref={possessionRef} className="text-gray-300">56% · 44%</span>
        </span>
      </div>

      {/* Panel de telemetría + capas */}
      <div className="grid gap-4 border-t border-white/10 p-4 sm:grid-cols-[1fr_auto] sm:items-end">
        <div>
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span
              className="font-mono text-xs font-semibold"
              style={{ color: TEAM_COLORS[selected.team] }}
            >
              ID {pad2(selected.trackId)}
            </span>
            <span className="font-display text-sm font-semibold text-white">
              #{selected.n} · {selected.role}
            </span>
            <span className="text-xs text-gray-500">{selected.team === 'home' ? 'Local' : 'Visita'}</span>
            <span className="ml-auto flex items-center gap-1.5 font-mono text-xs text-gray-400">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-neon" />
              <span ref={speedRef} className="text-white">0,0</span> km/h ahora
            </span>
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
            <div>
              <dt className="text-[10px] uppercase tracking-wider text-gray-500">Vel. máx</dt>
              <dd className="font-mono text-lg font-semibold text-white">
                <AnimatedNumber value={telemetry.speed} decimals={1} />
                <span className="ml-1 text-xs text-gray-500">km/h</span>
              </dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase tracking-wider text-gray-500">Distancia</dt>
              <dd className="font-mono text-lg font-semibold text-white">
                <AnimatedNumber value={telemetry.distance} decimals={1} />
                <span className="ml-1 text-xs text-gray-500">km</span>
              </dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase tracking-wider text-gray-500">Sprints</dt>
              <dd className="font-mono text-lg font-semibold text-white">
                <AnimatedNumber value={telemetry.sprints} />
              </dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase tracking-wider text-gray-500">Asimetría</dt>
              <dd className={`font-mono text-lg font-semibold ${risk.color}`}>
                <AnimatedNumber value={telemetry.asymmetry} />
                <span className="text-xs">%</span>
              </dd>
            </div>
          </dl>
          <div className="mt-3 flex items-center gap-3">
            <div className="h-1.5 flex-1 overflow-clip rounded-full bg-white/10">
              <div
                className={`h-full rounded-full transition-all duration-700 ${risk.bar}`}
                style={{ width: `${Math.min(100, (telemetry.asymmetry / 20) * 100)}%` }}
              />
            </div>
            <span className={`text-[11px] font-medium ${risk.color}`}>{risk.label}</span>
            {deviation !== null && showGhost && (
              <span className="text-[11px] text-gray-400">· Δ {deviation.toFixed(1).replace('.', ',')} m vs esquema</span>
            )}
          </div>
        </div>

        <div className="flex gap-2 sm:flex-col">
          {toggles.map(({ label, active, onClick, dot }) => (
            <button
              key={label}
              type="button"
              onClick={onClick}
              aria-pressed={active}
              className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                active ? 'border-white/20 bg-white/10 text-white' : 'border-white/10 bg-transparent text-gray-500'
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${active ? dot : 'bg-gray-600'}`} />
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
