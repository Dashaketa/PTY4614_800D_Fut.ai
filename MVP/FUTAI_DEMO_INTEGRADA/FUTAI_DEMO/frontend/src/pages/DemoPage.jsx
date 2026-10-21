import { useCallback, useEffect, useRef, useState } from 'react';
import AnalysisEvidence from '../components/demo/AnalysisEvidence';
import { Panel, Stat } from '../components/demo/Panel';
import ProcessingPanel from '../components/demo/ProcessingPanel';
import TrackTable from '../components/demo/TrackTable';
import useAnalysisData from '../hooks/useAnalysisData';
import useProcessingJob from '../hooks/useProcessingJob';
import { api } from '../lib/api';
import { formatDate, formatNumber, numericValue, originLabel } from '../lib/analysis';

function ErrorNotice({ children, retry }) {
  return <div role="alert" className="rounded-xl border border-red-400/40 bg-red-900/20 p-4 text-sm leading-6 text-red-100">{children}{retry && <button type="button" className="ml-3 font-bold underline" onClick={retry}>Reintentar</button>}</div>;
}

export default function DemoPage() {
  const analysis = useAnalysisData();
  const { health, connection, record, history, loading, loadAnalysis, refreshHistory, refreshHealth } = analysis;
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const importController = useRef(null);
  const selectionRevision = useRef(0);
  const jobSelectionRevision = useRef(0);

  const handleCompleted = useCallback((job) => {
    // A restored/completed job must not replace a more recent user selection.
    const selection = selectionRevision.current === jobSelectionRevision.current
      ? loadAnalysis(job.analysis_id) : Promise.resolve();
    return Promise.all([selection, refreshHistory()]);
  }, [loadAnalysis, refreshHistory]);
  const processingState = useProcessingJob(handleCompleted);
  const processing = {
    ...processingState,
    submit: (file, calibration, annotationStyle) => {
      jobSelectionRevision.current = selectionRevision.current;
      return processingState.submit(file, calibration, annotationStyle);
    },
  };

  function selectAnalysis(id) {
    selectionRevision.current += 1;
    return loadAnalysis(id);
  }

  function refreshAnalysis() {
    selectionRevision.current += 1;
    return analysis.refresh();
  }

  useEffect(() => () => importController.current?.abort(), []);

  const payload = record?.result;
  const meta = payload?.procesamiento || {};
  const tracks = Array.isArray(payload?.metricas_por_track) ? payload.metricas_por_track : [];
  const coverageValue = numericValue(meta.cobertura_homografia_pct);
  const coverage = coverageValue === null ? null : Math.max(0, Math.min(100, coverageValue));
  const frames = numericValue(meta.frames);
  const calibratedFrames = numericValue(meta.frames_calibrados ?? meta.frames_con_homografia)
    ?? (frames !== null && coverage !== null ? Math.round(frames * coverage / 100) : null);
  const statusText = connection === 'online' ? 'API conectada' : connection === 'checking' ? 'Conectando API…' : 'API desconectada';
  const statusColor = connection === 'online' ? 'border-neon/40 bg-neon/10 text-neon' : connection === 'checking' ? 'border-yellow-500/40 bg-yellow-500/10 text-yellow-200' : 'border-red-500/50 bg-red-500/10 text-red-300';
  const selectedInHistory = history.some((entry) => entry.id === record?.id);

  async function importJSON(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || importing) return;
    selectionRevision.current += 1;
    setImportError('');
    if (!file.name.toLowerCase().endsWith('.json') || file.size > 5 * 1024 * 1024) {
      setImportError('Selecciona un archivo de resultados JSON de hasta 5 MB.');
      return;
    }
    const controller = new AbortController();
    importController.current = controller;
    setImporting(true);
    try {
      const imported = await api.importAnalysis(file, controller.signal);
      if (controller.signal.aborted) return;
      await Promise.all([loadAnalysis(imported.id), refreshHistory()]);
    } catch (error) {
      if (!controller.signal.aborted) setImportError(`Importación fallida: ${error.message}`);
    } finally {
      if (!controller.signal.aborted) setImporting(false);
    }
  }

  return <div className="min-h-screen bg-carbon-900 font-sans text-gray-200">
    <div className="fixed inset-0 -z-10 bg-grid"/>
    <header className="sticky top-0 z-30 border-b border-white/10 bg-[#080a0d]/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-4">
        <a href="/" className="flex items-center gap-3"><img src="/fut-ai-mark.png" alt="" className="h-9 w-auto"/><span className="font-display text-2xl font-bold text-white">FUT<span className="text-neon">.AI</span></span><span className="hidden rounded border border-neon/30 bg-neon/5 px-2 py-1 font-mono text-[10px] uppercase tracking-[.18em] text-neon sm:block">Vision Lab</span></a>
        <div className="flex items-center gap-3 text-xs"><span role="status" className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 ${statusColor}`}><span className="h-1.5 w-1.5 rounded-full bg-current"/>{statusText}</span><a href="/" className="rounded-lg border border-white/10 px-3 py-2 text-gray-300 hover:text-white">← Volver al sitio</a></div>
      </div>
    </header>
    <main className="mx-auto max-w-7xl space-y-6 px-5 pb-14 pt-9">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div><div className="font-mono text-[11px] uppercase tracking-[.28em] text-neon">Capstone · análisis experimental</div><h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-white md:text-5xl">Centro de análisis <span className="text-gradient">FUT.AI</span></h1><p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">Procesa videos de fútbol o consulta resultados existentes. Detección, seguimiento y métricas exploratorias, pendientes de validar contra mediciones reales.</p></div>
        <label className={`rounded-xl bg-neon px-5 py-3 text-sm font-bold text-carbon-900 transition ${importing || connection !== 'online' ? 'cursor-not-allowed opacity-40' : 'cursor-pointer hover:bg-[#33eb91]'}`}>{importing ? 'Importando…' : '↑ Importar resultados JSON'}<input type="file" accept=".json,application/json" className="sr-only" disabled={importing || connection !== 'online'} onChange={importJSON}/></label>
      </div>

      {analysis.healthError && <ErrorNotice retry={refreshHealth}>{analysis.healthError}</ErrorNotice>}
      {analysis.resultError && <ErrorNotice retry={() => loadAnalysis(record?.id ?? 'latest')}>{analysis.resultError}</ErrorNotice>}
      {analysis.historyError && <ErrorNotice retry={refreshHistory}>{analysis.historyError}</ErrorNotice>}
      {importError && <ErrorNotice>{importError}</ErrorNotice>}

      <div className="grid items-start gap-5 lg:grid-cols-2">
        <ProcessingPanel health={health} connection={connection} processing={processing} refreshHealth={refreshHealth} onViewResult={selectAnalysis}/>
        <AnalysisEvidence record={record} job={processing.job}/>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-wrap gap-2 font-mono text-[11px]"><span className="rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-3 py-2 text-yellow-200">PROVISIONAL · NO VALIDADO</span><span className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 uppercase text-gray-300">{originLabel(record?.origin)}</span><span className="max-w-full break-all rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-gray-400">{payload?.video || 'Esperando datos'}</span></div>
        <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
          <label htmlFor="analysis-history" className="text-xs text-gray-400">Historial</label>
          <select id="analysis-history" value={record?.id ?? ''} onChange={(event) => selectAnalysis(event.target.value)} disabled={!history.length || loading} className="min-w-0 flex-1 rounded-lg border border-white/20 bg-[#11151c] p-2 text-xs text-gray-200 disabled:opacity-50 sm:max-w-xs">
            {!record && <option value="">{loading ? 'Cargando…' : 'Sin resultados'}</option>}
            {record && !selectedInHistory && <option value={record.id}>#{record.id} · {record.result?.video || 'Análisis actual'}</option>}
            {history.map((entry) => <option key={entry.id} value={entry.id}>#{entry.id} · {entry.video} · {formatDate(entry.created_at)}</option>)}
          </select>
          <button type="button" onClick={refreshAnalysis} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-gray-400 hover:border-neon hover:text-neon">Actualizar</button>
        </div>
      </div>
      {analysis.empty && <p className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm leading-6 text-gray-400">La API está disponible y todavía no hay análisis guardados. Importa un JSON o procesa tu primer video.</p>}
      {meta.parcial && <p className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-4 text-sm leading-6 text-yellow-100">Análisis parcial: se procesó el tramo inicial del video hasta el límite configurado. Las métricas corresponden únicamente a ese tramo.</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Frames analizados" value={formatNumber(frames, 0)} helper={`${formatNumber(meta.fps, 1)} cuadros/segundo`}/>
        <Stat label="Cobertura geométrica" value={formatNumber(coverage)} suffix={coverage !== null ? '%' : ''} helper="Frames con homografía disponible"/>
        <Stat label="Observaciones tracking" value={formatNumber(meta.observaciones_tracking, 0)} helper="No equivale al número de jugadores"/>
        <Stat label="Tracks en tabla" value={record ? tracks.length : '—'} helper={record?.origin === 'MUESTRA_PARCIAL' ? 'Solo una muestra de resultados' : 'IDs del análisis seleccionado'}/>
      </div>

      <Panel title="Calidad del procesamiento" detail="Diagnóstico del análisis seleccionado">
        <div className="grid gap-6 md:grid-cols-2">
          <div><div className="mb-4 flex items-end justify-between gap-3"><span className="text-sm text-gray-400">Cobertura homográfica</span><span className="font-mono text-2xl font-bold text-neon">{formatNumber(coverage)}{coverage !== null ? '%' : ''}</span></div><div className="h-2.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-[#00b56b] to-neon" style={{ width: `${coverage ?? 0}%` }}/></div><p className="mt-3 text-xs leading-5 text-gray-500">Sin calibración válida, las distancias en metros y velocidades no están disponibles.</p></div>
          <div className="grid grid-cols-2 gap-3"><div className="rounded-xl border border-white/10 bg-white/[.025] p-4"><div className="text-xs text-gray-500">Frames calibrados</div><div className="mt-1 font-mono text-2xl text-white">{formatNumber(calibratedFrames, 0)}</div></div><div className="rounded-xl border border-white/10 bg-white/[.025] p-4"><div className="text-xs text-gray-500">Observaciones calibradas</div><div className="mt-1 font-mono text-2xl text-white">{formatNumber(meta.observaciones_en_cancha_y_calibradas, 0)}</div></div></div>
        </div>
        <div className="mt-5 rounded-xl border-l-2 border-yellow-500 bg-yellow-500/5 px-4 py-3 text-xs leading-6 text-yellow-100/90"><b>Limitaciones:</b> cambios de track ID, oclusiones y calibración manual. Una homografía fija requiere cámara inmóvil. Las métricas son estimaciones provisionales y no constituyen mediciones físicas certificadas.</div>
      </Panel>

      <TrackTable tracks={tracks} loading={loading}/>
      <div className="flex flex-wrap justify-between gap-2 border-t border-white/10 py-5 font-mono text-[10px] uppercase tracking-wider text-gray-500"><span>FUT.AI · Proyecto Capstone · Duoc UC</span><span>YOLO · ByteTrack · OpenCV · FastAPI · SQLite · React</span></div>
    </main>
  </div>;
}
