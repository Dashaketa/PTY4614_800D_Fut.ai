import { useEffect, useId, useRef, useState } from 'react';
import { validateCalibration } from '../../lib/analysis';
import { Panel } from './Panel';

const JOB_LABEL = { queued: 'En cola', running: 'Procesando', completed: 'Completado', failed: 'No se pudo completar' };

export default function ProcessingPanel({ health, connection, processing, refreshHealth, onViewResult }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [duration, setDuration] = useState(null);
  const [previewError, setPreviewError] = useState(false);
  const [fileError, setFileError] = useState('');
  const [annotationStyle, setAnnotationStyle] = useState('ellipses');
  const [calibration, setCalibration] = useState(null);
  const [calibrationName, setCalibrationName] = useState('');
  const [calibrationError, setCalibrationError] = useState('');
  const [readingCalibration, setReadingCalibration] = useState(false);
  const calibrationRead = useRef(0);
  const inputId = useId();
  const capability = health?.processing;
  const ready = connection === 'online' && capability?.enabled && capability?.ready;
  const { job, busy, submitting, restoring, error, canRetry, retry, submit, pendingUpload, recoveringUpload, recoverUpload } = processing;
  const maxMb = Number(capability?.max_upload_mb) || null;
  const maxSeconds = Number(capability?.max_video_seconds) || null;
  const videoIssue = file && maxMb && file.size > maxMb * 1024 * 1024
    ? `El video supera el límite de ${maxMb} MB.` : '';
  const unavailable = connection === 'checking' ? 'Comprobando disponibilidad del procesamiento…'
    : connection !== 'online' ? 'Conecta el backend para procesar un video.'
      : capability?.reason || 'El procesamiento de video no está habilitado en este servidor.';
  const progress = Math.max(0, Math.min(100, Number(job?.progress) || 0));

  useEffect(() => {
    if (!file) { setPreview(null); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => () => { calibrationRead.current += 1; }, []);

  function chooseVideo(event) {
    const selected = event.target.files?.[0];
    event.target.value = '';
    if (!selected) return;
    setPreviewError(false);
    setDuration(null);
    if (!/\.(mp4|webm|mov)$/i.test(selected.name)) {
      setFile(null);
      setFileError('Selecciona un video MP4, WebM o MOV.');
      return;
    }
    setFileError('');
    setFile(selected);
  }

  async function chooseCalibration(event) {
    const selected = event.target.files?.[0];
    event.target.value = '';
    if (!selected) return;
    const readId = ++calibrationRead.current;
    setCalibration(null);
    setCalibrationName(selected.name);
    setCalibrationError('');
    setReadingCalibration(true);
    try {
      if (selected.size > 64 * 1024) throw new Error('La calibración debe ocupar como máximo 64 KB.');
      const value = validateCalibration(JSON.parse(await selected.text()));
      if (readId === calibrationRead.current) setCalibration(value);
    } catch (failure) {
      if (readId === calibrationRead.current) setCalibrationError(failure instanceof SyntaxError ? 'El archivo de calibración no contiene JSON válido.' : failure.message);
    } finally {
      if (readId === calibrationRead.current) setReadingCalibration(false);
    }
  }

  function clearCalibration() {
    calibrationRead.current += 1;
    setCalibration(null);
    setCalibrationName('');
    setCalibrationError('');
    setReadingCalibration(false);
  }

  function start(event) {
    event.preventDefault();
    if (ready && file && !busy && !videoIssue && !calibrationError && !readingCalibration) submit(file, calibration, annotationStyle);
  }

  return <Panel title="Analizar un video" detail="YOLO · ByteTrack · OpenCV">
    <p className="mb-4 text-sm leading-6 text-gray-400">Selecciona un clip para visualizarlo y pulsa Procesar para enviarlo al análisis.</p>
    <form onSubmit={start} className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor={`${inputId}-video`} className="cursor-pointer rounded-lg border border-neon/50 bg-neon/5 px-4 py-2.5 text-sm font-semibold text-neon hover:bg-neon/10">Elegir video</label>
        <input id={`${inputId}-video`} className="sr-only" type="file" accept=".mp4,.webm,.mov,video/mp4,video/webm,video/quicktime" onChange={chooseVideo}/>
        <span className="min-w-0 break-all text-xs text-gray-400">{file ? `${file.name} · ${(file.size / 1024 / 1024).toFixed(1)} MB` : 'MP4, WebM o MOV'}</span>
      </div>
      {fileError && <p role="alert" className="text-sm text-red-300">{fileError}</p>}
      {preview && <div>
        <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-gray-500">Vista previa local · video original</p>
        <video key={preview} src={preview} controls muted playsInline preload="metadata" className="aspect-video w-full rounded-xl bg-black object-contain" onLoadedMetadata={(event) => setDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : null)} onError={() => setPreviewError(true)}/>
        {previewError && <p className="mt-2 text-xs leading-5 text-yellow-200">El navegador no puede reproducir este formato. Puedes enviarlo al análisis si el servidor lo admite.</p>}
      </div>}
      <div>
        <label htmlFor={`${inputId}-annotation-style`} className="mb-2 block text-sm font-medium text-gray-200">Visualización del video</label>
        <select id={`${inputId}-annotation-style`} value={annotationStyle} onChange={(event) => setAnnotationStyle(event.target.value)} disabled={busy} className="w-full rounded-lg border border-white/20 bg-[#11151c] p-3 text-sm text-gray-200 disabled:opacity-50">
          <option value="ellipses">Elipses en los pies</option>
          <option value="boxes">Cajas de detección</option>
        </select>
        <p className="mt-2 text-xs text-gray-500">Se aplica al nuevo video procesado; los archivos anteriores conservan su estilo.</p>
      </div>
      <div className="rounded-xl border border-white/10 bg-white/[.025] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h3 className="text-sm font-medium text-gray-200">Calibración de cancha <span className="text-xs text-gray-500">(opcional)</span></h3><p className="mt-1 text-xs leading-5 text-gray-500">Para cámara fija, con puntos medidos en la cancha.</p></div>
          <label htmlFor={`${inputId}-calibration`} className="cursor-pointer rounded-lg border border-white/20 px-3 py-2 text-xs hover:border-neon hover:text-neon">Adjuntar JSON</label>
          <input id={`${inputId}-calibration`} className="sr-only" type="file" accept=".json,application/json" onChange={chooseCalibration}/>
        </div>
        {calibrationName && <div className="mt-3 flex items-center justify-between gap-3 text-xs"><span className={`break-all ${calibration ? 'text-neon' : 'text-gray-400'}`}>{readingCalibration ? 'Revisando… ' : calibration ? '✓ ' : ''}{calibrationName}</span><button type="button" onClick={clearCalibration} className="shrink-0 text-gray-400 underline hover:text-white">Quitar</button></div>}
        {calibrationError && <p role="alert" className="mt-2 text-xs leading-5 text-red-300">{calibrationError}</p>}
        <p className="mt-3 text-xs leading-5 text-gray-400">{calibration ? 'Las métricas serán estimaciones provisionales. Esta calibración fija requiere que la cámara permanezca inmóvil.' : 'Sin calibración se obtienen detecciones, trayectorias y posiciones en píxeles. Distancia en metros y velocidad quedan sin datos.'}</p>
        <details className="mt-3 text-xs text-gray-500"><summary className="cursor-pointer hover:text-gray-300">Formato de calibración</summary><p className="mt-2 leading-5">Al menos cuatro puntos correspondientes, en el mismo orden. Las coordenadas de imagen usan píxeles y las de cancha, metros. No reutilices una calibración fija para una cámara móvil.</p><pre className="mt-2 overflow-x-auto rounded-lg bg-black/30 p-3 text-[10px] leading-5">{'{\n  "mode": "static",\n  "image_points": [[x1, y1], [x2, y2], [x3, y3], [x4, y4]],\n  "field_points": [[X1, Y1], [X2, Y2], [X3, Y3], [X4, Y4]],\n  "field_size": [105, 68]\n}'}</pre><p className="mt-2 leading-5">Reemplaza las coordenadas y dimensiones por valores reales de tu toma.</p></details>
      </div>
      {!ready && <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-3 text-xs leading-5 text-yellow-100"><p>{unavailable}</p><button type="button" className="mt-1 underline" onClick={refreshHealth}>Comprobar disponibilidad</button></div>}
      {(maxMb || maxSeconds) && <p className="text-xs leading-5 text-gray-500">{[maxMb && `Subida de hasta ${maxMb} MB`, maxSeconds && `se procesan hasta ${maxSeconds} segundos por video`].filter(Boolean).join(' · ')}.{duration && maxSeconds && duration > maxSeconds ? ' Este clip generará un análisis parcial.' : ''}</p>}
      {videoIssue && <p role="alert" className="text-sm text-red-300">{videoIssue}</p>}
      <button type="submit" disabled={!ready || !file || busy || Boolean(videoIssue || calibrationError) || readingCalibration} className="w-full rounded-xl bg-neon px-5 py-3 text-sm font-bold text-carbon-900 transition hover:bg-[#33eb91] disabled:cursor-not-allowed disabled:opacity-40">{submitting ? 'Enviando video…' : restoring ? 'Recuperando trabajo…' : busy ? 'Análisis en curso…' : 'Procesar video'}</button>
    </form>
    {pendingUpload && !submitting && <div className="mt-4 rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-3 text-xs leading-5 text-yellow-100"><p>Quedó un envío sin confirmar: {pendingUpload.filename}. Busca su estado antes de volver a enviarlo.</p><button type="button" disabled={recoveringUpload} onClick={recoverUpload} className="mt-2 font-semibold underline disabled:opacity-50">{recoveringUpload ? 'Buscando envío…' : 'Buscar envío en el servidor'}</button></div>}
    {(job || restoring || error) && <div className="mt-5 rounded-xl border border-white/10 bg-black/15 p-4" aria-live="polite">
      {restoring && !job && <p className="text-sm text-gray-400">Recuperando el último trabajo de este navegador…</p>}
      {job && <>
        <div className="flex flex-wrap items-center justify-between gap-2"><span className={`text-sm font-semibold ${job.status === 'failed' ? 'text-red-300' : 'text-neon'}`}>{JOB_LABEL[job.status] || job.status}</span><span className="font-mono text-xs text-gray-400">{Math.round(progress)}%</span></div>
        <p className="mt-2 break-all text-xs text-gray-400">{job.filename}</p>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-label="Progreso del procesamiento" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><div className={`h-full rounded-full transition-[width] ${job.status === 'failed' ? 'bg-red-400' : 'bg-neon'}`} style={{ width: `${progress}%` }}/></div>
        <p className="mt-3 text-xs leading-5 text-gray-400">{job.message || (job.status === 'completed' ? 'Resultado disponible en el panel de análisis.' : 'El trabajo continuará aunque recargues esta página.')}</p>
        {job.status === 'completed' && job.analysis_id != null && <button type="button" className="mt-3 text-xs font-semibold text-neon underline" onClick={() => onViewResult(job.analysis_id)}>Ver resultado de este trabajo</button>}
        {job.error && <p role="alert" className="mt-3 text-sm leading-5 text-red-300">{job.error}</p>}
      </>}
      {error && <p role="alert" className="mt-3 text-sm leading-5 text-red-300">{error}{canRetry && <button type="button" onClick={retry} className="ml-2 font-semibold underline">Recuperar estado</button>}</p>}
    </div>}
  </Panel>;
}
