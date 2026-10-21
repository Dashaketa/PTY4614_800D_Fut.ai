"""API regression tests; they run without Ultralytics, Torch or OpenCV.

Run with the API virtualenv: python -m unittest discover -s tests -v
"""
from __future__ import annotations

from contextlib import ExitStack
import json
from pathlib import Path
import sys
from tempfile import TemporaryDirectory
import time
import unittest

BACKEND = Path(__file__).resolve().parents[1]
if str(BACKEND) not in sys.path:
    sys.path.insert(0, str(BACKEND))

from fastapi.testclient import TestClient

from app import create_app
from futai_api.config import Settings


def sample(video="sample.mp4", track_id=7):
    return {
        "video": video,
        "procesamiento": {"frames": 12, "fps": 25, "estado": "VALIDADO"},
        "metricas_por_track": [{
            "track_id": track_id,
            "distancia_observada_m": 2.5,
            "velocidad_maxima_estimada_kmh": 5.0,
            "duracion_observada_s": 0.48,
            "estado": "VALIDADO",
        }],
    }


class ApiTestCase(unittest.TestCase):
    def setUp(self):
        self.stack = ExitStack()
        self.addCleanup(self.stack.close)
        self.root = Path(self.stack.enter_context(TemporaryDirectory(prefix="futai-api-test-")))
        self.seed = self.root / "seed.json"
        self.seed.write_text(json.dumps(sample()), encoding="utf-8")
        self.settings = self.make_settings("main")
        self.app, self.client = self.open_client(self.settings)

    def make_settings(self, name, **overrides):
        values = dict(
            data_dir=self.root / name,
            seed_path=self.seed,
            processing_enabled=False,
            worker_python=Path(sys.executable),
            model_path=self.root / "unused-model.pt",
            max_upload_mb=1,
            max_video_seconds=10,
            max_frames=20,
            worker_timeout_seconds=10,
        )
        values.update(overrides)
        return Settings(**values)

    def open_client(self, settings):
        application = create_app(settings)
        client = self.stack.enter_context(TestClient(application))
        return application, client

    def import_result(self, payload, *, client=None, filename="result.json"):
        return (client or self.client).post(
            "/api/analyses/import",
            files={"file": (filename, json.dumps(payload).encode("utf-8"), "application/json")},
        )


