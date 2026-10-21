"""Proceso aislado YOLO + ByteTrack + OpenCV: python -m vision.worker --request ..."""
from __future__ import annotations

import argparse
import csv
import json
import math
import os
from pathlib import Path
import shutil
import subprocess
import sys
import time

from . import STATUS
from .config import WorkerConfig
from .metrics import MetricsAccumulator
from .annotations import VideoAnnotator

CSV_FIELDS = ("frame", "tiempo_s", "track_id", "class_id", "x1", "y1", "x2", "y2",
              "confidence", "x_pixel", "y_pixel", "x_metro", "y_metro")


def atomic_json(path: Path, value: dict) -> None:
    temporary = path.with_name(path.name + ".tmp")
    temporary.write_text(json.dumps(value, ensure_ascii=False, allow_nan=False), encoding="utf-8")
    # Windows may briefly deny replacement while the API reads progress.json.
    for attempt in range(6):
        try:
            os.replace(temporary, path)
            return
        except PermissionError:
            if attempt == 5:
                raise
            time.sleep(0.01 * (attempt + 1))


def progress(output: Path, percent: float, stage: str, message: str,
             processed: int = 0, total: int = 0) -> None:
    atomic_json(output / "progress.json", {
        "progress": round(max(0, min(100, percent)), 1), "stage": stage, "message": message,
        "processed_frames": processed, "total_frames": total,
    })


class Calibration:
    def __init__(self, config: dict, cv2, np, width: int, height: int):
        self.cv2, self.np = cv2, np
        source = np.asarray(config["image_points"], dtype=np.float64)
        destination = np.asarray(config["field_points"], dtype=np.float64)
        if np.any(source[:, 0] >= width) or np.any(source[:, 1] >= height):
            raise ValueError("image_points contiene coordenadas fuera del tamaño del video")
        matrix, inliers = cv2.findHomography(source, destination, cv2.RANSAC, 0.5)
        if (matrix is None or inliers is None or int(inliers.sum()) < 4
                or not np.isfinite(matrix).all() or np.linalg.cond(matrix) > 1e12):
            raise ValueError("No se puede calcular una homografía estable con esos puntos")
        projected = cv2.perspectiveTransform(source.reshape(-1, 1, 2), matrix).reshape(-1, 2)
        errors = np.linalg.norm(projected - destination, axis=1)
        if not np.isfinite(errors).all() or float(errors.max()) > 1:
            raise ValueError("Calibración inconsistente: error de reproyección mayor a 1 metro")
        self.matrix = matrix
        self.field_size = config["field_size"]

    def project(self, x: float, y: float) -> tuple[float, float] | None:
        source = self.np.asarray([[[x, y]]], dtype=self.np.float64)
        denominator = self.matrix[2, 0] * x + self.matrix[2, 1] * y + self.matrix[2, 2]
        if abs(float(denominator)) < 1e-9:
            return None
        point = self.cv2.perspectiveTransform(source, self.matrix)[0, 0]
        x_m, y_m = float(point[0]), float(point[1])
        if not math.isfinite(x_m) or not math.isfinite(y_m):
            return None
        if not (0 <= x_m <= self.field_size[0] and 0 <= y_m <= self.field_size[1]):
            return None
        return x_m, y_m


def _ffmpeg_path() -> str | None:
    executable = shutil.which("ffmpeg")
    if executable:
        return executable
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except (ImportError, RuntimeError, OSError):
        return None


