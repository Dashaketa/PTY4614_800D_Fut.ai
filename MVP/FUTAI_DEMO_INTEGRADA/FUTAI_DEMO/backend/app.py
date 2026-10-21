"""FUT.AI entry point: uvicorn app:app. Vision dependencies stay in its worker."""
from __future__ import annotations

import asyncio
import json
import shutil
import uuid
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Literal

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from futai_api.config import Settings
from futai_api.jobs import ARTIFACTS, JobManager
from futai_api.schemas import MAX_JSON_SIZE, parse_calibration, validate_result
from futai_api.storage import Store


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or Settings.from_env()
    store = Store(settings)
    manager = JobManager(settings, store)

    @asynccontextmanager
    async def lifespan(application):
        store.init()
        manager.start()
        try:
            yield
        finally:
            manager.stop()

    application = FastAPI(title="FUT.AI · API MVP", version="0.2.0", lifespan=lifespan)
    application.state.settings = settings
    application.state.store = store
    application.state.job_manager = manager
    application.state.submission_lock = asyncio.Lock()
    application.add_middleware(CORSMiddleware, allow_origins=list(settings.cors_origins),
                               allow_credentials=False, allow_methods=["GET", "POST"], allow_headers=["*"],
                               expose_headers=["Content-Disposition", "Accept-Ranges", "Content-Range"])

    def record(analysis_id=None):
        result = store.analysis(analysis_id)
        if result is None:
            raise HTTPException(404, "Aún no hay análisis cargados" if analysis_id is None else "Análisis no encontrado")
        job = store.job(result["job_id"]) if result["job_id"] else None
        result["artifacts"] = manager.artifacts(job) if job else {}
        return result

    def find_job(job_id):
        if len(job_id) != 32 or any(c not in "0123456789abcdef" for c in job_id):
            raise HTTPException(404, "Trabajo no encontrado")
        job = store.job(job_id)
        if job is None:
            raise HTTPException(404, "Trabajo no encontrado")
        return job

    @application.get("/api/health")
    def health():
        with store.connect() as con:
            con.execute("SELECT 1").fetchone()
        return {"status": "ok", "backend": "FastAPI", "database": "SQLite",
                "mode": "metricas_precalculadas", "processing": dict(manager.runtime)}

    @application.get("/api/analyses")
    def list_analyses():
        return store.list_analyses()

    @application.get("/api/analyses/latest")
    def latest():
        return record()

    @application.get("/api/analyses/{analysis_id}")
    def get_analysis(analysis_id: int):
        return record(analysis_id)

    @application.post("/api/analyses/import")
    async def import_analysis(file: UploadFile = File(...)):
        try:
            if not file.filename or not file.filename.lower().endswith(".json"):
                raise HTTPException(400, "Selecciona un archivo JSON de resultados FUT.AI")
            raw = await file.read(MAX_JSON_SIZE + 1)
            if len(raw) > MAX_JSON_SIZE:
                raise HTTPException(413, "Archivo JSON demasiado grande (máximo 5 MB)")
            try:
                payload = validate_result(json.loads(raw))
            except (UnicodeDecodeError, ValueError, RecursionError) as exc:
                raise HTTPException(422, "JSON inválido") from exc
            new_id = store.save(payload, origin="IMPORTADO_COLAB")
            return {"ok": True, "id": new_id, "video": payload.get("video"),
                    "tracks": len(payload["metricas_por_track"]), "status": "PROVISIONAL_NO_VALIDADO"}
        finally:
            await file.close()

    @application.get("/api/jobs")
    def list_jobs():
        return [manager.public_job(job) for job in store.jobs()]

    @application.post("/api/jobs", status_code=202)
    async def create_job(file: UploadFile = File(...), calibration: str | None = Form(None),
                         annotation_style: Literal["ellipses", "boxes"] = Form("ellipses")):
        directory = None
        registered = False
        try:
            if not manager.runtime["ready"]:
                raise HTTPException(503, manager.runtime["reason"] or "El procesamiento no está disponible")
            filename = (file.filename or "").replace("\\", "/").rsplit("/", 1)[-1]
            extension = Path(filename).suffix.lower()
            if extension not in (".mp4", ".webm", ".mov"):
                raise HTTPException(400, "Selecciona un video MP4, WebM o MOV")
            cal = parse_calibration(calibration)
            async with application.state.submission_lock:
                if store.pending_count() >= settings.max_pending_jobs:
                    raise HTTPException(429, "La cola está llena. Espera a que termine un trabajo.")
                job_id = uuid.uuid4().hex
                directory = manager.directory / job_id
                directory.mkdir()
                output = directory / "output"
                output.mkdir()
                input_path = directory / ("input" + extension)
                total = 0
                header = b""
                with input_path.open("wb") as destination:
                    while chunk := await file.read(1024 * 1024):
                        total += len(chunk)
                        if total > settings.max_upload_mb * 1024 * 1024:
                            raise HTTPException(413, f"Video demasiado grande (máximo {settings.max_upload_mb} MB)")
                        if not header:
                            header = chunk[:32]
                        destination.write(chunk)
                if total == 0:
                    raise HTTPException(400, "El video está vacío")
                valid_header = header.startswith(b"\x1a\x45\xdf\xa3") if extension == ".webm" else len(header) >= 8 and header[4:8] in (b"ftyp", b"moov", b"mdat", b"wide", b"free", b"skip")
                if not valid_header:
                    raise HTTPException(400, "El contenido no corresponde a un video MP4, WebM o MOV válido")
                request = {"input_path": str(input_path), "output_dir": str(output), "video_name": filename[:255],
                           "model_path": str(settings.model_path), "device": settings.device, "image_size": settings.image_size,
                           "confidence": settings.confidence, "max_speed_kmh": settings.max_speed_kmh,
                           "max_frames": settings.max_frames, "max_seconds": settings.max_video_seconds, "calibration": cal,
                           "annotation_style": annotation_style}
                (directory / "request.json").write_text(json.dumps(request, ensure_ascii=False, allow_nan=False), encoding="utf-8")
                store.create_job(job_id, filename[:255])
                registered = True
                return manager.public_job(store.job(job_id))
        finally:
            await file.close()
            if directory is not None and not registered and directory.parent.resolve() == manager.directory.resolve():
                shutil.rmtree(directory)

    @application.get("/api/jobs/{job_id}")
    def get_job(job_id: str):
        return manager.public_job(find_job(job_id))

    @application.get("/api/jobs/{job_id}/artifacts/{kind}")
    def get_artifact(job_id: str, kind: str):
        job = find_job(job_id)
        if kind not in ARTIFACTS:
            raise HTTPException(404, "Archivo no encontrado")
        if job["status"] != "completed":
            raise HTTPException(409, "Los archivos estarán disponibles cuando termine el análisis")
        target = manager.directory / job_id / "output" / ARTIFACTS[kind]
        if not target.is_file():
            raise HTTPException(404, "Archivo no disponible para este análisis")
        media = {"video": "video/mp4", "tracks": "text/csv", "result": "application/json"}[kind]
        return FileResponse(target, media_type=media, filename=f"futai_{job_id}_{ARTIFACTS[kind]}",
                            content_disposition_type="inline" if kind == "video" else "attachment")

    return application


app = create_app()
