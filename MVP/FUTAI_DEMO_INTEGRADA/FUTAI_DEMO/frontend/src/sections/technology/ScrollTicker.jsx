import { pad2 } from '@/lib/format';

/* =============================================================================
   INDICADOR DE PROGRESO DEL OJO (vertical)
   Regla de arriba hacia abajo con una marca larga por etapa y marcas cortas entre
   medio. El cabezal y el tramo recorrido los mueve VisionEye directamente (refs),
   sin re-render de React. Cada tramo es un botón que lleva a esa etapa.
   ========================================================================== */

const TICKS_PER_STAGE = 6;

function TickColumn({ stages }) {
  const total = stages * TICKS_PER_STAGE;
  return (
    <div className="absolute inset-0" aria-hidden="true">
      {Array.from({ length: total + 1 }, (_, i) => {
        const major = i % TICKS_PER_STAGE === 0;
        return (
          <span
            key={i}
            className={`absolute left-1/2 h-px -translate-x-1/2 -translate-y-1/2 rounded-full bg-current ${major ? 'w-3.5' : 'w-2 opacity-70'}`}
            style={{ top: `${(i / total) * 100}%` }}
          />
        );
      })}
    </div>
  );
}

export function ScrollTicker({ stages, stage, onJump, playheadRef, fillRef }) {
  return (
    <div className="pointer-events-auto flex flex-col items-center gap-3 rounded-full border border-white/10 bg-carbon-900/80 px-1.5 py-3.5 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.8)] backdrop-blur-md">
      <p className="sr-only" aria-live="polite">
        Etapa {stage + 1} de {stages.length}: {stages[stage].label}
      </p>
      <span className="font-mono text-[10px] font-semibold text-neon" aria-hidden="true">{pad2(stage + 1)}</span>
      <div className="relative h-44 w-6 sm:h-72">
        <div className="text-white/25">
          <TickColumn stages={stages.length} />
        </div>
        <div ref={fillRef} className="absolute inset-0 text-neon" style={{ clipPath: 'inset(0 0 100% 0)' }}>
          <TickColumn stages={stages.length} />
        </div>
        <span
          ref={playheadRef}
          className="pointer-events-none absolute left-1/2 h-[3px] w-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-neon shadow-[0_0_10px_2px_rgba(0,230,118,0.55)]"
          style={{ top: '0%' }}
        />
        <div className="absolute inset-0 flex flex-col">
          {stages.map((item, i) => (
            <button
              key={item.label}
              type="button"
              onClick={() => onJump(i)}
              aria-label={`Ir a la etapa ${i + 1}: ${item.label}`}
              aria-current={i === stage ? 'step' : undefined}
              title={item.label}
              className="w-full flex-1 rounded-sm outline-none focus-visible:ring-1 focus-visible:ring-neon/70"
            />
          ))}
        </div>
      </div>
      <span className="font-mono text-[10px] text-gray-500" aria-hidden="true">{pad2(stages.length)}</span>
    </div>
  );
}