class ApiRegressionTests(ApiTestCase):
    def test_startup_seeds_once_and_preserves_provisional_contract(self):
        health = self.client.get("/api/health")
        self.assertEqual(health.status_code, 200)
        self.assertEqual(health.json()["status"], "ok")
        self.assertEqual(len(self.client.get("/api/analyses").json()), 1)
        latest = self.client.get("/api/analyses/latest").json()
        self.assertEqual(latest["origin"], "MUESTRA_PARCIAL")
        self.assertEqual(latest["result"]["procesamiento"]["estado"], "PROVISIONAL_NO_VALIDADO")
        self.assertEqual(latest["result"]["metricas_por_track"][0]["estado"], "PROVISIONAL_NO_VALIDADO")
        _, reopened = self.open_client(self.settings)
        self.assertEqual(len(reopened.get("/api/analyses").json()), 1)

    def test_import_and_lookup_by_id_do_not_depend_on_latest(self):
        first = self.import_result(sample("first.mp4", 11))
        second = self.import_result(sample("second.mp4", 22))
        self.assertEqual(first.status_code, 200, first.text)
        self.assertEqual(second.status_code, 200, second.text)
        first_id, second_id = first.json()["id"], second.json()["id"]
        self.assertNotEqual(first_id, second_id)
        record = self.client.get(f"/api/analyses/{first_id}")
        self.assertEqual(record.status_code, 200)
        self.assertEqual(record.json()["result"]["video"], "first.mp4")
        self.assertEqual(record.json()["result"]["metricas_por_track"][0]["track_id"], 11)
        self.assertEqual(self.client.get("/api/analyses/latest").json()["id"], second_id)
        self.assertEqual(self.client.get("/api/analyses/999999").status_code, 404)

    def test_rejected_imports_leave_existing_results_unchanged(self):
        before = self.client.get("/api/analyses/latest").json()
        cases = [
            ("broken.json", b"{", 422),
            ("invalid-encoding.json", b"\xff", 422),
            ("array.json", b"[]", 422),
            ("incomplete.json", b'{"procesamiento": {}}', 422),
            ("wrong.txt", b"{}", 400),
            ("large.json", b" " * (5 * 1024 * 1024 + 1), 413),
        ]
        for filename, body, expected in cases:
            with self.subTest(filename=filename):
                response = self.client.post(
                    "/api/analyses/import", files={"file": (filename, body, "application/json")}
                )
                self.assertEqual(response.status_code, expected, response.text)
                self.assertEqual(self.client.get("/api/analyses/latest").json(), before)
                self.assertEqual(len(self.client.get("/api/analyses").json()), 1)

    def test_app_instances_have_independent_databases(self):
        _, other = self.open_client(self.make_settings("other"))
        self.assertEqual(self.import_result(sample("only-main.mp4")).status_code, 200)
        self.assertEqual(len(self.client.get("/api/analyses").json()), 2)
        self.assertEqual(len(other.get("/api/analyses").json()), 1)
        self.assertEqual(other.get("/api/analyses/latest").json()["result"]["video"], "sample.mp4")

    def test_empty_database_reports_missing_analysis(self):
        _, empty = self.open_client(self.make_settings("empty", seed_path=self.root / "missing.json"))
        self.assertEqual(empty.get("/api/analyses").json(), [])
        self.assertEqual(empty.get("/api/analyses/latest").status_code, 404)

    def test_cors_permits_local_demo_and_rejects_unknown_origin(self):
        for origin in ("http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:4173"):
            with self.subTest(origin=origin):
                response = self.client.options("/api/analyses/import", headers={
                    "Origin": origin, "Access-Control-Request-Method": "POST",
                })
                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.headers.get("access-control-allow-origin"), origin)
        response = self.client.options("/api/analyses/import", headers={
            "Origin": "https://unknown.example", "Access-Control-Request-Method": "POST",
        })
        self.assertNotIn("access-control-allow-origin", response.headers)

    def test_processing_disabled_and_missing_job_are_explicit(self):
        response = self.client.post("/api/jobs", files={"file": ("clip.mp4", b"video", "video/mp4")})
        self.assertEqual(response.status_code, 503, response.text)
        self.assertEqual(self.client.get("/api/jobs/does-not-exist").status_code, 404)
        self.assertEqual(len(self.client.get("/api/analyses").json()), 1)


