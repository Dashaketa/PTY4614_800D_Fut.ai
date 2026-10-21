import { useEffect, useState } from 'react';
import { artifactUrl } from '../../lib/api';
import { Panel } from './Panel';

export default function AnalysisEvidence({ record, job }) {
  const [videoError, setVideoError] = useState(false);
  const matchingJob = job?.analysis_id === record?.id && job?.status === 'completed' ? job : null;
  const artifacts = record?.artifacts || matchingJob?.artifacts || {};
  const video = artifactUrl(artifacts.video);
  const tracks = artifactUrl(artifacts.tracks);
  const result = artifactUrl(artifacts.result);
  const browserCompatible = record?.result?.procesamiento?.video_browser_compatible !== false;

  useEffect(() => { setVideoError(false); }, [video]);

  return <Panel title="Evidencia del análisis" detail={record ? `Análisis #${record.id}` : 'Sin resultado seleccionado'}>
    <div className="flex aspect-video items-center justify-center overflow-hidden rounded-xl border border-neon/20 bg-[#060e0b]">
      {video && browserCompatible && !videoError
        ? <video key={video} src={video} controls playsInline preload="metadata" className="h-full w-full object-contain" onError={() => setVideoError(true)}/>
        : <div className="max-w-sm px-6 text-center"><div className="mb-3 font-display text-xl text-neon">FUT.AI</div><p className="text-sm leading-6 text-gray-400">{video ? 'El video anotado está disponible para descargar. Este navegador no admite su reproducción.' : 'El video anotado aparecerá aquí al completar un análisis. Los resultados importados pueden consultarse sin video.'}</p></div>}
    </div>
    <p className="mt-3 break-all text-xs leading-5 text-gray-500">{record?.result?.video || 'Selecciona o procesa un análisis.'}{video ? ' · Evidencia vinculada a este resultado.' : ''}</p>
    {(video || tracks || result) && <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
      {[[video, 'Descargar video'], [tracks, 'Trayectorias CSV'], [result, 'Resultados JSON']].filter(([url]) => url).map(([url, label]) => <a key={label} href={url} download target="_blank" rel="noreferrer" className="rounded-lg border border-white/20 px-3 py-2 text-gray-300 hover:border-neon hover:text-neon">{label}</a>)}
    </div>}
  </Panel>;
}
