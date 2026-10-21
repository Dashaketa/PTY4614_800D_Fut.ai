import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';

const STORAGE_KEY = 'futai.lastProcessingJob';
const PENDING_KEY = 'futai.pendingVideoUpload';
const ACTIVE = new Set(['queued', 'running']);

function readSavedJob() {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value && /^[a-zA-Z0-9_-]{1,128}$/.test(value) ? value : null;
  } catch { return null; }
}

function rememberJob(id) {
  try {
    if (id) localStorage.setItem(STORAGE_KEY, id);
    else localStorage.removeItem(STORAGE_KEY);
  } catch { /* Storage can be blocked; processing still works in this tab. */ }
}

function readPending() {
  try {
    const value = JSON.parse(localStorage.getItem(PENDING_KEY));
    return typeof value?.filename === 'string' && Number.isFinite(value.startedAt)
      && Date.now() - value.startedAt < 24 * 60 * 60 * 1000 ? value : null;
  } catch { return null; }
}

function rememberPending(value) {
  try {
    if (value) localStorage.setItem(PENDING_KEY, JSON.stringify(value));
    else localStorage.removeItem(PENDING_KEY);
  } catch { /* Recovery is optional when storage is unavailable. */ }
}

export default function useProcessingJob(onCompleted) {
  const [jobId, setJobId] = useState(readSavedJob);
  const [job, setJob] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [restoring, setRestoring] = useState(() => Boolean(readSavedJob()));
  const [attempt, setAttempt] = useState(0);
  const [pendingUpload, setPendingUpload] = useState(readPending);
  const [recoveringUpload, setRecoveringUpload] = useState(false);
  const onCompletedRef = useRef(onCompleted);
  const submitController = useRef(null);
  const recoveryController = useRef(null);
  const posting = useRef(false);
  onCompletedRef.current = onCompleted;

  useEffect(() => {
    if (!jobId) return;
    let cancelled = false;
    let timer;
    const controller = new AbortController();

    async function poll() {
      try {
        const next = await api.job(jobId, controller.signal);
        if (cancelled) return;
        setJob(next);
        setRestoring(false);
        setError('');
        if (ACTIVE.has(next.status)) timer = setTimeout(poll, 1500);
        else if (next.status === 'completed' && next.analysis_id !== null && next.analysis_id !== undefined) {
          try {
            await onCompletedRef.current?.(next);
          } catch (failure) {
            if (!cancelled) setError(`El trabajo terminó, pero no se pudo abrir su resultado. ${failure.message}`);
          }
        }
      } catch (failure) {
        if (cancelled || controller.signal.aborted) return;
        setRestoring(false);
        setError(failure.status === 404
          ? 'El trabajo guardado ya no está disponible. Puedes iniciar otro análisis.'
          : `No se pudo consultar el trabajo. ${failure.message} Reintenta para recuperar su estado.`);
        if (failure.status === 404) {
          rememberJob(null);
          setJobId(null);
          setJob(null);
        }
      }
    }

    poll();
    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timer);
    };
  }, [jobId, attempt]);

  useEffect(() => () => {
    submitController.current?.abort();
    recoveryController.current?.abort();
  }, []);

  const submit = useCallback(async (file, calibration, annotationStyle = 'ellipses') => {
    if (posting.current) return null;
    posting.current = true;
    setSubmitting(true);
    setError('');
    const controller = new AbortController();
    submitController.current = controller;
    const pending = { filename: file.name.slice(0, 255), startedAt: Date.now() };
    rememberPending(pending);
    setPendingUpload(pending);
    try {
      const next = await api.createJob(file, calibration, controller.signal, annotationStyle);
      if (controller.signal.aborted) return null;
      rememberJob(next.id);
      setJob(next);
      setJobId(next.id);
      rememberPending(null);
      setPendingUpload(null);
      return next;
    } catch (failure) {
      if (!controller.signal.aborted) {
        setError(`No se pudo confirmar el envío del video. ${failure.message}`);
        if (failure.status >= 400 && failure.status < 500) {
          rememberPending(null);
          setPendingUpload(null);
        }
      }
      return null;
    } finally {
      posting.current = false;
      if (!controller.signal.aborted) setSubmitting(false);
    }
  }, []);

  const recoverUpload = useCallback(async () => {
    if (!pendingUpload || recoveringUpload) return;
    recoveryController.current?.abort();
    const controller = new AbortController();
    recoveryController.current = controller;
    setRecoveringUpload(true);
    try {
      const jobs = await api.jobs(controller.signal);
      if (controller.signal.aborted) return;
      const matches = jobs.filter((candidate) => candidate.filename === pendingUpload.filename
        && Date.parse(candidate.created_at) >= pendingUpload.startedAt - 5000);
      if (matches.length !== 1) {
        setError(matches.length ? 'Hay varios envíos con ese nombre. Consulta el historial antes de volver a enviar.'
          : 'Aún no se encuentra ese envío en el servidor. Puedes buscarlo otra vez o volver a enviar el video.');
        return;
      }
      const found = matches[0];
      rememberJob(found.id);
      rememberPending(null);
      setPendingUpload(null);
      setJob(found);
      setJobId(found.id);
      setError('');
      setAttempt((value) => value + 1);
    } catch (failure) {
      if (!controller.signal.aborted) setError(`No se pudo buscar el envío. ${failure.message}`);
    } finally {
      if (!controller.signal.aborted) setRecoveringUpload(false);
    }
  }, [pendingUpload, recoveringUpload]);

  const retry = useCallback(() => {
    setError('');
    if (jobId) {
      setRestoring(true);
      setAttempt((value) => value + 1);
    }
  }, [jobId]);

  return {
    job, error, submitting, restoring, submit, retry, pendingUpload, recoveringUpload, recoverUpload,
    busy: submitting || restoring || recoveringUpload || ACTIVE.has(job?.status),
    canRetry: Boolean(jobId && error),
  };
}
