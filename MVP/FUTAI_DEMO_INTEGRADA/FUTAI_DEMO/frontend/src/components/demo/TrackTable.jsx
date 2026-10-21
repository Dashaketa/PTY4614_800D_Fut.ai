import { useMemo, useState } from 'react';
import { formatNumber, numericValue, sortTracks } from '../../lib/analysis';
import { Panel } from './Panel';

const COLUMNS = [
  ['track_id', 'Track'],
  ['distancia_observada_m', 'Distancia observada (m)'],
  ['velocidad_maxima_estimada_kmh', 'Vel. máx. estimada (km/h)'],
  ['duracion_observada_s', 'Duración observada (s)'],
  ['revision_recomendada', 'Revisión'],
];

export default function TrackTable({ tracks, loading }) {
  const [sort, setSort] = useState('distancia_observada_m');
  const [descending, setDescending] = useState(true);
  const rows = useMemo(() => sortTracks(tracks, sort, descending), [tracks, sort, descending]);
  const maxDistance = Math.max(1, ...tracks.map((track) => numericValue(track.distancia_observada_m) ?? 0));

  function orderBy(field) {
    if (sort === field) setDescending((value) => !value);
    else { setSort(field); setDescending(true); }
  }

  return <Panel title="Rendimiento por trayectoria" detail="Ordena con los encabezados">
    {rows.length ? <>
      <div className="overflow-x-auto" aria-busy={loading}><table className="w-full min-w-[660px] text-left text-sm"><thead><tr className="border-b border-white/10 font-mono text-[10px] uppercase tracking-[.12em] text-gray-500">{COLUMNS.map(([key, label]) => <th key={key} className="px-3 py-4" scope="col" aria-sort={sort === key ? (descending ? 'descending' : 'ascending') : 'none'}><button type="button" onClick={() => orderBy(key)} className="text-left uppercase hover:text-neon">{label} {sort === key ? (descending ? '↓' : '↑') : ''}</button></th>)}</tr></thead><tbody>{rows.map((row, index) => {
        const distance = numericValue(row.distancia_observada_m);
        return <tr key={`${row.track_id}-${index}`} className="border-b border-white/[.05] hover:bg-white/[.03]">
          <td className="px-3 py-4 font-mono font-semibold text-neon">#{row.track_id}</td>
          <td className="px-3 py-4"><div className="font-mono text-white">{formatNumber(distance, 2)}{distance !== null ? ' m' : ''}</div>{distance !== null && <div className="mt-2 h-1.5 w-36 rounded-full bg-white/10"><div className="h-1.5 rounded-full bg-neon/80" style={{ width: `${Math.max(0, Math.min(100, distance / maxDistance * 100))}%` }}/></div>}</td>
          <td className="px-3 py-4 font-mono text-gray-200">{formatNumber(row.velocidad_maxima_estimada_kmh, 2)}</td>
          <td className="px-3 py-4 font-mono text-gray-400">{formatNumber(row.duracion_observada_s, 2)}</td>
          <td className="px-3 py-4"><span className={`rounded-md px-2 py-1 font-mono text-[10px] ${row.revision_recomendada === 'PRIORITARIA' ? 'bg-yellow-500/10 text-yellow-300' : 'bg-white/5 text-gray-400'}`}>{row.revision_recomendada || 'SIN EVALUAR'}</span></td>
        </tr>;
      })}</tbody></table></div>
      <p className="mt-4 text-xs leading-5 text-gray-500">“—” indica una métrica no disponible. Cada track representa una trayectoria detectada; un ID puede cambiar y no identifica permanentemente a un jugador.</p>
    </> : <div className="py-12 text-center text-sm leading-6 text-gray-500">{loading ? 'Cargando trayectorias…' : 'Este análisis no contiene trayectorias. Puedes importar resultados JSON o procesar un video.'}</div>}
  </Panel>;
}
