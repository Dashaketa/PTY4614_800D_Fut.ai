"""Explicit configuration. Relative paths resolve from backend, never shell cwd."""
from __future__ import annotations

import os
import math
import sys
from dataclasses import dataclass, field
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MVP = ROOT.parents[2]


def _path(value: str | Path) -> Path:
    path = Path(value).expanduser()
    return (ROOT / path).resolve() if not path.is_absolute() else path.resolve()


def default_worker() -> Path:
    existing = MVP / "Procesamiento" / ".venv" / ("Scripts/python.exe" if os.name == "nt" else "bin/python")
    return existing if existing.is_file() else Path(sys.executable)


@dataclass(frozen=True)
class Settings:
    data_dir: Path = ROOT / "data"
    seed_path: Path = ROOT / "data" / "demo_parcial_provisional.json"
    processing_enabled: bool = False
    worker_python: Path = field(default_factory=default_worker)
    model_path: Path = MVP / "Procesamiento" / "yolov8n.pt"
    worker_module: str = "vision.worker"
    device: str = "cpu"
    image_size: int = 640
    confidence: float = 0.1
    max_speed_kmh: float = 45
    max_upload_mb: int = 200
    max_video_seconds: int = 120
    max_frames: int = 0
    worker_timeout_seconds: int = 1800
    max_pending_jobs: int = 4
    cors_origins: tuple[str, ...] = (
        "http://localhost:5173", "http://127.0.0.1:5173",
        "http://localhost:4173", "http://127.0.0.1:4173",
    )

    def __post_init__(self):
        for name in ("data_dir", "seed_path", "worker_python", "model_path"):
            object.__setattr__(self, name, _path(getattr(self, name)))
        for name in ("image_size", "max_upload_mb", "max_video_seconds", "worker_timeout_seconds", "max_pending_jobs"):
            if getattr(self, name) <= 0:
                raise ValueError(f"{name} debe ser mayor que cero")
        if self.max_frames < 0:
            raise ValueError("max_frames no puede ser negativo")
        if not 32 <= self.image_size <= 2048 or self.image_size % 32:
            raise ValueError("image_size debe ser múltiplo de 32 entre 32 y 2048")
        if not math.isfinite(self.confidence) or not 0.01 <= self.confidence <= 1:
            raise ValueError("confidence debe quedar entre 0.01 y 1")
        if not math.isfinite(self.max_speed_kmh) or not 1 <= self.max_speed_kmh <= 100:
            raise ValueError("max_speed_kmh debe quedar entre 1 y 100")

    @classmethod
    def from_env(cls) -> "Settings":
        # python-dotenv belongs to the API environment, not the vision runtime.
        from dotenv import load_dotenv
        load_dotenv(ROOT / ".env", override=False)
        defaults = cls()
        kwargs = {}
        for name in ("data_dir", "seed_path", "worker_python", "model_path", "device"):
            key = f"FUTAI_{name.upper()}"
            if key in os.environ:
                kwargs[name] = os.environ[key]
        for name in ("image_size", "max_upload_mb", "max_video_seconds", "max_frames", "worker_timeout_seconds", "max_pending_jobs"):
            key = f"FUTAI_{name.upper()}"
            if key in os.environ:
                kwargs[name] = int(os.environ[key])
        for name in ("confidence", "max_speed_kmh"):
            key = f"FUTAI_{name.upper()}"
            if key in os.environ:
                kwargs[name] = float(os.environ[key])
        value = os.getenv("FUTAI_PROCESSING_ENABLED", "false").lower()
        if value not in ("true", "false", "1", "0", "yes", "no"):
            raise ValueError("FUTAI_PROCESSING_ENABLED debe ser true o false")
        kwargs["processing_enabled"] = value in ("true", "1", "yes")
        kwargs["cors_origins"] = tuple(x.strip() for x in os.getenv("FUTAI_CORS_ORIGINS", ",".join(defaults.cors_origins)).split(",") if x.strip())
        return cls(**kwargs)