class JobIntegrationTests(ApiTestCase):
    """Exercise a real child process and SQLite without vision dependencies."""

    def setUp(self):
        super().setUp()
        self.model = self.root / "fixture-model.pt"
        self.model.write_bytes(b"fixture; never loaded")
        self.job_app, self.jobs = self.open_client(self.make_settings(
            "processing", processing_enabled=True, model_path=self.model,
            worker_module="tests.fake_worker",
        ))
        self.manager = self.job_app.state.job_manager

    def submit(self, marker=b"success", filename="clip.mp4", calibration=None, client=None, annotation_style=None):
        data = {} if calibration is None else {"calibration": calibration}
        if annotation_style is not None:
            data["annotation_style"] = annotation_style
        return (client or self.jobs).post("/api/jobs", data=data, files={
            "file": (filename, b"\x00\x00\x00\x18ftypisom" + marker, "video/mp4"),
        })

    def wait_job(self, job_id, predicate=None, *, client=None, timeout=12):
        client = client or self.jobs
        predicate = predicate or (lambda job: job["status"] in ("completed", "failed"))
        deadline = time.monotonic() + timeout
        while time.monotonic() < deadline:
            response = client.get(f"/api/jobs/{job_id}")
            self.assertEqual(response.status_code, 200, response.text)
            job = response.json()
            if predicate(job):
                return job
            time.sleep(0.03)
        self.fail(f"Job {job_id} did not reach expected state: {job}")

    def release(self, job_id, *, manager=None):
        ((manager or self.manager).directory / job_id / "release.flag").touch()

    def test_only_successful_completion_publishes_result_and_artifacts(self):
        before = self.jobs.get("/api/analyses/latest").json()
        response = self.submit(b"hold-success", filename="finished.mp4")
        self.assertEqual(response.status_code, 202, response.text)
        accepted = response.json()
        for key in ("id", "status", "progress", "stage", "message", "error", "analysis_id", "artifacts"):
            self.assertIn(key, accepted)
        job_id = accepted["id"]
        running = self.wait_job(job_id, lambda job: job["progress"] >= 60)
        self.assertEqual(running["status"], "running")
        self.assertIsNone(running["analysis_id"])
        self.assertEqual(running["artifacts"], {})
        # The worker already wrote result.json; it must not be public yet.
        self.assertTrue((self.manager.directory / job_id / "output" / "result.json").is_file())
        self.assertEqual(self.jobs.get("/api/analyses/latest").json(), before)
        self.assertEqual(self.jobs.get(f"/api/jobs/{job_id}/artifacts/result").status_code, 409)
        self.release(job_id)
        job = self.wait_job(job_id)
        self.assertEqual(job["status"], "completed", job)
        self.assertEqual(job["progress"], 100)
        self.assertIsNone(job["error"])
        self.assertEqual(set(job["artifacts"]), {"video", "tracks", "result"})
        record = self.jobs.get(f"/api/analyses/{job['analysis_id']}").json()
        self.assertEqual(record["job_id"], job_id)
        self.assertEqual(record["result"]["video"], "finished.mp4")
        self.assertEqual(record["result"]["procesamiento"]["estado"], "PROVISIONAL_NO_VALIDADO")
        self.assertIsNone(record["result"]["metricas_por_track"][0]["distancia_observada_m"])
        self.assertEqual(self.jobs.get("/api/analyses/latest").json()["id"], job["analysis_id"])
        self.assertEqual(record["artifacts"], job["artifacts"])
        self.assertEqual(self.jobs.get(job["artifacts"]["result"]).json()["video"], "finished.mp4")
        self.assertIn("track_id", self.jobs.get(job["artifacts"]["tracks"]).text)
        video = self.jobs.get(job["artifacts"]["video"])
        self.assertEqual(video.status_code, 200)
        self.assertEqual(video.headers["content-type"], "video/mp4")
        self.assertIn("inline", video.headers["content-disposition"])

    def test_failed_worker_does_not_replace_latest_or_expose_partial_files(self):
        before = self.jobs.get("/api/analyses/latest").json()
        response = self.submit(b"fail")
        self.assertEqual(response.status_code, 202, response.text)
        job_id = response.json()["id"]
        job = self.wait_job(job_id)
        self.assertEqual(job["status"], "failed", job)
        self.assertIn("Fallo controlado", job["error"])
        self.assertIsNone(job["analysis_id"])
        self.assertEqual(job["artifacts"], {})
        self.assertEqual(self.jobs.get(f"/api/jobs/{job_id}/artifacts/result").status_code, 409)
        self.assertEqual(self.jobs.get("/api/analyses/latest").json(), before)
        self.assertEqual(len(self.jobs.get("/api/analyses").json()), 1)

    def test_invalid_worker_output_is_failed_instead_of_published(self):
        before = self.jobs.get("/api/analyses/latest").json()
        response = self.submit(b"invalid-result")
        self.assertEqual(response.status_code, 202, response.text)
        job = self.wait_job(response.json()["id"])
        self.assertEqual(job["status"], "failed", job)
        self.assertIsNone(job["analysis_id"])
        self.assertEqual(self.jobs.get("/api/analyses/latest").json(), before)

    def test_video_and_calibration_validation_do_not_enqueue_or_leave_uploads(self):
        invalid_calibrations = ["{", "[]", "{}", json.dumps({
            "mode": "static", "image_points": [[0, 0], [1, 1], [2, 2], [3, 3]],
            "field_points": [[0, 0], [105, 0], [105, 68], [0, 68]],
        })]
        # Both are legal JSON numbers: neither should turn an invalid upload into a 500.
        for coordinate in (10 ** 400, 1e308):
            invalid_calibrations.append(json.dumps({
                "mode": "static", "image_points": [[0, 0], [coordinate, 0], [640, 480], [0, 480]],
                "field_points": [[0, 0], [105, 0], [105, 68], [0, 68]],
            }))
        for calibration in invalid_calibrations:
            with self.subTest(calibration=calibration):
                response = self.submit(calibration=calibration)
                self.assertEqual(response.status_code, 422, response.text)
        self.assertEqual(self.submit(filename="script.py").status_code, 400)
        for name, body, expected in (
            ("empty.mp4", b"", 400),
            ("pretend.mp4", b"not a video", 400),
            ("large.mp4", b"\x00\x00\x00\x18ftypisom" + b"x" * 1024 * 1024, 413),
        ):
            with self.subTest(filename=name):
                response = self.jobs.post("/api/jobs", files={"file": (name, body, "video/mp4")})
                self.assertEqual(response.status_code, expected, response.text)
        self.assertEqual(self.jobs.get("/api/jobs").json(), [])
        self.assertEqual([p for p in self.manager.directory.iterdir() if p.is_dir()], [])

    def test_valid_calibration_and_limits_are_passed_unchanged_to_child(self):
        calibration = {
            "mode": "static", "image_points": [[0, 0], [640, 0], [640, 480], [0, 480]],
            "field_points": [[0, 0], [105, 0], [105, 68], [0, 68]], "field_size": [105, 68],
        }
        response = self.submit(b"hold", filename="../../safe.mp4", calibration=json.dumps(calibration))
        self.assertEqual(response.status_code, 202, response.text)
        job_id = response.json()["id"]
        self.wait_job(job_id, lambda job: job["progress"] >= 60)
        request = json.loads((self.manager.directory / job_id / "request.json").read_text(encoding="utf-8"))
        self.assertEqual(request["calibration"], calibration)
        self.assertEqual(request["video_name"], "safe.mp4")
        self.assertEqual(request["max_frames"], 20)
        self.assertEqual(request["max_seconds"], 10)
        self.assertEqual(request["annotation_style"], "ellipses")
        self.assertEqual(Path(request["input_path"]).parent, self.manager.directory / job_id)
        self.release(job_id)
        self.assertEqual(self.wait_job(job_id)["status"], "completed")

    def test_both_annotation_styles_reach_worker_and_keep_three_downloads(self):
        for style in ("ellipses", "boxes"):
            with self.subTest(style=style):
                response = self.submit(b"hold", annotation_style=style)
                self.assertEqual(response.status_code, 202, response.text)
                job_id = response.json()["id"]
                self.wait_job(job_id, lambda job: job["progress"] >= 60)
                request = json.loads((self.manager.directory / job_id / "request.json").read_text(encoding="utf-8"))
                self.assertEqual(request["annotation_style"], style)
                self.release(job_id)
                job = self.wait_job(job_id)
                self.assertEqual(job["status"], "completed", job)
                self.assertEqual(set(job["artifacts"]), {"video", "tracks", "result"})
                for kind, url in job["artifacts"].items():
                    artifact = self.jobs.get(url)
                    self.assertEqual(artifact.status_code, 200, kind)
                    self.assertTrue(artifact.content, kind)
                partial = self.jobs.get(job["artifacts"]["video"], headers={"Range": "bytes=0-7"})
                self.assertEqual(partial.status_code, 206)
                self.assertEqual(len(partial.content), 8)

    def test_invalid_annotation_style_does_not_enqueue_or_create_upload_directory(self):
        response = self.submit(annotation_style="triangles")
        self.assertEqual(response.status_code, 422, response.text)
        self.assertEqual(self.jobs.get("/api/jobs").json(), [])
        self.assertEqual([p for p in self.manager.directory.iterdir() if p.is_dir()], [])

    def test_queue_capacity_and_worker_timeout_keep_demo_available(self):
        application, client = self.open_client(self.make_settings(
            "short-timeout", processing_enabled=True, model_path=self.model,
            worker_module="tests.fake_worker", max_pending_jobs=1, worker_timeout_seconds=1,
        ))
        before = client.get("/api/analyses/latest").json()
        response = self.submit(b"hold", client=client)
        self.assertEqual(response.status_code, 202, response.text)
        self.assertEqual(self.submit(client=client).status_code, 429)
        # No release: manager must stop the child on its configured deadline.
        job = self.wait_job(response.json()["id"], client=client)
        self.assertEqual(job["status"], "failed", job)
        self.assertIn("tiempo", job["error"])
        self.assertEqual(client.get("/api/health").status_code, 200)
        self.assertEqual(client.get("/api/analyses/latest").json(), before)

    def test_artifact_names_and_job_ids_cannot_select_arbitrary_files(self):
        response = self.submit()
        self.assertEqual(response.status_code, 202, response.text)
        job_id = response.json()["id"]
        job = self.wait_job(job_id)
        self.assertEqual(job["status"], "completed", job)
        for path in (
            f"/api/jobs/{job_id}/artifacts/worker.log",
            f"/api/jobs/{job_id}/artifacts/result.json",
            f"/api/jobs/{job_id}/artifacts/..%2F..%2Frequest.json",
            "/api/jobs/..%2F..%2Fseed.json/artifacts/result",
            f"/api/jobs/{'a' * 32}/artifacts/result",
        ):
            with self.subTest(path=path):
                self.assertEqual(self.jobs.get(path).status_code, 404)


if __name__ == "__main__":
    unittest.main()
