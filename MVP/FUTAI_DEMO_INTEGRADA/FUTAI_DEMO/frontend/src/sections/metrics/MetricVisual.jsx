// Un segundo de video a 30 FPS; los índices marcados son los cuadros que analiza el motor
// (más densos al centro, donde la jugada se acelera).
const SAMPLING_FRAMES = 30;
const SAMPLED_FRAMES = new Set([0, 5, 10, 13, 15, 17, 19, 24, 29]);

export function MetricVisual({ type }) {
  if (type === 'sources') {
    return (
      <div className="flex flex-wrap gap-1.5">
        {['Trípode', 'Drone', 'Transmisión TV', 'Celular'].map((source) => (
          <span key={source} data-mx="chip" className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-gray-300">
            {source}
          </span>
        ))}
      </div>
    );
  }
  if (type === 'sampling') {
    return (
      <div>
        <div className="flex h-7 items-end gap-[3px]" aria-hidden="true">
          {Array.from({ length: SAMPLING_FRAMES }, (_, i) => (
            <span
              key={i}
              data-mx={SAMPLED_FRAMES.has(i) ? 'frame-on' : undefined}
              className={`flex-1 rounded-sm ${SAMPLED_FRAMES.has(i) ? 'h-full bg-tech' : 'h-3/5 bg-white/10'}`}
            />
          ))}
        </div>
        <div className="mt-2 flex justify-between font-mono text-[10px] text-gray-500">
          <span>1 segundo = 30 cuadros</span>
          <span className="text-tech">■ analizados</span>
        </div>
      </div>
    );
  }
  if (type === 'fatigue') {
    return (
      <div>
        <svg viewBox="0 0 240 44" className="w-full" aria-hidden="true">
          <rect x="0" y="0" width="60" height="44" fill="#00e676" fillOpacity="0.07" />
          <line x1="0" x2="240" y1="12" y2="12" stroke="#ffffff" strokeOpacity="0.12" strokeDasharray="3 3" />
          <path
            data-mx="draw" d="M2 12 L40 11 L80 13 L120 14 L160 20 L200 29 L232 36"
            fill="none" stroke="#00e676" strokeWidth="2" strokeLinecap="round" pathLength="1" strokeDasharray="1 1"
          />
          <circle data-mx="alert" className="svg-center" cx="232" cy="36" r="4" fill="#ff4d4f" />
        </svg>
        <div className="mt-2 flex justify-between font-mono text-[10px] text-gray-500">
          <span className="text-neon">base 0–15'</span>
          <span className="text-alert">● alerta de fatiga</span>
        </div>
      </div>
    );
  }
  return (
    <div>
      <div className="flex items-center gap-[3px]" aria-hidden="true">
        {Array.from({ length: 22 }, (_, i) => (
          <span key={i} data-mx="dot" className={`h-1.5 w-1.5 shrink-0 rounded-full ${i < 11 ? 'bg-neon' : 'bg-tech'}`} />
        ))}
        <span data-mx="dot" className="ml-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-white" />
      </div>
      <div className="mt-2 flex gap-3 font-mono text-[10px] text-gray-500">
        <span className="text-neon">● local</span>
        <span className="text-tech">● visita</span>
        <span className="text-gray-300">● balón</span>
      </div>
    </div>
  );
}
