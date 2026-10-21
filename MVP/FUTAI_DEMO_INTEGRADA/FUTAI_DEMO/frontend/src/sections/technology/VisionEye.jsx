import { useEffect, useRef, useState } from 'react';
import { pad2 } from '@/lib/format';
import { clamp01 } from '@/lib/math';
import { prefersReducedMotion } from '@/lib/motion';
import { MemoEyeGraphic } from '@/sections/technology/EyeGraphic';
import { EYE_STAGES } from '@/sections/technology/eyeData';
import { renderEye, setEyeAttr } from '@/sections/technology/eyeRenderer';
import { ScrollTicker } from '@/sections/technology/ScrollTicker';

/* =============================================================================
   OJO FUT.AI: RECORRIDO DEL VISION ENGINE LIGADO AL SCROLL
   El ojo del logo queda fijo mientras se hace scroll. Se abre, parpadea en cada
   cambio de etapa y su pupila es un balón que acompaña el análisis y, al final,
   se desarma en paneles que se convierten en métricas.
   ========================================================================== */

// El recorrido empieza un poco antes de fijarse el ojo, para que llegue ya dibujándose.
const SCROLL_LEAD = 0.6;

export function VisionEye() {
  const wrapperRef = useRef(null);
  const playheadRef = useRef(null);
  const fillRef = useRef(null);
  const [stage, setStage] = useState(0);

  // Lleva el scroll al punto medio de una etapa (clic en el indicador).
  const jumpToStage = (index) => {
    const wrapper = wrapperRef.current;
    const vh = window.innerHeight;
    const range = wrapper.offsetHeight - vh + vh * SCROLL_LEAD;
    const top = wrapper.getBoundingClientRect().top + window.scrollY;
    const p = (index + 0.55) / EYE_STAGES.length;
    window.scrollTo({ top: top - vh * SCROLL_LEAD + p * range, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  };

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const svg = wrapper.querySelector('svg');
    const q = (name) => svg.querySelector(`[data-eye="${name}"]`);
    const qa = (name) => [...svg.querySelectorAll(`[data-eye="${name}"]`)];
    const els = {
      clip: q('clip'),
      lines: qa('line'),
      lineHalos: qa('line-halo'),
      follow: qa('follow'),
      ticks: q('ticks'),
      progress: q('progress'),
      irisRing: q('iris-ring'),
      irisHalo: q('iris-halo'),
      irisFill: q('iris-fill'),
      pitch: q('pitch'),
      pitchLines: qa('pitch-line'),
      video: q('video'),
      sweep: q('sweep'),
      trails: qa('trail'),
      players: qa('player'),
      boxes: qa('box'),
      ids: qa('id'),
      skeleton: q('skeleton'),
      bones: qa('bone'),
      joints: qa('joint'),
      stride: q('stride'),
      strideLine: q('stride-line'),
      ghosts: q('ghosts'),
      ghostLinks: qa('ghost-link'),
      ballPos: q('ball-pos'),
      ballSpin: q('ball-spin'),
      ballClip: q('ball-clip'),
      ballBase: { setAttribute: (n, v) => qa('ball-base').forEach((el) => el.setAttribute(n, v)) },
      seams: q('seams'),
      panels: qa('panel'),
      metrics: qa('metric'),
    };
    const reduced = prefersReducedMotion();
    const stages = EYE_STAGES.length;

    const playhead = playheadRef.current;
    const fill = fillRef.current;
    const progress = () => {
      const rect = wrapper.getBoundingClientRect();
      const vh = window.innerHeight;
      return clamp01((vh * SCROLL_LEAD - rect.top) / (rect.height - vh + vh * SCROLL_LEAD));
    };

    const follow = { x: 0, y: 0, tx: 0, ty: 0 };
    const onPointer = (event) => {
      const rect = svg.getBoundingClientRect();
      follow.tx = clamp01((event.clientX - rect.left) / rect.width) * 28 - 14;
      follow.ty = clamp01((event.clientY - rect.top) / rect.height) * 20 - 10;
    };
    const onLeave = () => { follow.tx = 0; follow.ty = 0; };
    if (!reduced) {
      wrapper.addEventListener('pointermove', onPointer);
      wrapper.addEventListener('pointerleave', onLeave);
    }

    let lastP = -1;
    let lastStage = -1;
    let visible = false;
    let raf = 0;
    let smoothP = progress();
    let lastTime = performance.now();
    const tick = (now = performance.now()) => {
      raf = 0;
      const dt = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;
      // Inercia: el ojo persigue la posición del scroll en vez de saltar con cada paso de la rueda.
      // Los saltos grandes (un clic en el menú) se aplican directo.
      const target = progress();
      if (reduced || Math.abs(target - smoothP) > 0.25) smoothP = target;
      else smoothP += (target - smoothP) * (1 - Math.exp(-dt * 7));
      if (Math.abs(target - smoothP) < 1e-5) smoothP = target;
      const p = smoothP;
      const ease = 1 - Math.exp(-dt * 6);
      follow.x += (follow.tx - follow.x) * ease;
      follow.y += (follow.ty - follow.y) * ease;
      const moving = Math.abs(follow.tx - follow.x) > 0.05 || Math.abs(follow.ty - follow.y) > 0.05;
      if (Math.abs(p - lastP) > 1e-6 || moving) {
        lastP = p;
        const u = Math.min(p * stages, stages - 0.001);
        renderEye(els, u, p, reduced);
        const followTransform = `translate(${follow.x.toFixed(2)} ${follow.y.toFixed(2)})`;
        els.follow.forEach((el) => setEyeAttr(el, 'transform', followTransform));
        playhead.style.top = `${(p * 100).toFixed(2)}%`;
        fill.style.clipPath = `inset(0 0 ${(100 - p * 100).toFixed(2)}% 0)`;
        const current = Math.floor(u);
        if (current !== lastStage) {
          lastStage = current;
          setStage(current);
        }
      }
      if (visible) raf = requestAnimationFrame(tick);
    };

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible && !raf) raf = requestAnimationFrame(tick);
    });
    observer.observe(wrapper);
    tick();

    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
      wrapper.removeEventListener('pointermove', onPointer);
      wrapper.removeEventListener('pointerleave', onLeave);
    };
  }, []);

  return (
    <div ref={wrapperRef} className="relative" style={{ height: `${EYE_STAGES.length * 85 + 100}vh` }}>
      <div className="sticky top-0 flex h-[100svh] items-center overflow-clip">
        {/* Bajo 1400 px no hay margen libre: se reserva espacio a la derecha para el indicador. */}
        <div className="mx-auto grid w-full max-w-7xl items-center gap-6 px-4 pr-14 pt-16 sm:px-6 sm:pr-16 lg:grid-cols-[0.8fr_1.2fr] lg:gap-10 lg:px-8 lg:pr-20 min-[1400px]:pr-8">
          <div className="order-2 grid lg:order-1">
            {EYE_STAGES.map((item, i) => (
              <div
                key={item.label}
                aria-hidden={i !== stage}
                className={`[grid-area:1/1] transition-all duration-500 ${
                  i === stage ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0'
                }`}
              >
                <p className="font-mono text-xs uppercase tracking-[0.25em] text-neon">
                  {pad2(i + 1)} / {pad2(EYE_STAGES.length)} · {item.label}
                </p>
                <h3 className="mt-3 font-display text-2xl font-bold leading-tight text-white sm:text-3xl lg:text-4xl">{item.title}</h3>
                <p className="mt-4 max-w-md text-sm leading-relaxed text-gray-400 sm:text-base">{item.text}</p>
                {i === EYE_STAGES.length - 1 && (
                  <p className="mt-3 text-xs text-gray-500">Métricas de ejemplo.</p>
                )}
              </div>
            ))}
          </div>
          <div className="order-1 mx-auto aspect-[800/520] w-full max-w-[min(100%,calc(55svh*800/520))] lg:order-2 lg:max-w-none">
            <MemoEyeGraphic />
          </div>
        </div>

        {/* Indicador de progreso vertical, en el borde derecho */}
        <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center pt-16 sm:right-4 xl:right-6">
          <ScrollTicker stages={EYE_STAGES} stage={stage} onJump={jumpToStage} playheadRef={playheadRef} fillRef={fillRef} />
        </div>
      </div>
    </div>
  );
}
