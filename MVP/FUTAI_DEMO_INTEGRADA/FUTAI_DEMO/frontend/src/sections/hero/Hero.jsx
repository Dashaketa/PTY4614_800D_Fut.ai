import { useEffect, useRef } from 'react';
import anime from 'animejs';
import { Icon } from '@/components/ui/Icon';
import { prefersReducedMotion } from '@/lib/motion';
import { TacticalPitch } from '@/sections/hero/TacticalPitch';

/* =============================================================================
   2. HERO + MAQUETA TÁCTICA INTERACTIVA
   ========================================================================== */

export function Hero() {
  const ref = useRef(null);

  // Revelado escalonado del Hero al montar.
  useEffect(() => {
    const root = ref.current;
    const items = root.querySelectorAll('[data-hero="text"]');
    const visual = root.querySelectorAll('[data-hero="visual"]');
    const glows = root.querySelectorAll('.hero-glow');

    if (prefersReducedMotion()) {
      [...items, ...visual].forEach((el) => { el.style.opacity = '1'; });
      return undefined;
    }

    const timeline = anime
      .timeline({ easing: 'easeOutExpo' })
      .add({
        targets: items,
        opacity: [0, 1],
        translateY: [36, 0],
        duration: 1100,
        delay: anime.stagger(110),
      })
      .add(
        {
          targets: visual,
          opacity: [0, 1],
          translateY: [40, 0],
          scale: [0.96, 1],
          duration: 1300,
        },
        250,
      );

    const breathing = anime({
      targets: glows,
      opacity: [0.35, 0.7],
      scale: [1, 1.12],
      duration: 4200,
      delay: anime.stagger(1400),
      direction: 'alternate',
      loop: true,
      easing: 'easeInOutSine',
    });

    return () => {
      timeline.pause();
      breathing.pause();
      anime.remove([...items, ...visual, ...glows]);
    };
  }, []);

  return (
    <section id="inicio" ref={ref} className="relative overflow-clip pb-20 pt-28 sm:pt-32 lg:pb-28">
      {/* Fondo */}
      <div className="bg-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_75%)]" />
      <div className="hero-glow pointer-events-none absolute -left-40 top-10 h-[480px] w-[480px] rounded-full bg-neon/20 blur-[120px]" />
      <div className="hero-glow pointer-events-none absolute -right-40 top-40 h-[420px] w-[420px] rounded-full bg-tech/15 blur-[120px]" />
      <img
        src="/fut-ai-logo.webp"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-24 w-[1100px] max-w-none -translate-x-1/2 opacity-[0.05]"
      />

      <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:gap-12 lg:px-8">
        <div>
          <div
            data-hero="text"
            className="inline-flex items-center gap-2 rounded-full border border-neon/30 bg-neon/10 px-3 py-1.5 font-mono text-[11px] font-medium uppercase tracking-wider text-neon"
          >
            <Icon name="sparkles" className="h-3.5 w-3.5" />
            Tecnología propia · Computer Vision
          </div>

          <h1
            data-hero="text"
            className="mt-6 font-display text-4xl font-bold leading-[1.08] tracking-tight text-white sm:text-5xl xl:text-[3.6rem]"
          >
            Inteligencia Táctica y Biomecánica de Élite,{' '}
            <span className="text-gradient">Sin Hardware Propietario</span>
          </h1>

          <p data-hero="text" className="mt-6 max-w-xl text-lg leading-relaxed text-gray-400">
            Democratizando el análisis deportivo con Computer Vision. Transforma cualquier video MP4 estándar en
            métricas cinéticas, detección de fatiga y auditoría posicional.
          </p>

          <div data-hero="text" className="mt-9 flex flex-col gap-3 sm:flex-row">
            <a
              href="#piloto"
              className="group inline-flex items-center justify-center gap-2 rounded-xl bg-neon px-6 py-3.5 text-sm font-semibold text-carbon-900 shadow-[0_0_30px_rgba(0,230,118,0.4)] transition hover:bg-[#33eb91] hover:shadow-[0_0_42px_rgba(0,230,118,0.6)]"
            >
              Comenzar Prueba Piloto
              <Icon name="arrowRight" className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </a>
            <a
              href="#demo"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-6 py-3.5 text-sm font-semibold text-white backdrop-blur-md transition hover:border-tech/60 hover:bg-tech/10 hover:text-tech"
            >
              <Icon name="play" className="h-4 w-4" />
              Probar Demo Interactiva
            </a>
          </div>

          <div data-hero="text" className="mt-10 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-gray-500">
            <span className="font-mono uppercase tracking-wider text-gray-400">Funciona con:</span>
            {['Trípode', 'Drone', 'Transmisión TV', 'Smartphone'].map((source) => (
              <span key={source} className="flex items-center gap-1.5">
                <Icon name="check" className="h-3.5 w-3.5 text-neon" strokeWidth={2.5} />
                {source}
              </span>
            ))}
          </div>
        </div>

        <div id="demo" data-hero="visual">
          <TacticalPitch />
          <p className="mt-3 text-center text-xs text-gray-500">
            Simulación ilustrativa: jugadores, IDs y telemetría son datos de ejemplo.
          </p>
        </div>
      </div>
    </section>
  );
}
