"""Agregación incremental: conserva un estado pequeño por track, nunca frames."""
from __future__ import annotations

from dataclasses import dataclass
import math

from . import STATUS


@dataclass
class _Track:
    observations: int = 0
    last_frame: int = -2
    segments: int = 0
    calibrated_segments: int = 0
    last_point: tuple[float, float] | None = None
    last_time: float = 0
    distance: float = 0
    max_speed: float = 0
    valid_steps: int = 0
    rejected_steps: int = 0


class MetricsAccumulator:
    def __init__(self, fps: float, *, calibrated: bool, max_speed_kmh: float = 45):
        if not math.isfinite(fps) or fps <= 0:
            raise ValueError("FPS inválido para calcular métricas")
        self.fps = fps
        self.calibrated = calibrated
        self.max_speed_kmh = max_speed_kmh
        self.tracks: dict[int, _Track] = {}

    def observe(self, track_id: int, frame: int, point: tuple[float, float] | None) -> None:
        track = self.tracks.setdefault(track_id, _Track())
        if track.last_frame == frame:
            return  # Una observación por track/frame.
        contiguous = frame == track.last_frame + 1
        track.observations += 1
        if not contiguous:
            track.segments += 1
        timestamp = frame / self.fps
        if point is None:
            track.last_point = None
        elif not contiguous or track.last_point is None:
            track.calibrated_segments += 1
            track.last_point = point
        else:
            elapsed = timestamp - track.last_time
            distance = math.hypot(point[0] - track.last_point[0], point[1] - track.last_point[1])
            speed = distance / elapsed * 3.6 if elapsed > 0 else math.inf
            if math.isfinite(speed) and speed <= self.max_speed_kmh:
                track.distance += distance
                track.max_speed = max(track.max_speed, speed)
                track.valid_steps += 1
                track.last_point = point
            else:
                # Romper el tramo: el salto tampoco sirve de ancla al siguiente frame.
                track.rejected_steps += 1
                track.last_point = None
        track.last_time = timestamp
        track.last_frame = frame

    def results(self) -> list[dict]:
        rows = []
        for track_id, track in sorted(self.tracks.items()):
            has_meters = self.calibrated and track.valid_steps > 0
            rows.append({
                "track_id": track_id,
                "distancia_observada_m": round(track.distance, 3) if has_meters else None,
                "velocidad_maxima_estimada_kmh": round(track.max_speed, 3) if has_meters else None,
                "duracion_observada_s": round(track.observations / self.fps, 3),
                "numero_tramos": track.segments,
                "numero_tramos_calibrados": track.calibrated_segments,
                "pasos_descartados": track.rejected_steps,
                "revision_recomendada": "PRIORITARIA" if not has_meters or track.segments > 1 or track.rejected_steps else "NORMAL",
                "estado": STATUS,
            })
        return rows
