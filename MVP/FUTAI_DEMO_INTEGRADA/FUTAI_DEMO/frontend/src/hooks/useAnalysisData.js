import { useCallback, useEffect, useRef, useState } from 'react';
import { api, API_BASE } from '../lib/api';

export default function useAnalysisData() {
  const [health, setHealth] = useState(null);
  const [connection, setConnection] = useState('checking');
  const [healthError, setHealthError] = useState('');
  const [record, setRecord] = useState(null);
  const [history, setHistory] = useState([]);
  const [resultError, setResultError] = useState('');
  const [historyError, setHistoryError] = useState('');
  const [empty, setEmpty] = useState(false);
  const [loading, setLoading] = useState(true);
  const controllers = useRef({});
  const currentRecord = useRef(null);

  const controllerFor = useCallback((key) => {
    controllers.current[key]?.abort();
    const controller = new AbortController();
    controllers.current[key] = controller;
    return controller;
  }, []);

  const refreshHealth = useCallback(async () => {
    const controller = controllerFor('health');
    try {
      const data = await api.health(controller.signal);
      if (controller.signal.aborted) return;
      setHealth(data);
      setConnection('online');
      setHealthError('');
    } catch (error) {
      if (controller.signal.aborted) return;
      setHealth(null);
      setConnection('offline');
      setHealthError(`No se pudo conectar con la API (${API_BASE}). ${error.message || 'Revisa que el backend esté iniciado.'}`);
    }
  }, [controllerFor]);

  const refreshHistory = useCallback(async () => {
    const controller = controllerFor('history');
    try {
      const data = await api.analyses(controller.signal);
      if (controller.signal.aborted) return;
      setHistory(Array.isArray(data) ? data : []);
      setHistoryError('');
    } catch (error) {
      if (!controller.signal.aborted) setHistoryError(`No se pudo actualizar el historial. ${error.message}`);
    }
  }, [controllerFor]);

  const loadAnalysis = useCallback(async (id = 'latest') => {
    const controller = controllerFor('analysis');
    setLoading(true);
    setResultError('');
    try {
      const data = await api.analysis(id, controller.signal);
      if (controller.signal.aborted) return null;
      currentRecord.current = data.id;
      setRecord(data);
      setEmpty(false);
      return data;
    } catch (error) {
      if (controller.signal.aborted) return null;
      if (error.status === 404 && id === 'latest') {
        currentRecord.current = null;
        setRecord(null);
        setEmpty(true);
      } else {
        setResultError(`No se pudo cargar el análisis${id === 'latest' ? '' : ` #${id}`}. ${error.message}`);
      }
      return null;
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [controllerFor]);

  const refresh = useCallback(() => Promise.all([
    refreshHealth(), refreshHistory(), loadAnalysis(currentRecord.current ?? 'latest'),
  ]), [refreshHealth, refreshHistory, loadAnalysis]);

  useEffect(() => {
    refresh();
    return () => Object.values(controllers.current).forEach((controller) => controller.abort());
  }, [refresh]);

  return {
    health, connection, healthError, record, history, resultError, historyError,
    empty, loading, refresh, refreshHealth, refreshHistory, loadAnalysis,
  };
}
