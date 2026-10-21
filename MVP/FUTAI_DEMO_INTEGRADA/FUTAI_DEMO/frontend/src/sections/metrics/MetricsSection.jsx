import { useRef } from 'react';
import anime from 'animejs';
import { METRICS } from '@/content/metrics';
import { revealChildren, useInViewAnimation } from '@/lib/motion';
import { MetricVisual } from '@/sections/metrics/MetricVisual';

/* =============================================================================
   3. MÉTRICAS DESTACADAS
   Cada casilla: tema, cifra con su unidad en palabras, título simple, explicación
   corta y un mini-gráfico que muestra la idea.
   ========================================================================== */

export function MetricsSection() {
  const ref = useRef(null);
  const valueRefs = useRef([]);

  useInViewAnimation(ref, (root, reduced) => {
    const cleanupReveal = revealChildren(root, reduced, { stagger: 110 });
    if (reduced) return cleanupReveal;

    const q = (name) => root.querySelectorAll(`[data-mx="${name}"]`);
    anime.set(q('draw'), { strokeDashoffset: 1 });
    anime.set(q('alert'), { scale: 0 });
    anime.set([...q('chip'), ...q('dot')], { opacity: 0 });
    anime.set(q('frame-on'), { opacity: 0.15 });

    const counters = METRICS.map((metric) => ({ v: metric.start }));
    const animations = [
      anime({
        targets: counters,
        v: (_, i) => METRICS[i].end,
        duration: 2000,
        delay: anime.stagger(140, { start: 200 }),
        easing: 'easeOutExpo',
        update: () => {
          counters.forEach((counter, i) => {
            const el = valueRefs.current[i];
            if (el) el.textContent = METRICS[i].format(counter.v);
          });
        },
      }),
      anime({ targets: q('chip'), opacity: [0, 1], translateY: [6, 0], duration: 500, delay: anime.stagger(90, { start: 500 }), easing: 'easeOutQuad' }),
      // Los cuadros analizados se encienden de izquierda a derecha, como el motor recorriendo el video.
      anime({ targets: q('frame-on'), opacity: [0.15, 1], duration: 300, delay: anime.stagger(110, { start: 600 }), easing: 'easeOutQuad' }),
      anime({ targets: q('draw'), strokeDashoffset: [1, 0], duration: 1600, delay: 700, easing: 'easeInOutSine' }),
      anime({ targets: q('alert'), scale: [0, 1], duration: 500, delay: 2200, easing: 'easeOutBack' }),
      anime({ targets: q('dot'), opacity: [0, 1], duration: 300, delay: anime.stagger(35, { start: 800 }), easing: 'easeOutQuad' }),
    ];
    return () => {
      cleanupReveal();
      animations.forEach((animation) => animation.pause());
      anime.remove(root.querySelectorAll('[data-mx]'));
    };
  });

  return (
    <section ref={ref} className="relative border-y border-white/5 bg-carbon-800/60 py-16 sm:py-20" aria-label="FUT.AI en cifras">
      <div className="mx-auto grid max-w-7xl gap-4 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
        {METRICS.map((metric, i) => {
          const accent = metric.accent === 'neon' ? 'text-neon' : 'text-tech';
          return (
            <article
              key={metric.title}
              data-reveal
              className="relative flex flex-col overflow-clip rounded-2xl border border-white/10 bg-white/[0.04] p-6 transition-colors hover:border-white/20"
            >
              <div
                className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent ${metric.accent === 'neon' ? 'via-neon' : 'via-tech'} to-transparent`}
              />
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-gray-500">{metric.topic}</p>
              <p className={`mt-3 font-display text-4xl font-bold tracking-tight ${accent}`}>
                <span ref={(el) => { valueRefs.current[i] = el; }}>{metric.format(metric.end)}</span>
              </p>
              <p className="mt-1 text-xs font-medium text-gray-400">{metric.unit}</p>
              <h3 className="mt-4 font-semibold text-white">{metric.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-400">{metric.description}</p>
              <div className="mt-auto pt-5">
                <div className="flex h-[76px] flex-col justify-end border-t border-white/10 pt-4">
                  <MetricVisual type={metric.visual} />
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
