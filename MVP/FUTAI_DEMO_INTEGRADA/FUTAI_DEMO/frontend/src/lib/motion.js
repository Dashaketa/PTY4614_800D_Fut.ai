import { useEffect, useRef } from 'react';
import anime from 'animejs';

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/* =============================================================================
   UTILIDADES DE ANIMACIÓN
   ========================================================================== */

/**
 * Ejecuta `setup(root, reduced)` una sola vez, cuando el elemento entra al viewport.
 * `setup` puede devolver una función de limpieza que se ejecuta al desmontar.
 */
export function useInViewAnimation(ref, setup) {
  const setupRef = useRef(setup);
  setupRef.current = setup;

  useEffect(() => {
    const root = ref.current;
    if (!root) return undefined;
    let cleanup;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        cleanup = setupRef.current(root, prefersReducedMotion());
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    );
    observer.observe(root);
    return () => {
      observer.disconnect();
      cleanup?.();
    };
  }, [ref]);
}

/** Revelado escalonado de los hijos marcados con `data-reveal`. Devuelve la limpieza. */
export function revealChildren(root, reduced, { stagger = 90, y = 28 } = {}) {
  const items = root.querySelectorAll('[data-reveal]');
  if (reduced) {
    items.forEach((el) => { el.style.opacity = '1'; });
    return () => {};
  }
  const animation = anime({
    targets: items,
    opacity: [0, 1],
    translateY: [y, 0],
    duration: 950,
    delay: anime.stagger(stagger),
    easing: 'easeOutExpo',
  });
  return () => {
    animation.pause();
    anime.remove(items);
  };
}

export function useReveal(ref, options) {
  useInViewAnimation(ref, (root, reduced) => revealChildren(root, reduced, options));
}
