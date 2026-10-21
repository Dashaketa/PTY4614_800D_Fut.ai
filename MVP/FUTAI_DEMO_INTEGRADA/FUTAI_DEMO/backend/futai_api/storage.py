"""SQLite repositories. Keep the original analyses table and JSON envelope."""
from __future__ import annotations

import json
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone

from .config import Settings
from .schemas import validate_result


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


class Store:
    def __init__(self, settings: Settings):
        self.settings = settings
        self.db = settings.data_dir / "futai.sqlite3"

    @contextmanager
    def connect(self):
        con = sqlite3.connect(self.db, timeout=15)
        con.row_factory = sqlite3.Row
        try:
            with con:
                yield con
        finally:
            con.close()

    def init(self):
        self.settings.data_dir.mkdir(parents=True, exist_ok=True)
        with self.connect() as con:
            con.execute("PRAGMA journal_mode=WAL")
            con.execute("""CREATE TABLE IF NOT EXISTS analyses (
                id INTEGER PRIMARY KEY AUTOINCREMENT, created_at TEXT NOT NULL,
                origin TEXT NOT NULL, video TEXT NOT NULL, body TEXT NOT NULL
            )""")
            con.execute("""CREATE TABLE IF NOT EXISTS jobs (
                id TEXT PRIMARY KEY, filename TEXT NOT NULL, status TEXT NOT NULL,
                progress REAL NOT NULL DEFAULT 0, stage TEXT NOT NULL DEFAULT 'queued',
                message TEXT NOT NULL DEFAULT 'En espera', error TEXT,
                created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
                analysis_id INTEGER REFERENCES analyses(id)
            )""")
            count = con.execute("SELECT COUNT(*) FROM analyses").fetchone()[0]
        if count == 0 and self.settings.seed_path.is_file():
            self.save(validate_result(json.loads(self.settings.seed_path.read_text(encoding="utf-8"))), origin="MUESTRA_PARCIAL")

    def save(self, payload: dict, *, origin: str) -> int:
        with self.connect() as con:
            return self._insert_analysis(con, payload, origin)

    @staticmethod
    def _insert_analysis(con, payload, origin):
        return con.execute("INSERT INTO analyses (created_at, origin, video, body) VALUES (?, ?, ?, ?)",
                           (now(), origin, str(payload.get("video") or "sin_video"), json.dumps(payload, ensure_ascii=False, allow_nan=False))).lastrowid

    def list_analyses(self):
        with self.connect() as con:
            return [dict(r) for r in con.execute("SELECT id, created_at, origin, video FROM analyses ORDER BY id DESC LIMIT 25")]

    def analysis(self, analysis_id: int | None = None):
        with self.connect() as con:
            row = con.execute("SELECT * FROM analyses ORDER BY id DESC LIMIT 1" if analysis_id is None else "SELECT * FROM analyses WHERE id=?", () if analysis_id is None else (analysis_id,)).fetchone()
            if row is None:
                return None
            job = con.execute("SELECT id FROM jobs WHERE analysis_id=? AND status='completed'", (row["id"],)).fetchone()
        return {"id": row["id"], "created_at": row["created_at"], "origin": row["origin"],
                "result": json.loads(row["body"]), "job_id": job["id"] if job else None}

    def create_job(self, job_id, filename):
        timestamp = now()
        with self.connect() as con:
            con.execute("INSERT INTO jobs (id, filename, status, created_at, updated_at) VALUES (?, ?, 'queued', ?, ?)", (job_id, filename, timestamp, timestamp))

    def jobs(self):
        with self.connect() as con:
            return [dict(r) for r in con.execute("SELECT * FROM jobs ORDER BY created_at DESC LIMIT 25")]

    def job(self, job_id):
        with self.connect() as con:
            row = con.execute("SELECT * FROM jobs WHERE id=?", (job_id,)).fetchone()
            return dict(row) if row else None

    def pending_count(self):
        with self.connect() as con:
            return con.execute("SELECT COUNT(*) FROM jobs WHERE status IN ('queued','running')").fetchone()[0]

    def claim(self):
        with self.connect() as con:
            con.execute("BEGIN IMMEDIATE")
            row = con.execute("SELECT * FROM jobs WHERE status='queued' ORDER BY created_at LIMIT 1").fetchone()
            if row is None:
                return None
            con.execute("UPDATE jobs SET status='running', stage='loading', message='Iniciando motor de visión', updated_at=? WHERE id=?", (now(), row["id"]))
            return dict(row)

    def progress(self, job_id, progress, stage, message):
        with self.connect() as con:
            con.execute("UPDATE jobs SET progress=MAX(progress, ?), stage=?, message=?, updated_at=? WHERE id=? AND status='running'", (progress, stage, message, now(), job_id))

    def fail(self, job_id, error):
        with self.connect() as con:
            con.execute("UPDATE jobs SET status='failed', stage='failed', message='Procesamiento fallido', error=?, updated_at=? WHERE id=? AND status IN ('queued','running')", (str(error)[:2000], now(), job_id))

    def recover(self):
        with self.connect() as con:
            con.execute("UPDATE jobs SET status='failed', stage='failed', message='Procesamiento interrumpido', error='El servidor se reinició durante el procesamiento. Vuelve a enviar el video.', updated_at=? WHERE status='running'", (now(),))

    def complete(self, job_id, payload):
        # Publishing an analysis and completing its job must happen together.
        with self.connect() as con:
            con.execute("BEGIN IMMEDIATE")
            row = con.execute("SELECT status FROM jobs WHERE id=?", (job_id,)).fetchone()
            if row is None or row[0] != "running":
                raise ValueError("El trabajo ya no está en ejecución")
            analysis_id = self._insert_analysis(con, payload, "PIPELINE_LOCAL")
            con.execute("UPDATE jobs SET status='completed', progress=100, stage='completed', message='Análisis disponible', analysis_id=?, updated_at=? WHERE id=?", (analysis_id, now(), job_id))
            return analysis_id