def finish_video(source: Path, destination: Path, warnings: list[str]) -> tuple[str, bool]:
    executable = _ffmpeg_path()
    if executable:
        candidate = destination.with_name("video.h264.mp4")
        try:
            completed = subprocess.run(
                [executable, "-y", "-nostdin", "-hide_banner", "-loglevel", "error",
                 "-i", str(source), "-an", "-vf", "pad=ceil(iw/2)*2:ceil(ih/2)*2",
                 "-c:v", "libx264", "-preset", "veryfast", "-crf", "23",
                 "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(candidate)],
                stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE,
                text=True, encoding="utf-8", errors="replace", timeout=600,
                creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
            )
            if completed.returncode == 0 and candidate.is_file() and candidate.stat().st_size > 0:
                os.replace(candidate, destination)
                source.unlink(missing_ok=True)
                return "h264", True
            warnings.append("FFmpeg no pudo generar H.264; se conserva MPEG-4 Part 2 para descargar.")
        except (OSError, subprocess.TimeoutExpired):
            warnings.append("No fue posible ejecutar FFmpeg; se conserva MPEG-4 Part 2 para descargar.")
        finally:
            candidate.unlink(missing_ok=True)
    else:
        warnings.append("FFmpeg no está instalado: video MPEG-4 Part 2 disponible para descargar, sin reproducción web garantizada.")
    os.replace(source, destination)
    return "mp4v", False


def run(config: WorkerConfig) -> dict:
    output = config.output_dir
    output.mkdir(parents=True, exist_ok=True)
    progress(output, 1, "loading", "Cargando dependencias y modelo local")
    # Evitar instalaciones automáticas y escrituras de configuración en el perfil del usuario.
    os.environ["YOLO_AUTOINSTALL"] = "false"
    os.environ["YOLO_OFFLINE"] = "true"
    os.environ["YOLO_CONFIG_DIR"] = str(output / ".ultralytics")
    (output / ".ultralytics" / "Ultralytics").mkdir(parents=True, exist_ok=True)
    try:
        import cv2
        import numpy as np
        from ultralytics import YOLO
    except ImportError as exc:
        raise RuntimeError("Faltan dependencias de visión. Instala requirements-vision.txt en el entorno del worker.") from exc

    capture = None
    writer = None
    temporary_video = output / "video.source.mp4"
    warnings = ["Los IDs representan tracks, no la identidad permanente de un futbolista.",
                "Métricas exploratorias sin validación deportiva; el video anotado no incluye audio."]
    processed = observations = calibrated_observations = 0
    last_progress = 0.0
    try:
        capture = cv2.VideoCapture(str(config.input_path))
        if not capture.isOpened():
            raise ValueError("OpenCV no pudo abrir el video de entrada")
        fps = float(capture.get(cv2.CAP_PROP_FPS))
        if not math.isfinite(fps) or not (0.1 <= fps <= 240):
            raise ValueError("El video no tiene FPS válido (se requiere entre 0.1 y 240); no se inventa una frecuencia")
        raw_total = float(capture.get(cv2.CAP_PROP_FRAME_COUNT))
        reported_total = int(raw_total) if math.isfinite(raw_total) and raw_total > 0 else 0
        limits = [limit for limit in (config.max_frames, math.ceil(config.max_seconds * fps)) if limit > 0]
        frame_limit = min(limits) if limits else 0
        total = min(reported_total, frame_limit) if reported_total and frame_limit else (reported_total or frame_limit)
        ok, frame = capture.read()
        if not ok or frame is None:
            raise ValueError("El video no contiene frames decodificables")
        height, width = frame.shape[:2]
        if width < 2 or height < 2:
            raise ValueError("Dimensiones de video inválidas")
        calibration = Calibration(config.calibration, cv2, np, width, height) if config.calibration else None
        if calibration:
            warnings.append("Calibración estática: solo es válida con cámara fija, sin zoom, cortes ni desplazamientos. Recalibrar externamente si cambia la vista.")
        else:
            warnings.append("Sin calibración: distancias y velocidades en metros quedan vacías; no se convierten píxeles a metros.")
        model = YOLO(str(config.model_path), task="detect")
        writer = cv2.VideoWriter(str(temporary_video), cv2.VideoWriter_fourcc(*"mp4v"), fps, (width, height))
        if not writer.isOpened():
            raise RuntimeError("OpenCV no pudo crear el video anotado (codec mp4v)")
        accumulator = MetricsAccumulator(fps, calibrated=calibration is not None, max_speed_kmh=config.max_speed_kmh)
        annotator = VideoAnnotator(config.annotation_style, cv2, np)
        with (output / "tracks.csv").open("w", newline="", encoding="utf-8") as csv_file:
            csv_writer = csv.DictWriter(csv_file, fieldnames=CSV_FIELDS)
            csv_writer.writeheader()
            while ok and frame is not None and (not frame_limit or processed < frame_limit):
                if frame.shape[:2] != (height, width):
                    raise ValueError("El video cambia de resolución durante el procesamiento")
                results = model.track(source=frame, persist=True, tracker="bytetrack.yaml", classes=[0],
                                      conf=config.confidence, imgsz=config.image_size, device=config.device,
                                      verbose=False, save=False)
                seen = set()
                annotations = []
                if results:
                    boxes = results[0].boxes
                    if boxes is not None and boxes.id is not None:
                        coordinates = boxes.xyxy.detach().cpu().tolist()
                        ids = boxes.id.detach().cpu().tolist()
                        confidences = boxes.conf.detach().cpu().tolist()
                        classes = boxes.cls.detach().cpu().tolist()
                        for box, raw_id, confidence, class_id in zip(coordinates, ids, confidences, classes):
                            if not all(math.isfinite(float(v)) for v in (*box, raw_id, confidence, class_id)):
                                continue
                            track_id = int(raw_id)
                            if track_id in seen:
                                continue
                            seen.add(track_id)
                            x1, y1, x2, y2 = map(float, box)
                            x1, x2 = max(0, min(width - 1, x1)), max(0, min(width - 1, x2))
                            y1, y2 = max(0, min(height - 1, y1)), max(0, min(height - 1, y2))
                            if x2 <= x1 or y2 <= y1:
                                continue
                            x_pixel, y_pixel = (x1 + x2) / 2, y2
                            meters = calibration.project(x_pixel, y_pixel) if calibration else None
                            accumulator.observe(track_id, processed, meters)
                            observations += 1
                            calibrated_observations += int(meters is not None)
                            csv_writer.writerow(dict(zip(CSV_FIELDS, (
                                processed, round(processed / fps, 6), track_id, int(class_id),
                                *[round(v, 3) for v in (x1, y1, x2, y2)], round(float(confidence), 6),
                                round(x_pixel, 3), round(y_pixel, 3),
                                round(meters[0], 6) if meters else "", round(meters[1], 6) if meters else "",
                            ))))
                            annotations.append(((x1, y1, x2, y2), track_id))
                writer.write(annotator.annotate(frame, annotations))
                processed += 1
                now = time.monotonic()
                if now - last_progress >= 0.5 or processed == total:
                    fraction = min(1, processed / total) if total else 0
                    progress(output, 5 + 88 * fraction, "tracking", "Detectando personas y siguiendo tracks",
                             processed, total)
                    csv_file.flush()
                    last_progress = now
                if frame_limit and processed >= frame_limit:
                    break
                ok, frame = capture.read()
        writer.release()
        writer = None
        capture.release()
        capture = None
        if not temporary_video.is_file() or temporary_video.stat().st_size == 0:
            raise RuntimeError("El codificador no produjo un video válido")
        if reported_total and processed + 2 < reported_total and (not frame_limit or processed < frame_limit):
            warnings.append("El decodificador terminó antes del número de frames declarado; revisar integridad del video de entrada.")
        limited = bool(frame_limit and processed >= frame_limit and (not reported_total or frame_limit < reported_total))
        if limited:
            warnings.append("Análisis parcial: se alcanzó el límite configurado de frames o duración.")
        rows = accumulator.results()
        if any(row["pasos_descartados"] for row in rows):
            warnings.append(f"Se descartaron saltos que superan {config.max_speed_kmh:g} km/h; las distancias solo suman pasos contiguos aceptados.")
        if not observations:
            warnings.append("No se obtuvieron tracks de personas; esto es un resultado vacío válido, no evidencia de ausencia de jugadores.")
        progress(output, 95, "encoding", "Preparando video anotado para el navegador", processed, total)
        codec, compatible = finish_video(temporary_video, output / "video.mp4", warnings)
        result = {
            "video": config.video_name,
            "procesamiento": {
                "tipo": "yolo_bytetrack_opencv", "frames": processed, "fps": fps,
                "cobertura_homografia_pct": 100.0 if calibration else 0.0,
                "observaciones_tracking": observations,
                "observaciones_en_cancha_y_calibradas": calibrated_observations,
                "estado": STATUS, "calibracion": "static" if calibration else "none",
                "parcial": limited, "video_codec": codec, "video_browser_compatible": compatible,
                "tracker": "bytetrack.yaml", "modelo": config.model_path.name,
                "confidence": config.confidence, "image_size": config.image_size,
                "annotation_style": config.annotation_style,
            },
            "metricas_por_track": rows, "advertencias": warnings,
        }
        atomic_json(output / "result.json", result)
        progress(output, 100, "completed", "Procesamiento finalizado", processed, total)
        return result
    finally:
        if capture is not None:
            capture.release()
        if writer is not None:
            writer.release()


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--request", required=True, type=Path)
    args = parser.parse_args(argv)
    output = None
    try:
        request = json.loads(args.request.read_text(encoding="utf-8"))
        # Permite comunicar errores de validación al coordinador sin importar el motor pesado.
        if isinstance(request, dict) and isinstance(request.get("output_dir"), str):
            candidate = Path(request["output_dir"])
            if candidate.is_absolute():
                output = candidate.resolve()
                output.mkdir(parents=True, exist_ok=True)
                for name in ("result.json", "error.json"):
                    (output / name).unlink(missing_ok=True)
        config = WorkerConfig.from_dict(request)
        output = config.output_dir
        run(config)
        return 0
    except Exception as exc:
        message = str(exc) or type(exc).__name__
        if output:
            (output / "result.json").unlink(missing_ok=True)
            atomic_json(output / "error.json", {"error": message})
            progress(output, 0, "failed", message)
        print(f"FUT.AI worker: {message}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
