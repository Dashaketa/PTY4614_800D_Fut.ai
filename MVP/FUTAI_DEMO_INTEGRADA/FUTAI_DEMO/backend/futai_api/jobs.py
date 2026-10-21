"""A bounded, persistent local queue; vision always runs in a child process."""
from __future__ import annotations

import json
import logging
import math
import os
import signal
import subprocess
import threading
import time
from pathlib import Path

from .config import ROOT, Settings
from .schemas import MAX_JSON_SIZE, validate_result
from .storage import Store

logger = logging.getLogger(__name__)
ARTIFACTS = {"video": "video.mp4", "tracks": "tracks.csv", "result": "result.json"}


class RunnerLock:
    """Prevent reloads/multiple API processes from owning the same local queue."""
    def __init__(self, path: Path):
        self.path = path
        self.file = None

    def acquire(self):
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.file = self.path.open("a+b")
        self.file.seek(0, 2)
        if self.file.tell() == 0:
            self.file.write(b"0")
            self.file.flush()
        self.file.seek(0)
        try:
            if os.name == "nt":
                import msvcrt
                msvcrt.locking(self.file.fileno(), msvcrt.LK_NBLCK, 1)
            else:
                import fcntl
                fcntl.flock(self.file.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
        except OSError:
            self.file.close()
            self.file = None
            return False
        return True

    def release(self):
        if self.file is not None:
            self.file.seek(0)
            if os.name == "nt":
                import msvcrt
                msvcrt.locking(self.file.fileno(), msvcrt.LK_UNLCK, 1)
            else:
                import fcntl
                fcntl.flock(self.file.fileno(), fcntl.LOCK_UN)
            self.file.close()
            self.file = None


def worker_env(settings: Settings):
    (settings.data_dir / "vision_cache" / "Ultralytics").mkdir(parents=True, exist_ok=True)
    (settings.data_dir / "vision_cache" / "matplotlib").mkdir(parents=True, exist_ok=True)
    env = dict(os.environ)
    env["PYTHONUNBUFFERED"] = "1"
    env["PYTHONUTF8"] = "1"
    env["YOLO_CONFIG_DIR"] = str(settings.data_dir / "vision_cache")
    env["MPLCONFIGDIR"] = str(settings.data_dir / "vision_cache" / "matplotlib")
    env["YOLO_AUTOINSTALL"] = "false"
    # Keep tracker imports independent from the API environment.
    env["PYTHONPATH"] = str(ROOT)
    return env


class JobManager:
    def __init__(self, settings: Settings, store: Store):
        self.settings = settings
        self.store = store
        self.directory = settings.data_dir / "jobs"
        self.stop_event = threading.Event()
        self.thread = None
        self.lock = RunnerLock(self.directory / ".runner.lock")
        self.submission_lock = threading.Lock()
        self.runtime = {"enabled": settings.processing_enabled, "ready": False, "reason": "Procesamiento desactivado en configuración",
                        "worker_available": settings.worker_python.is_file(), "model_available": settings.model_path.is_file(),
                        "max_upload_mb": settings.max_upload_mb, "max_video_seconds": settings.max_video_seconds}

    def start(self):
        self.directory.mkdir(parents=True, exist_ok=True)
        if not self.lock.acquire():
            self.runtime["reason"] = "Otro servidor administra esta cola. Usa una sola instancia del backend."
            return
        self.store.recover()
        if self.settings.processing_enabled:
            self._check_runtime()
        if self.runtime["ready"]:
            self.thread = threading.Thread(target=self._loop, name="futai-job-runner", daemon=True)
            self.thread.start()
        else:
            for job in self.store.jobs():
                if job["status"] == "queued":
                    self.store.fail(job["id"], self.runtime["reason"])

    def _check_runtime(self):
        if not self.runtime["worker_available"]:
            self.runtime["reason"] = "No se encontró el intérprete del motor. Ejecuta CONFIGURAR_PROCESAMIENTO.bat."
            return
        if not self.runtime["model_available"]:
            self.runtime["reason"] = "No se encontraron los pesos YOLO locales. Configura FUTAI_MODEL_PATH."
            return
        if self.settings.worker_module != "vision.worker":
            self.runtime.update(ready=True, reason=None)
            return
        probe = "import importlib.util,json; names=['cv2','numpy','torch','ultralytics','lap']; print(json.dumps([n for n in names if importlib.util.find_spec(n) is None]))"
        try:
            check = subprocess.run([str(self.settings.worker_python), "-c", probe], cwd=ROOT,
                                   capture_output=True, text=True, timeout=20, env=worker_env(self.settings),
                                   creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))
            missing = json.loads(check.stdout.strip()) if check.returncode == 0 else ["runtime"]
            if missing:
                self.runtime["reason"] = "Faltan dependencias del motor: " + ", ".join(missing) + ". Ejecuta CONFIGURAR_PROCESAMIENTO.bat."
                return
        except (OSError, ValueError, subprocess.TimeoutExpired):
            self.runtime["reason"] = "No se pudo verificar el motor. Revisa FUTAI_WORKER_PYTHON."
            return
        self.runtime.update(ready=True, reason=None)

    def stop(self):
        self.stop_event.set()
        if self.thread:
            self.thread.join(timeout=12)
            if self.thread.is_alive():
                logger.error("El ejecutor no terminó a tiempo; se conserva el bloqueo de la cola")
                return
        self.lock.release()

    def _loop(self):
        while not self.stop_event.is_set():
            job = None
            try:
                job = self.store.claim()
                if job is not None:
                    self._run_job(job)
            except Exception:
                logger.exception("Error en el ejecutor de trabajos")
                if job:
                    self.store.fail(job["id"], "Error interno del ejecutor. Consulta el registro del servidor.")
            self.stop_event.wait(0.25)

    @staticmethod
    def _terminate(process):
        if process.poll() is None:
            try:
                if os.name == "nt":
                    # FFmpeg is a child of the worker; terminate the whole owned tree.
                    subprocess.run(["taskkill", "/PID", str(process.pid), "/T", "/F"], capture_output=True,
                                   timeout=3, creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))
                else:
                    os.killpg(process.pid, signal.SIGTERM)
            except (OSError, subprocess.TimeoutExpired):
                if process.poll() is None:
                    process.terminate()
            try:
                process.wait(timeout=4)
            except subprocess.TimeoutExpired:
                if os.name == "nt":
                    process.kill()
                else:
                    os.killpg(process.pid, signal.SIGKILL)
                process.wait(timeout=4)

    def _run_job(self, job):
        directory = self.directory / job["id"]
        output = directory / "output"
        process = None
        try:
            with (directory / "worker.log").open("wb") as log:
                process = subprocess.Popen([str(self.settings.worker_python), "-m", self.settings.worker_module,
                                            "--request", str(directory / "request.json")],
                                           cwd=ROOT, env=worker_env(self.settings), stdin=subprocess.DEVNULL,
                                           stdout=log, stderr=subprocess.STDOUT,
                                           start_new_session=os.name != "nt",
                                           creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))
                deadline = time.monotonic() + self.settings.worker_timeout_seconds
                while process.poll() is None:
                    if self.stop_event.wait(0.25):
                        raise RuntimeError("Servidor detenido durante el procesamiento. Vuelve a enviar el video.")
                    if time.monotonic() >= deadline:
                        raise RuntimeError("El procesamiento excedió el tiempo máximo configurado.")
                    self._read_progress(job["id"], output / "progress.json")
                if process.returncode != 0:
                    error = "El motor no pudo procesar el video. Consulta worker.log del trabajo."
                    error_file = output / "error.json"
                    if error_file.is_file() and error_file.stat().st_size <= 16384:
                        try:
                            detail = json.loads(error_file.read_text(encoding="utf-8")).get("error")
                            if isinstance(detail, str):
                                error = detail
                        except (OSError, ValueError, AttributeError):
                            pass
                    raise RuntimeError(error)
                result_file = output / "result.json"
                if not result_file.is_file() or result_file.stat().st_size > MAX_JSON_SIZE:
                    raise RuntimeError("El motor no generó un resultado válido dentro del límite de 5 MB.")
                payload = validate_result(json.loads(result_file.read_text(encoding="utf-8")))
                self.store.complete(job["id"], payload)
        except Exception as exc:
            if process is not None:
                self._terminate(process)
            self.store.fail(job["id"], getattr(exc, "detail", None) or str(exc))
            logger.warning("Trabajo %s fallido: %s", job["id"], exc)
        finally:
            if process is not None:
                self._terminate(process)

    def _read_progress(self, job_id, file):
        try:
            if not file.is_file() or file.stat().st_size > 16384:
                return
            info = json.loads(file.read_text(encoding="utf-8"))
            progress = float(info.get("progress", 0))
            if not math.isfinite(progress):
                return
            self.store.progress(job_id, max(0, min(99, progress)), str(info.get("stage", "tracking"))[:100], str(info.get("message", "Procesando video"))[:300])
        except (OSError, ValueError, AttributeError, TypeError):
            pass

    def artifacts(self, job):
        if job["status"] != "completed":
            return {}
        return {kind: f"/api/jobs/{job['id']}/artifacts/{kind}" for kind, name in ARTIFACTS.items()
                if (self.directory / job["id"] / "output" / name).is_file()}

    def public_job(self, job):
        return {**job, "artifacts": self.artifacts(job)}
