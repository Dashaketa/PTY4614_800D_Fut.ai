/* Recorrido automático: ilumina por pasos las cajas y flechas de un diagrama de Archify.
   Cada página define window.FUTAI_RECORRIDO = [{ titulo, texto, nodos: [...], flechas?: [...] }, ...].
   Con ?recorrido=1 en la URL arranca solo. */
(function () {
  const pasos = window.FUTAI_RECORRIDO;
  if (!Array.isArray(pasos) || !pasos.length) return;
  const MS = 5600;
  const icon = {
    play: '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M4.5 2.8v10.4c0 .6.6.9 1.1.6l8-5.2c.5-.3.5-.9 0-1.2l-8-5.2c-.5-.3-1.1 0-1.1.6Z"/></svg>',
    pause: '<svg viewBox="0 0 16 16" fill="currentColor"><rect x="3.5" y="2.5" width="3" height="11" rx="1"/><rect x="9.5" y="2.5" width="3" height="11" rx="1"/></svg>',
    prev: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10 3 5 8l5 5"/></svg>',
    next: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m6 3 5 5-5 5"/></svg>',
    close: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 4l8 8M12 4l-8 8"/></svg>',
  };

  function init() {
    const svg = document.querySelector('.diagram-container svg');
    if (!svg) return;
    const dock = document.createElement('div');
    dock.className = 'tour-dock no-print';
    dock.style.setProperty('--tour-ms', MS + 'ms');
    dock.innerHTML =
      '<button class="tour-start" type="button">' + icon.play + 'Recorrido</button>' +
      '<div class="tour-card" role="region" aria-live="polite" aria-label="Recorrido del diagrama">' +
        '<div class="tour-top"><span class="tour-step"></span><span class="tour-title"></span>' +
        '<button class="tour-btn" type="button" data-a="close" aria-label="Salir del recorrido">' + icon.close + '</button></div>' +
        '<p class="tour-text"></p>' +
        '<div class="tour-bar"><button class="tour-btn" type="button" data-a="prev" aria-label="Paso anterior">' + icon.prev + '</button>' +
        '<button class="tour-btn main" type="button" data-a="toggle" aria-label="Pausar">' + icon.pause + '</button>' +
        '<button class="tour-btn" type="button" data-a="next" aria-label="Paso siguiente">' + icon.next + '</button>' +
        '<span class="tour-dots">' + pasos.map(() => '<i></i>').join('') + '</span></div>' +
      '</div>';
    document.body.appendChild(dock);
    const $ = s => dock.querySelector(s);
    const dots = [...dock.querySelectorAll('.tour-dots i')];
    let i = -1, timer = null, playing = false;

    // ---- Celular: acerca el diagrama al grupo del paso animando el viewBox (Archify usa transform, no viewBox).
    const movil = () => window.matchMedia('(max-width: 700px)').matches;
    let vb0 = null, anim = 0;
    const leerVB = () => svg.getAttribute('viewBox').trim().split(/[\s,]+/).map(Number);
    function animarVB(dest, ms) {
      cancelAnimationFrame(anim);
      const from = leerVB(), t0 = performance.now();
      const ease = t => 1 - Math.pow(1 - t, 3);
      const step = now => {
        const t = Math.min(1, (now - t0) / ms), e = ease(t);
        svg.setAttribute('viewBox', from.map((v, j) => (v + (dest[j] - v) * e).toFixed(2)).join(' '));
        if (t < 1) anim = requestAnimationFrame(step);
      };
      anim = requestAnimationFrame(step);
    }
    function prepararMovil() {
      if (vb0) return;
      const reset = document.querySelector('[data-view="reset"]');
      if (reset) reset.click();                       // deja la cámara de Archify en 100 %
      vb0 = leerVB();
    }
    function zoomA(hits) {
      prepararMovil();
      const box = svg.closest('.diagram-container') || svg;
      const vb = leerVB(), S = svg.getBoundingClientRect(), C = box.getBoundingClientRect();
      const kx = vb[2] / S.width, ky = vb[3] / S.height;
      // Grupo del paso, en coordenadas del diagrama.
      let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
      hits.forEach(h => {
        const r = h.getBoundingClientRect();
        x1 = Math.min(x1, vb[0] + (r.left - S.left) * kx); x2 = Math.max(x2, vb[0] + (r.right - S.left) * kx);
        y1 = Math.min(y1, vb[1] + (r.top - S.top) * ky);   y2 = Math.max(y2, vb[1] + (r.bottom - S.top) * ky);
      });
      // Ventana visible: la parte del SVG que realmente se ve dentro del contenedor.
      const m = 10;
      const vl = Math.max(C.left + m, S.left), vr = Math.min(C.right - m, S.right);
      const vt = Math.max(C.top + m, S.top), vbm = Math.min(C.bottom - 72, S.bottom);   // 72: barra RUTA/LENTE
      const visW = Math.max(40, vr - vl), visH = Math.max(40, vbm - vt);
      const [, , W0, H0] = vb0, pad = 0.06 * Math.min(W0, H0);
      // Ancho de viewBox para que el grupo quepa en la ventana visible (mismo aspecto: el alto del SVG no cambia).
      let w = Math.max((x2 - x1 + 2 * pad) * S.width / visW, (y2 - y1 + 2 * pad) * S.height / visH * (W0 / H0));
      w = Math.max(W0 / 3.2, w);
      const h = w * H0 / W0;
      // Centro del grupo en el centro de la ventana visible.
      const x = (x1 + x2) / 2 - ((vl + vr) / 2 - S.left) * w / S.width;
      const y = (y1 + y2) / 2 - ((vt + vbm) / 2 - S.top) * h / S.height;
      animarVB([x, y, w, h], 700);
      // Deja el diagrama arriba, sobre el panel del recorrido.
      window.scrollTo({ top: Math.max(0, box.getBoundingClientRect().top + window.scrollY - 64), behavior: 'smooth' });
    }
    function soltarMovil() {
      if (!vb0) return;
      animarVB(vb0, 500); vb0 = null;
    }

    function paint(k) {
      const p = pasos[k];
      const nodos = new Set(p.nodos || []);
      const flechas = p.flechas ? new Set(p.flechas) : null;
      svg.classList.add('tour-on');
      svg.querySelectorAll('[data-node-id]').forEach(n => n.classList.toggle('tour-hit', nodos.has(n.getAttribute('data-node-id'))));
      svg.querySelectorAll('[data-edge-from]').forEach(e => {
        const hit = flechas ? flechas.has(e.getAttribute('data-edge-id'))
          : nodos.has(e.getAttribute('data-edge-from')) && nodos.has(e.getAttribute('data-edge-to'));
        e.classList.toggle('tour-hit', hit);
      });
      $('.tour-step').textContent = (k + 1) + ' / ' + pasos.length;
      $('.tour-title').textContent = p.titulo;
      $('.tour-text').textContent = p.texto;
      dots.forEach((d, j) => { d.className = j < k ? 'done' : ''; });
      void dots[k].offsetWidth; dots[k].className = 'now';
      // En la secuencia se enfocan los mensajes del paso; en el resto, las cajas.
      const hits = [...svg.querySelectorAll(flechas ? '[data-edge-from].tour-hit' : '[data-node-id].tour-hit')];
      if (hits.length && movil()) {
        // "enfoque" (opcional) limita el encuadre, por ejemplo a las ramas de un árbol sin su raíz.
        const foco = p.enfoque ? hits.filter(h => p.enfoque.includes(h.getAttribute('data-node-id'))) : hits;
        zoomA(foco.length ? foco : hits); return;
      }
      // Escritorio: centra en pantalla el grupo iluminado.
      if (hits.length) {
        const r = hits.map(h => h.getBoundingClientRect());
        const top = Math.min(...r.map(b => b.top)), bottom = Math.max(...r.map(b => b.bottom));
        const left = Math.min(...r.map(b => b.left)), right = Math.max(...r.map(b => b.right));
        const reserve = dock.getBoundingClientRect().height + 30;
        const room = window.innerHeight - reserve;
        const y = bottom - top > room - 40
          ? window.scrollY + top - 70
          : window.scrollY + (top + bottom) / 2 - room / 2;
        window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
        const sc = svg.closest('.diagram-container');
        if (sc && sc.scrollWidth > sc.clientWidth) {
          const box = sc.getBoundingClientRect();
          sc.scrollTo({ left: sc.scrollLeft + (left + right) / 2 - box.left - sc.clientWidth / 2, behavior: 'smooth' });
        }
      }
    }
    function go(k) {
      i = (k + pasos.length) % pasos.length;
      paint(i);
      clearTimeout(timer);
      if (playing) timer = setTimeout(() => (i === pasos.length - 1 ? stop(true) : go(i + 1)), MS);
    }
    function setPlaying(v) {
      playing = v;
      dock.dataset.paused = String(!v);
      const t = $('[data-a="toggle"]');
      t.innerHTML = v ? icon.pause : icon.play;
      t.setAttribute('aria-label', v ? 'Pausar' : 'Reanudar');
    }
    function start() { dock.dataset.on = 'true'; setPlaying(true); go(0); }
    function stop(ended) {
      clearTimeout(timer); setPlaying(false);
      if (ended) { dots.forEach(d => { d.className = 'done'; }); $('.tour-step').textContent = 'Fin'; return; }
      dock.dataset.on = 'false';
      soltarMovil();
      svg.classList.remove('tour-on');
      svg.querySelectorAll('.tour-hit').forEach(e => e.classList.remove('tour-hit'));
    }
    $('.tour-start').addEventListener('click', start);
    dock.addEventListener('click', e => {
      const a = e.target.closest('[data-a]'); if (!a) return;
      const act = a.dataset.a;
      if (act === 'close') stop(false);
      else if (act === 'toggle') {
        if ($('.tour-step').textContent === 'Fin') { setPlaying(true); go(0); }
        else { setPlaying(!playing); if (playing) go(i); else clearTimeout(timer); }
      }
      else if (act === 'next') go(i + 1);
      else if (act === 'prev') go(i - 1);
    });
    document.addEventListener('keydown', e => {
      if (dock.dataset.on !== 'true') return;
      if (e.key === 'Escape') stop(false);
      else if (e.key === 'ArrowRight') go(i + 1);
      else if (e.key === 'ArrowLeft') go(i - 1);
    });
    try { if (new URLSearchParams(location.search).get('recorrido') === '1') setTimeout(start, 900); } catch (_) {}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
