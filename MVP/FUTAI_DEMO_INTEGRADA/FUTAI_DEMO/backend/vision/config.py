"""Contrato de entrada del worker, validable sin dependencias de visión."""
from __future__ import annotations

from dataclasses import dataclass
import math
from pathlib import Path
import re
from typing import Any


def finite_number(value: Any, name: str, *, minimum: float = 0) -> float:
    if isinstance(value, bool) or not isinstance(value, (float, int)):
        raise ValueError(f"{name} debe ser un número")
    try:
        number = float(value)
    except OverflowError as exc:
        raise ValueError(f"{name} está fuera del rango numérico admitido") from exc
    if not math.isfinite(number) or number < minimum:
        raise ValueError(f"{name} debe ser finito y >= {minimum}")
    return number


def _points(value: Any, name: str) -> list[list[float]]:
    if not isinstance(value, list) or len(value) < 4 or len(value) > 100:
        raise ValueError(f"{name} requiere entre 4 y 100 puntos [x, y]")
    points = []
    for point in value:
        if not isinstance(point, (list, tuple)) or len(point) != 2:
            raise ValueError(f"Cada punto de {name} debe tener dos coordenadas")
        points.append([finite_number(point[0], name), finite_number(point[1], name)])
        if any(number > 10_000_000 for number in points[-1]):
            raise ValueError(f"{name} contiene coordenadas fuera del rango admitido")
    if len({tuple(point) for point in points}) != len(points):
        raise ValueError(f"{name} contiene puntos repetidos")
    # Debe existir un triángulo con área significativa; no exige ordenar el polígono.
    x0, y0 = points[0]
    area = max(abs((a[0] - x0) * (b[1] - y0) - (a[1] - y0) * (b[0] - x0))
               for a in points[1:] for b in points[1:])
    scale = max(max(abs(x - x0), abs(y - y0)) for x, y in points)
    if area <= max(1e-8, scale * scale * 1e-6):
        raise ValueError(f"{name} contiene puntos colineales o degenerados")
    return points


def validate_calibration(value: Any) -> dict | None:
    if value is None:
        return None
    if not isinstance(value, dict) or value.get("mode") != "static":
        raise ValueError("La calibración debe usar mode='static'; los videos con cámara móvil requieren recalibración externa")
    image = _points(value.get("image_points"), "image_points")
    field = _points(value.get("field_points"), "field_points")
    if len(image) != len(field):
        raise ValueError("image_points y field_points deben tener igual cantidad de correspondencias")
    size = value.get("field_size", [105, 68])
    if not isinstance(size, (list, tuple)) or len(size) != 2:
        raise ValueError("field_size debe ser [largo_m, ancho_m]")
    size = [finite_number(v, "field_size", minimum=0.01) for v in size]
    if any(dimension > 1000 for dimension in size):
        raise ValueError("field_size no puede superar 1000 metros por dimensión")
    if any(x > size[0] or y > size[1] for x, y in field):
        raise ValueError("field_points debe estar dentro de field_size")
    return {"mode": "static", "image_points": image, "field_points": field, "field_size": size}


@dataclass(frozen=True)
class WorkerConfig:
    input_path: Path
    output_dir: Path
    model_path: Path
    video_name: str
    device: str = "cpu"
    image_size: int = 640
    max_frames: int = 0
    max_seconds: float = 0
    confidence: float = 0.1
    max_speed_kmh: float = 45
    calibration: dict | None = None
    annotation_style: str = "ellipses"

    @classmethod
    def from_dict(cls, value: Any) -> "WorkerConfig":
        if not isinstance(value, dict):
            raise ValueError("request.json debe contener un objeto")
        paths = {}
        for key in ("input_path", "output_dir", "model_path"):
            raw = value.get(key)
            if not isinstance(raw, str) or not raw.strip():
                raise ValueError(f"Falta ruta {key}")
            path = Path(raw)
            if not path.is_absolute():
                raise ValueError(f"{key} debe ser una ruta absoluta")
            paths[key] = path.resolve()
        if not paths["input_path"].is_file():
            raise ValueError("No existe el video de entrada")
        if not paths["model_path"].is_file() or paths["model_path"].suffix.lower() != ".pt":
            raise ValueError("No existe un modelo local .pt; el worker no descarga pesos")
        if paths["input_path"].parent == paths["output_dir"]:
            raise ValueError("El video de entrada debe estar fuera de la carpeta de artefactos")
        image_size = finite_number(value.get("image_size", 640), "image_size", minimum=32)
        if not image_size.is_integer() or image_size > 2048 or image_size % 32:
            raise ValueError("image_size debe ser múltiplo de 32 entre 32 y 2048")
        max_frames = finite_number(value.get("max_frames", 0), "max_frames")
        if not max_frames.is_integer():
            raise ValueError("max_frames debe ser entero")
        confidence = finite_number(value.get("confidence", 0.1), "confidence", minimum=0.01)
        if confidence > 1:
            raise ValueError("confidence debe ser <= 1")
        speed = finite_number(value.get("max_speed_kmh", 45), "max_speed_kmh", minimum=1)
        if speed > 100:
            raise ValueError("max_speed_kmh debe ser <= 100")
        device = value.get("device", "cpu")
        annotation_style = value.get("annotation_style", "ellipses")
        if not isinstance(annotation_style, str) or annotation_style not in ("ellipses", "boxes"):
            raise ValueError("annotation_style debe ser ellipses o boxes")
        if not isinstance(device, str) or not re.fullmatch(r"cpu|mps|(?:cuda:)?[0-9]+", device):
            raise ValueError("device debe ser cpu, mps o un índice CUDA (por ejemplo 0)")
        return cls(**paths, video_name=str(value.get("video_name") or paths["input_path"].name),
                   device=device, image_size=int(image_size), max_frames=int(max_frames),
                   max_seconds=finite_number(value.get("max_seconds", 0), "max_seconds"),
                   confidence=confidence, max_speed_kmh=speed,
                   annotation_style=annotation_style,
                   calibration=validate_calibration(value.get("calibration")))
