"""End-to-end smoke check using real local YOLO, with temporary storage."""
from __future__ import annotations

import argparse
import csv
from dataclasses import replace
import io
from pathlib import Path
import subprocess
from tempfile import TemporaryDirectory
import time

from fastapi.testclient import TestClient

from app import create_app
from futai_api.config import ROOT, Settings


def run_job(client: TestClient, video: Path, settings: Settings, annotation_style: str,
            preview_dir: Path | None = None):
    before_response = client.get("/api/analyses/latest")
    before_response.raise_for_status()
    before = before_response.json()["id"]
    with video.open("rb") as source:
        response = client.post(
            "/api/jobs",
            files={"file": (video.name, source, "video/mp4")},
            data={"annotation_style": annotation_style},
        )
    response.raise_for_status()
    job = response.json()
    print(f"Trabajo real ({annotation_style}): {job['id']}", flush=True)
    deadline = time.monotonic() + settings.worker_timeout_seconds + 15
    previous = None
    while job["status"] in ("queued", "running"):
        state = (job["status"], job["stage"], job["progress"])
        if state != previous:
            print(f"{annotation_style}: {state[0]} · {state[1]} · {state[2]}%", flush=True)
            previous = state
        if time.monotonic() >= deadline:
            raise TimeoutError("La comprobación excedió el tiempo esperado")
        time.sleep(0.5)
        response = client.get(f"/api/jobs/{job['id']}")
        response.raise_for_status()
        job = response.json()
    if job["status"] != "completed":
        log_file = settings.data_dir / "jobs" / job["id"] / "worker.log"
        log = log_file.read_text(encoding="utf-8", errors="replace")[-6000:] if log_file.is_file() else ""
        raise RuntimeError(str(job.get("error")) + "\n" + log)
    response = client.get(f"/api/analyses/{job['analysis_id']}")
    response.raise_for_status()
    record = response.json()
    assert record["id"] != before and record["job_id"] == job["id"]
    assert record["origin"] == "PIPELINE_LOCAL"
    meta = record["result"]["procesamiento"]
    assert meta["annotation_style"] == annotation_style, "El worker no conservó el estilo solicitado"
    assert 0 < meta["frames"] <= settings.max_frames
    assert meta["observaciones_tracking"] > 0, "El clip elegido no produjo detecciones: usar un clip de fútbol conocido"
    assert all(row["distancia_observada_m"] is None and row["velocidad_maxima_estimada_kmh"] is None
               for row in record["result"]["metricas_por_track"])
    assert set(record["artifacts"]) == {"video", "tracks", "result"}
    tracks = None
    for kind, url in record["artifacts"].items():
        artifact = client.get(url)
        assert artifact.status_code == 200, f"{annotation_style}: descarga {kind}: HTTP {artifact.status_code}"
        assert artifact.content, kind
        if kind == "tracks":
            tracks = artifact.content
            columns = csv.DictReader(io.StringIO(artifact.text)).fieldnames
            assert columns is not None
            assert all(field in columns for field in ("tiempo_s", "x1", "y1", "x2", "y2", "confidence"))
        if kind == "video":
            partial = client.get(url, headers={"Range": "bytes=0-31"})
            assert partial.status_code == 206 and len(partial.content) == 32
    assert tracks is not None
    if preview_dir is not None:
        preview = preview_dir / f"{annotation_style}.png"
        preview_script = """
import cv2
from pathlib import Path
import sys

capture = cv2.VideoCapture(sys.argv[1])
try:
    ok, frame = capture.read()
    if not ok:
        raise RuntimeError("No se pudo decodificar el primer frame del video anotado")
    target = Path(sys.argv[2])
    target.parent.mkdir(parents=True, exist_ok=True)
    if not cv2.imwrite(str(target), frame):
        raise RuntimeError("No se pudo guardar la vista previa PNG")
finally:
    capture.release()
"""
        generated = subprocess.run(
            [str(settings.worker_python), "-c", preview_script,
             str(settings.data_dir / "jobs" / job["id"] / "output" / "video.mp4"), str(preview)],
            capture_output=True, text=True, timeout=30,
        )
        if generated.returncode:
            raise RuntimeError("Falló la vista previa de " + annotation_style + ":\n" + generated.stderr[-3000:])
        print(f"Vista previa ({annotation_style}): {preview}", flush=True)
    print(f"OK ({annotation_style}): {meta['frames']} frames reales, {meta['observaciones_tracking']} observaciones, "
          f"{len(record['result']['metricas_por_track'])} tracks, codec={meta['video_codec']}, "
          f"browser={meta['video_browser_compatible']}; análisis y 3 descargas verificados.", flush=True)
    return record["result"], tracks


def compare_styles(ellipses, boxes):
    ellipses_result, ellipses_tracks = ellipses
    boxes_result, boxes_tracks = boxes
    assert ellipses_tracks == boxes_tracks, "El estilo de anotación modificó los bytes del CSV"
    assert ellipses_result["metricas_por_track"] == boxes_result["metricas_por_track"], "El estilo modificó las métricas"
    ellipses_meta = {key: value for key, value in ellipses_result["procesamiento"].items() if key != "annotation_style"}
    boxes_meta = {key: value for key, value in boxes_result["procesamiento"].items() if key != "annotation_style"}
    assert ellipses_meta == boxes_meta, "El estilo modificó metadatos de procesamiento"
    if "advertencias" in ellipses_result or "advertencias" in boxes_result:
        assert ellipses_result.get("advertencias") == boxes_result.get("advertencias"), "El estilo modificó advertencias"
    print("OK: elipses y cajas conservan CSV idéntico, métricas, procesamiento y advertencias.", flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--video", type=Path, required=True)
    parser.add_argument("--frames", type=int, default=10)
    parser.add_argument("--annotation-style", choices=("ellipses", "boxes"), default="ellipses")
    parser.add_argument("--compare-styles", action="store_true",
                        help="Procesa el mismo clip con ambos estilos y compara CSV y métricas")
    parser.add_argument("--preview-dir", type=Path,
                        help="Guarda el primer frame de cada video anotado como PNG en este directorio")
    args = parser.parse_args()
    if args.frames <= 0:
        parser.error("--frames debe ser mayor que cero")
    video = args.video if args.video.is_absolute() else ROOT / args.video
    video = video.resolve()
    if not video.is_file():
        parser.error("No existe el video: " + str(video))
    styles = [args.annotation_style]
    if args.compare_styles:
        styles.append("boxes" if args.annotation_style == "ellipses" else "ellipses")
    preview_dir = args.preview_dir.resolve() if args.preview_dir is not None else None
    with TemporaryDirectory(prefix="futai-real-smoke-") as temporary:
        settings = replace(Settings.from_env(), data_dir=Path(temporary), processing_enabled=True, max_frames=args.frames)
        with TestClient(create_app(settings)) as client:
            response = client.get("/api/health")
            response.raise_for_status()
            ready = response.json()["processing"]
            if not ready["ready"]:
                raise RuntimeError(ready["reason"])
            results = {style: run_job(client, video, settings, style, preview_dir) for style in styles}
            if args.compare_styles:
                compare_styles(results["ellipses"], results["boxes"])


if __name__ == "__main__":
    main()
