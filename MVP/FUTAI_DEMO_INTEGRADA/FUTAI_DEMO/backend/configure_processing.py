"""Prepare an isolated/reused vision runtime and enable it in backend/.env."""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import venv
from pathlib import Path

from dotenv import set_key
from futai_api.config import ROOT, MVP, default_worker


def run(python, arguments, *, capture=False):
    (ROOT / "data" / "vision_cache" / "Ultralytics").mkdir(parents=True, exist_ok=True)
    (ROOT / "data" / "vision_cache" / "matplotlib").mkdir(parents=True, exist_ok=True)
    env = dict(os.environ, PYTHONUTF8="1", YOLO_AUTOINSTALL="false",
               YOLO_CONFIG_DIR=str(ROOT / "data" / "vision_cache"),
               MPLCONFIGDIR=str(ROOT / "data" / "vision_cache" / "matplotlib"))
    return subprocess.run([str(python), *arguments], cwd=ROOT, env=env, check=True,
                          capture_output=capture, text=True)


def missing(python, names):
    code = "import importlib.util,json; print(json.dumps([n for n in " + repr(names) + " if importlib.util.find_spec(n) is None]))"
    return json.loads(run(python, ["-c", code], capture=True).stdout.strip())


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--python", type=Path, help="Python de un entorno de visión existente")
    parser.add_argument("--model", type=Path, default=MVP / "Procesamiento" / "yolov8n.pt")
    args = parser.parse_args()
    model = args.model.resolve()
    if not model.is_file():
        raise SystemExit("No se encontraron los pesos locales. Usa --model RUTA/yolov8n.pt; no se descargan durante la demo.")
    candidate = args.python.resolve() if args.python else default_worker()
    # Never install the heavy dependencies into the API/global Python by accident.
    if args.python is None and candidate.resolve() == Path(sys.executable).resolve():
        directory = ROOT / ".venv-vision"
        if not directory.exists():
            print("Creando entorno de visión independiente...", flush=True)
            venv.EnvBuilder(with_pip=True).create(directory)
        candidate = directory / ("Scripts/python.exe" if os.name == "nt" else "bin/python")
    if not candidate.is_file():
        raise SystemExit("No se encontró el Python del motor: " + str(candidate))
    print("Entorno de visión:", candidate, flush=True)
    core = missing(candidate, ["cv2", "numpy", "torch", "ultralytics"])
    if core:
        print("Instalando dependencias de visión:", ", ".join(core), flush=True)
        run(candidate, ["-m", "pip", "install", "-r", str(ROOT / "requirements-vision.txt")])
    # Preserve the versions already used by the original experiments.
    extras = missing(candidate, ["lap", "imageio_ffmpeg"])
    requirements = {"lap": "lap>=0.5.12,<0.6", "imageio_ffmpeg": "imageio-ffmpeg>=0.5,<0.7"}
    if extras:
        run(candidate, ["-m", "pip", "install", *[requirements[name] for name in extras]])
    run(candidate, ["-c", "import cv2,numpy,torch,ultralytics,lap,imageio_ffmpeg; print('YOLO + ByteTrack + OpenCV + FFmpeg: OK')"])
    env_file = ROOT / ".env"
    if not env_file.exists():
        env_file.write_text((ROOT / ".env.example").read_text(encoding="utf-8"), encoding="utf-8")
    for key, value in {"FUTAI_WORKER_PYTHON": candidate.as_posix(), "FUTAI_MODEL_PATH": model.as_posix(),
                       "FUTAI_PROCESSING_ENABLED": "true"}.items():
        set_key(str(env_file), key, value, quote_mode="always")
    print("Procesamiento habilitado en backend/.env. Reinicia INICIAR_BACKEND.bat y abre /demo.")


if __name__ == "__main__":
    main()
