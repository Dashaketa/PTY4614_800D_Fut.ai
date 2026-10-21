"""Contracts shared by imported results and completed local analyses."""
from __future__ import annotations

import json
import math
from typing import Any

from fastapi import HTTPException

PROVISIONAL = "PROVISIONAL_NO_VALIDADO"
MAX_JSON_SIZE = 5 * 1024 * 1024


def _finite_tree(value: Any):
    if isinstance(value, float) and not math.isfinite(value):
        raise HTTPException(422, "El JSON contiene números no finitos")
    if isinstance(value, dict):
        for child in value.values():
            _finite_tree(child)
    elif isinstance(value, list):
        for child in value:
            _finite_tree(child)


def validate_result(payload: Any) -> dict:
    if not isinstance(payload, dict):
        raise HTTPException(422, "Se esperaba un objeto JSON")
    if not isinstance(payload.get("procesamiento"), dict):
        raise HTTPException(422, "Falta objeto 'procesamiento'")
    if not isinstance(payload.get("metricas_por_track"), list):
        raise HTTPException(422, "Falta lista 'metricas_por_track'")
    if payload.get("video") is not None and not isinstance(payload["video"], str):
        raise HTTPException(422, "video debe ser texto")
    _finite_tree(payload)
    meta = dict(payload["procesamiento"])
    for key in ("frames", "fps", "cobertura_homografia_pct", "observaciones_tracking", "observaciones_en_cancha_y_calibradas"):
        if meta.get(key) is not None:
            try:
                if isinstance(meta[key], bool):
                    raise ValueError()
                value = float(meta[key])
                if not math.isfinite(value) or value < 0:
                    raise ValueError()
            except (ValueError, TypeError, OverflowError) as exc:
                raise HTTPException(422, f"procesamiento.{key} debe ser numérico o null") from exc
            meta[key] = value
    rows = []
    numeric = ("distancia_observada_m", "velocidad_maxima_estimada_kmh", "duracion_observada_s", "numero_tramos")
    for row in payload["metricas_por_track"]:
        if not isinstance(row, dict):
            raise HTTPException(422, "Cada trayectoria debe ser un objeto JSON")
        # Preserve optional fields and nulls while preventing ambiguous table sorting.
        item = dict(row)
        if type(item.get("track_id")) not in (int, str) or (isinstance(item["track_id"], str) and len(item["track_id"]) > 128):
            raise HTTPException(422, "Cada trayectoria debe contener un track_id entero o texto")
        if isinstance(item["track_id"], int) and not 0 <= item["track_id"] <= 2**53 - 1:
            raise HTTPException(422, "track_id está fuera del rango entero admitido")
        if item.get("revision_recomendada") is not None and not isinstance(item["revision_recomendada"], str):
            raise HTTPException(422, "revision_recomendada debe ser texto")
        for key in numeric:
            if item.get(key) is not None:
                if isinstance(item[key], bool):
                    raise HTTPException(422, f"{key} debe ser numérico o null")
                try:
                    item[key] = float(item[key])
                except (ValueError, TypeError, OverflowError) as exc:
                    raise HTTPException(422, f"{key} debe ser numérico o null") from exc
                if not math.isfinite(item[key]) or item[key] < 0:
                    raise HTTPException(422, f"{key} debe ser un número finito no negativo")
        item["estado"] = PROVISIONAL
        rows.append(item)
    return {**payload, "procesamiento": {**meta, "estado": PROVISIONAL}, "metricas_por_track": rows}


def parse_calibration(raw: str | None) -> dict | None:
    if not raw or not raw.strip():
        return None
    if len(raw) > 64 * 1024:
        raise HTTPException(422, "Calibración demasiado grande")
    try:
        cal = json.loads(raw)
        _finite_tree(cal)
        # This module uses only the standard library; OpenCV/Torch stay isolated.
        from vision.config import validate_calibration
        return validate_calibration(cal)
    except (ValueError, RecursionError) as exc:
        raise HTTPException(422, str(exc) or "Calibración JSON inválida") from exc
