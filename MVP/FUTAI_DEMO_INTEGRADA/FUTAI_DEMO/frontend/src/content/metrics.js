// Las 4 casillas de "FUT.AI en cifras" (debajo del hero).

export const METRICS = [
  {
    topic: 'Hardware',
    start: 0,
    end: 0,
    format: (v) => `${Math.round(v)}`,
    unit: 'equipos extra',
    title: 'Funciona con la cámara que ya tienes',
    description: 'Si tu video está en MP4, FUT.AI lo analiza. No hay que comprar ni instalar cámaras especiales.',
    accent: 'neon',
    visual: 'sources',
  },
  {
    topic: 'Procesamiento',
    start: 5,
    end: 10,
    format: (v) => `5–${Math.round(v)}`,
    unit: 'cuadros analizados por segundo',
    title: 'Analiza solo lo que importa',
    description:
      'Un video trae 25–30 cuadros por segundo. El motor elige entre 5 y 10 y usa más en las jugadas rápidas: resultados en menos tiempo y a menor costo, sin perder sprints ni duelos.',
    accent: 'tech',
    visual: 'sampling',
  },
  {
    topic: 'Prevención',
    start: 0,
    end: 15,
    format: (v) => `${Math.round(v)}`,
    unit: 'minutos de línea base',
    title: 'Detecta la fatiga a tiempo',
    description:
      'Comparamos a cada jugador con sus propios primeros 15 minutos. Si su zancada cae, por ejemplo un 18%, el cuerpo técnico recibe una alerta antes de la lesión.',
    accent: 'neon',
    visual: 'fatigue',
  },
  {
    topic: 'Tracking',
    start: 0,
    end: 22,
    format: (v) => `${Math.round(v)} + 1`,
    unit: 'jugadores + balón',
    title: 'Nadie se pierde de vista',
    description: 'Seguimos a los 22 jugadores y al balón los 90 minutos, sin confundir identidades cuando se cruzan o se tapan.',
    accent: 'tech',
    visual: 'tracking',
  },
];
