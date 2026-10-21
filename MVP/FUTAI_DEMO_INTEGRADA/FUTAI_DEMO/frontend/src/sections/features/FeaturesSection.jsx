import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { FEATURES } from '@/content/features';
import { pad2 } from '@/lib/format';
import { prefersReducedMotion, useReveal } from '@/lib/motion';
import { animatePanel, FEATURE_PANELS } from '@/sections/features/ReportPanels';

/* =============================================================================
   4. CARACTERÍSTICAS CORE
   Pestañas con avance automático y una ventana de "reporte de partido" que
   muestra cómo se ve cada capacidad dentro del producto.
   ========================================================================== */

const FEATURE_AUTOPLAY_MS = 8000;

export function FeaturesSection() {
  const ref = useRef(null);
  const panelRef = useRef(null);
  const [active, setActive] = useState(0);
  const [inView, setInView] = useState(false);
  const [autoplay, setAutoplay] = useState(true);
  const [hovered, setHovered] = useState(false);
  const reduced = useRef(prefersReducedMotion()).current;
  const playing = autoplay && inView && !hovered && !reduced;

  useReveal(ref, { stagger: 90 });

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.35 });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  // Avance automático entre pestañas mientras la sección está visible.
  useEffect(() => {
    if (!playing) return undefined;
    const timer = setTimeout(() => setActive((i) => (i + 1) % FEATURES.length), FEATURE_AUTOPLAY_MS);
    return () => clearTimeout(timer);
  }, [playing, active]);

  // Animación de entrada del panel activo.
  useEffect(() => {
    if (!inView || reduced) return undefined;
    return animatePanel(panelRef.current);
  }, [active, inView, reduced]);

  const select = (index) => {
    setActive(index);
    setAutoplay(false);
  };

  const handleKey = (event) => {
    const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[event.key];
    if (!step) return;
    event.preventDefault();
    const next = (active + step + FEATURES.length) % FEATURES.length;
    select(next);
    event.currentTarget.querySelectorAll('[role="tab"]')[next]?.focus();
  };

  const feature = FEATURES[active];
  const Panel = FEATURE_PANELS[feature.id];

  return (
    <section id="caracteristicas" ref={ref} className="relative py-24 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="Propuesta de valor"
          title={<>Lo que un analista ve en horas, <span className="text-gradient">FUT.AI lo entrega por partido</span></>}
          description="Tres capacidades que hoy solo existen en clubes con presupuesto de élite, disponibles con el video que tu club ya graba."
        />

        <div
          className="mt-16 grid gap-8 lg:grid-cols-[0.85fr_1.4fr] lg:items-start"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          <div data-reveal role="tablist" aria-label="Capacidades de FUT.AI" aria-orientation="vertical" onKeyDown={handleKey} className="flex flex-col gap-3">
            {FEATURES.map((item, i) => {
              const isActive = i === active;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  id={`feature-tab-${item.id}`}
                  aria-selected={isActive}
                  aria-controls="feature-panel"
                  tabIndex={isActive ? 0 : -1}
                  onClick={() => select(i)}
                  className={`relative overflow-clip rounded-2xl border p-5 text-left transition-colors ${
                    isActive ? 'border-white/15 bg-white/[0.06]' : 'border-white/5 bg-transparent hover:border-white/10 hover:bg-white/[0.03]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${isActive ? 'border-neon/40 text-neon' : 'border-white/10 text-gray-500'}`}>
                      <Icon name={item.icon} className="h-[18px] w-[18px]" />
                    </span>
                    <div className="min-w-0">
                      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-gray-500">{pad2(i + 1)} · {item.tag}</p>
                      <h3 className={`font-display text-lg font-semibold ${isActive ? 'text-white' : 'text-gray-300'}`}>{item.title}</h3>
                    </div>
                  </div>
                  <div className={`grid transition-[grid-template-rows] duration-500 ${isActive ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                    <div className="overflow-hidden">
                      <p className="mt-4 text-sm leading-relaxed text-gray-400">{item.description}</p>
                      <ul className="mt-4 space-y-2">
                        {item.bullets.map((bullet) => (
                          <li key={bullet} className="flex gap-2.5 text-sm text-gray-300">
                            <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-neon" strokeWidth={2.5} />
                            {bullet}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  {isActive && (
                    <span className="absolute inset-x-0 bottom-0 h-0.5 bg-white/5">
                      <span
                        key={`${active}-${playing}`}
                        className="block h-full origin-left bg-neon"
                        style={
                          playing
                            ? { animation: `feature-progress ${FEATURE_AUTOPLAY_MS}ms linear forwards` }
                            : { transform: autoplay ? 'scaleX(0)' : 'scaleX(1)' }
                        }
                      />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div data-reveal className="overflow-clip rounded-2xl border border-white/10 bg-carbon-800/80 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.8)] backdrop-blur-md">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <img src="/fut-ai-mark.png" alt="" className="h-4 w-auto opacity-80" />
                <p className="truncate text-xs text-gray-400">
                  <span className="font-medium text-gray-200">Reporte de partido</span> · Sub-17 · Fecha 12 · Local 2–1 Visita
                </p>
              </div>
              <span className="hidden shrink-0 rounded-md border border-white/10 px-2 py-0.5 font-mono text-[10px] text-gray-400 sm:inline">
                {feature.title}
              </span>
            </div>
            <div id="feature-panel" role="tabpanel" aria-labelledby={`feature-tab-${feature.id}`} ref={panelRef} key={feature.id} className="p-5 sm:p-6 lg:min-h-[488px]">
              <Panel />
            </div>
            <p className="border-t border-white/10 px-5 py-2.5 text-[11px] text-gray-500">
              Datos de ejemplo. Los resultados reales se validan con cada club durante el piloto.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
