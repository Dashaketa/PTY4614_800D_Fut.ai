import { useRef } from 'react';
import anime from 'animejs';
import { Icon } from '@/components/ui/Icon';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { ENGINE_MODULES, ENGINE_NAME } from '@/content/engine';
import { revealChildren, useInViewAnimation, useReveal } from '@/lib/motion';
import { VisionEye } from '@/sections/technology/VisionEye';

/* =============================================================================
   6. TECNOLOGÍA PROPIA: FUT.AI VISION ENGINE
   ========================================================================== */

export function TechnologySection() {
  const headerRef = useRef(null);
  const engineRef = useRef(null);
  useReveal(headerRef);

  // El recorrido del ojo hace la sección muy alta: cada bloque se revela por separado.
  useInViewAnimation(engineRef, (root, reduced) => {
    const cleanupReveal = revealChildren(root, reduced, { stagger: 70 });
    if (reduced) return cleanupReveal;

    // Pulso del núcleo del motor.
    const core = root.querySelectorAll('.engine-core');
    const animation = anime({
      targets: core,
      opacity: [0.35, 0.8],
      scale: [0.92, 1.05],
      duration: 2400,
      direction: 'alternate',
      loop: true,
      easing: 'easeInOutSine',
    });

    return () => {
      cleanupReveal();
      animation.pause();
      anime.remove(core);
    };
  });

  return (
    <section id="tecnologia" className="relative overflow-clip pt-24 sm:pt-28">
      <div className="pointer-events-none absolute left-1/2 top-24 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-tech/10 blur-[140px]" />
      <div ref={headerRef} className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="Tecnología propia"
          title={<>Un solo motor, <span className="text-gradient">del MP4 a la métrica</span></>}
          description={`${ENGINE_NAME} es el motor de visión que desarrollamos para el fútbol: integra detección, tracking y biomecánica en un pipeline único y auditable, que escala por partido y no por cámara instalada.`}
        />
      </div>

      <VisionEye />

      <div ref={engineRef} className="relative mx-auto max-w-7xl px-4 pb-24 sm:px-6 sm:pb-28 lg:px-8">
        {/* Motor + módulos */}
        <div className="mt-10 grid gap-6 lg:grid-cols-[0.9fr_1.6fr]">
          <div
            data-reveal
            className="relative flex flex-col overflow-clip rounded-3xl border border-neon/30 bg-gradient-to-br from-neon/[0.10] via-carbon-800 to-tech/[0.08] p-8"
          >
            <div className="engine-core pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-neon/25 blur-[90px]" />
            <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-neon/40 bg-neon/10 text-neon">
              <Icon name="sparkles" className="h-7 w-7" />
            </div>
            <p className="relative mt-6 font-mono text-[11px] uppercase tracking-[0.25em] text-neon">Motor propietario</p>
            <h3 className="relative mt-2 font-display text-3xl font-bold text-white">{ENGINE_NAME}</h3>
            <p className="relative mt-4 text-sm leading-relaxed text-gray-300">
              Diseñado desde cero para el fútbol real: tomas abiertas, cámaras en movimiento, cruces y
              aglomeraciones en el área. Un único motor reemplaza herramientas aisladas y entrega datos listos para
              el cuerpo técnico.
            </p>
            <dl className="relative mt-auto grid grid-cols-3 gap-3 pt-8">
              {[
                ['22 + 1', 'objetos con ID'],
                ['17', 'puntos por jugador'],
                ['0', 'hardware propio'],
              ].map(([value, label]) => (
                <div key={label} className="rounded-xl border border-white/10 bg-carbon-900/60 px-3 py-3">
                  <dt className="sr-only">{label}</dt>
                  <dd className="font-mono text-lg font-bold text-white">{value}</dd>
                  <dd className="mt-0.5 text-[11px] leading-tight text-gray-500">{label}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {ENGINE_MODULES.map((module) => (
              <article
                key={module.title}
                data-reveal
                className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md transition hover:border-neon/30"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-tech/30 bg-tech/10 text-tech">
                    <Icon name={module.icon} className="h-5 w-5" />
                  </div>
                  <h4 className="font-display text-base font-semibold text-white">{module.title}</h4>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-gray-400">{module.description}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
