import { useEffect, useRef, useState } from 'react';
import anime from 'animejs';
import { prefersReducedMotion } from '@/lib/motion';

/** Número que interpola suavemente con Anime.js cada vez que cambia `value`. */
export function AnimatedNumber({ value, decimals = 0, duration = 900 }) {
  const ref = useRef(null);
  const state = useRef({ v: value });
  const [initialText] = useState(() => value.toFixed(decimals));

  useEffect(() => {
    const el = ref.current;
    const current = state.current;
    if (prefersReducedMotion()) {
      current.v = value;
      el.textContent = value.toFixed(decimals);
      return undefined;
    }
    const animation = anime({
      targets: current,
      v: value,
      duration,
      easing: 'easeOutExpo',
      update: () => { el.textContent = current.v.toFixed(decimals); },
    });
    return () => animation.pause();
  }, [value, decimals, duration]);

  return <span ref={ref}>{initialText}</span>;
}
