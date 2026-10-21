"""Stdlib subprocess fixture implementing the worker's on-disk contract.

Successful by default; input bytes containing ``fail`` simulate an engine error,
``invalid-result`` produces invalid output, and ``hold`` waits for release.flag.
The fixture deliberately writes output before completion to exercise publication.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
import time


def write_json(path, value):
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(value), encoding="utf-8")
    temporary.replace(path)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--request", required=True, type=Path)
    args = parser.parse_args()
    request = json.loads(args.request.read_text(encoding="utf-8"))
    output = Path(request["output_dir"])
    output.mkdir(parents=True, exist_ok=True)
    marker = Path(request["input_path"]).read_bytes().lower()
    result = {
        "video": request["video_name"],
        "procesamiento": {"frames": 12, "fps": 25, "estado": "VALIDADO"},
        "metricas_por_track": [{
            "track_id": 42, "distancia_observada_m": None,
            "velocidad_maxima_estimada_kmh": None, "duracion_observada_s": 0.48,
            "numero_tramos": 1, "estado": "VALIDADO",
        }],
    }
    write_json(output / "result.json", {} if b"invalid-result" in marker else result)
    (output / "video.mp4").write_bytes(b"\x00\x00\x00\x18ftypisom-fixture-output")
    (output / "tracks.csv").write_text("frame,time_s,track_id,x1,y1,x2,y2,confidence\n0,0,42,0,0,10,20,0.9\n", encoding="utf-8")
    write_json(output / "progress.json", {"progress": 60, "stage": "tracking", "message": "Fixture en proceso"})
    if b"hold" in marker:
        deadline = time.monotonic() + 15
        while not (output.parent / "release.flag").exists():
            if time.monotonic() > deadline:
                write_json(output / "error.json", {"error": "Fixture release timed out"})
                return 1
            time.sleep(0.03)
    if b"fail" in marker:
        write_json(output / "error.json", {"error": "Fallo controlado del motor de prueba"})
        return 1
    write_json(output / "progress.json", {"progress": 100, "stage": "completed", "message": "Fixture completada"})
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
