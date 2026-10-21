export function numericValue(value) {
  if (value === null || value === undefined || value === '' || typeof value === 'boolean') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function formatNumber(value, decimals = 1) {
  const number = numericValue(value);
  return number === null ? '—' : number.toLocaleString('es-CL', {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  });
}

export function sortTracks(tracks, field, descending = true) {
  return [...tracks].sort((a, b) => {
    const va = a[field], vb = b[field];
    // Unavailable physical measurements stay at the bottom in both directions.
    const missingA = va === null || va === undefined || va === '';
    const missingB = vb === null || vb === undefined || vb === '';
    if (missingA || missingB) return Number(missingA) - Number(missingB);
    const na = numericValue(va), nb = numericValue(vb);
    const result = na !== null && nb !== null ? na - nb : String(va).localeCompare(String(vb), 'es');
    return descending ? -result : result;
  });
}

export function originLabel(origin) {
  if (origin === 'MUESTRA_PARCIAL') return 'Muestra parcial';
  if (origin === 'IMPORTADO_COLAB') return 'Resultados importados';
  if (origin === 'PIPELINE_LOCAL') return 'Video procesado en FUT.AI';
  return origin || 'Sin resultados';
}

export function formatDate(value) {
  const date = new Date(value);
  return value && !Number.isNaN(date.getTime())
    ? date.toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' })
    : '';
}

export function validateCalibration(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('La calibración debe ser un objeto JSON.');
  if (value.mode !== 'static') throw new Error('Esta versión admite calibración de cámara fija (mode: "static").');
  const image = value.image_points;
  const field = value.field_points;
  const pair = (point) => Array.isArray(point) && point.length === 2 && point.every((n) => typeof n === 'number' && Number.isFinite(n));
  if (!Array.isArray(image) || image.length < 4 || !image.every(pair)
      || !Array.isArray(field) || field.length !== image.length || !field.every(pair)) {
    throw new Error('Incluye al menos cuatro puntos de imagen y el mismo número de puntos de cancha válidos.');
  }
  if (value.field_size !== undefined && (!pair(value.field_size) || value.field_size.some((n) => n <= 0))) throw new Error('field_size debe indicar largo y ancho de cancha positivos, en metros.');
  return value;
}
