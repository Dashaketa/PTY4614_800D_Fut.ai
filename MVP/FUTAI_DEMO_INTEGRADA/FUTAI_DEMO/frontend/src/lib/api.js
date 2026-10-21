export const API_BASE = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '');

export class ApiError extends Error {
  constructor(message, status = 0) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request(path, { signal, timeoutMs = 20000, ...options } = {}) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  let timedOut = false;
  if (signal?.aborted) controller.abort();
  else signal?.addEventListener('abort', abort, { once: true });
  const timer = timeoutMs > 0 ? setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs) : null;

  try {
    const response = await fetch(`${API_BASE}${path}`, { ...options, signal: controller.signal });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      const detail = typeof body?.detail === 'string' ? body.detail : `El servidor respondió HTTP ${response.status}.`;
      throw new ApiError(detail, response.status);
    }
    if (body === null) throw new ApiError('El servidor devolvió una respuesta vacía o inválida.', response.status);
    return body;
  } catch (error) {
    if (timedOut && !signal?.aborted) throw new ApiError('El servidor tardó demasiado en responder. Puedes reintentar.');
    throw error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
  }
}

export const api = {
  health: (signal) => request('/api/health', { signal }),
  analyses: (signal) => request('/api/analyses', { signal }),
  analysis: (id = 'latest', signal) => request(`/api/analyses/${encodeURIComponent(id)}`, { signal }),
  importAnalysis: (file, signal) => {
    const form = new FormData();
    form.append('file', file);
    return request('/api/analyses/import', { method: 'POST', body: form, signal });
  },
  job: (id, signal) => request(`/api/jobs/${encodeURIComponent(id)}`, { signal }),
  jobs: (signal) => request('/api/jobs', { signal }),
  createJob: (file, calibration, signal, annotationStyle = 'ellipses') => {
    const form = new FormData();
    form.append('file', file);
    form.append('annotation_style', annotationStyle);
    if (calibration) form.append('calibration', JSON.stringify(calibration));
    return request('/api/jobs', { method: 'POST', body: form, signal, timeoutMs: 0 });
  },
};

// Artifacts always come from this backend, never from paths in an imported JSON.
export function artifactUrl(path) {
  return typeof path === 'string' && /^\/api\/jobs\/[^/]+\/artifacts\/(video|tracks|result)$/.test(path)
    ? `${API_BASE}${path}`
    : null;
}
