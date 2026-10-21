"""Pruebas del contrato del motor sin instalar PyTorch/OpenCV en el API."""
from __future__ import annotations

import csv
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import types
import unittest
from unittest.mock import patch

# Ejecutable con unittest discover desde cualquier cwd.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from vision.config import WorkerConfig, validate_calibration
from vision.metrics import MetricsAccumulator
from vision.worker import CSV_FIELDS, atomic_json, finish_video, main, run


class VisionConfigTests(unittest.TestCase):
    def test_static_calibration_rejects_degenerate_and_out_of_bounds_points(self):
        valid = {"mode": "static", "image_points": [[0, 0], [100, 0], [100, 100], [0, 100]],
                 "field_points": [[0, 0], [10, 0], [10, 10], [0, 10]], "field_size": [10, 10]}
        self.assertEqual(validate_calibration(valid)["mode"], "static")
        self.assertIsNone(validate_calibration(None))
        for replacement in (
            {"mode": "dynamic"},
            {"image_points": [[0, 0], [1, 0], [2, 0], [3, 0]]},
            {"field_size": [9, 10]},
            {"field_points": [[0, 0], [10, 0], [10, 10], [10, 10]]},
        ):
            with self.subTest(replacement=replacement), self.assertRaises(ValueError):
                validate_calibration({**valid, **replacement})

    def test_no_downloads_when_local_model_missing_and_no_invalid_numbers(self):
        with tempfile.TemporaryDirectory() as directory:
            folder = Path(directory)
            video = folder / "input.mp4"
            video.write_bytes(b"not decoded in this test")
            request = {"input_path": str(video), "output_dir": str(folder / "artifacts"),
                       "model_path": str(folder / "missing.pt")}
            with self.assertRaisesRegex(ValueError, "modelo local"):
                WorkerConfig.from_dict(request)
            weights = folder / "local.pt"
            weights.write_bytes(b"local weights")
            request["model_path"] = str(weights)
            self.assertEqual(WorkerConfig.from_dict(request).device, "cpu")
            for key, value in (("max_seconds", float("nan")), ("max_frames", 0.5),
                               ("image_size", 641), ("confidence", True), ("device", "bad device")):
                with self.subTest(key=key), self.assertRaises(ValueError):
                    WorkerConfig.from_dict({**request, key: value})

    def test_importing_vision_never_loads_heavy_runtime(self):
        command = [sys.executable, "-c", "import sys; import vision.worker; "
                   "assert not any(n in sys.modules for n in ('cv2','torch','ultralytics','numpy'))"]
        completed = subprocess.run(command, cwd=Path(__file__).resolve().parents[1], capture_output=True)
        self.assertEqual(completed.returncode, 0, completed.stderr.decode(errors="replace"))


class MetricTests(unittest.TestCase):
    def test_uncalibrated_tracks_keep_null_meters_and_count_only_observed_frames(self):
        metrics = MetricsAccumulator(25, calibrated=False)
        for frame in (0, 1, 2, 9, 10):
            metrics.observe(8, frame, None)
        metrics.observe(8, 10, None)  # No cuenta duplicados.
        row = metrics.results()[0]
        self.assertIsNone(row["distancia_observada_m"])
        self.assertIsNone(row["velocidad_maxima_estimada_kmh"])
        self.assertEqual(row["duracion_observada_s"], 0.2)
        self.assertEqual(row["numero_tramos"], 2)

    def test_distance_never_bridges_occlusions_or_impossible_jumps(self):
        metrics = MetricsAccumulator(10, calibrated=True, max_speed_kmh=45)
        metrics.observe(2, 0, (0, 0))
        metrics.observe(2, 1, (0.5, 0))  # 18 km/h; suma 0.5 m.
        metrics.observe(2, 2, (20, 0))   # Salto descartado.
        metrics.observe(2, 3, (20.5, 0))  # Nueva ancla, no suma desde el salto.
        metrics.observe(2, 4, (21, 0))  # Suma 0.5 m.
        metrics.observe(2, 10, (30, 0))  # Oclusión: nueva ancla.
        metrics.observe(2, 11, None)  # Fuera de cancha: invalida ancla.
        metrics.observe(2, 12, (31, 0))
        row = metrics.results()[0]
        self.assertEqual(row["distancia_observada_m"], 1)
        self.assertEqual(row["velocidad_maxima_estimada_kmh"], 18)
        self.assertEqual(row["numero_tramos"], 2)
        self.assertEqual(row["pasos_descartados"], 1)
        self.assertEqual(row["revision_recomendada"], "PRIORITARIA")

    def test_single_calibrated_observation_does_not_claim_a_distance(self):
        metrics = MetricsAccumulator(25, calibrated=True)
        metrics.observe(1, 0, (1, 2))
        self.assertIsNone(metrics.results()[0]["distancia_observada_m"])


class WorkerTests(unittest.TestCase):
    def test_atomic_json_retries_transient_reader_lock_and_publishes_complete_json(self):
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / "progress.json"
            target.write_text('{"progress": 1}', encoding="utf-8")
            original_replace = os.replace
            attempts = 0

            def replace_after_reader_closes(source, destination):
                nonlocal attempts
                attempts += 1
                if attempts <= 2:
                    raise PermissionError("Otro lector mantiene abierto el archivo")
                return original_replace(source, destination)

            with patch("vision.worker.os.replace", side_effect=replace_after_reader_closes), \
                    patch("vision.worker.time.sleep") as sleep:
                atomic_json(target, {"progress": 60, "message": "Escritura completa"})

            self.assertEqual(attempts, 3)
            self.assertEqual(sleep.call_count, 2)
            self.assertEqual(json.loads(target.read_text(encoding="utf-8")),
                             {"progress": 60, "message": "Escritura completa"})
            self.assertFalse(target.with_name("progress.json.tmp").exists())

    def test_atomic_json_persistent_lock_is_bounded_and_preserves_previous_json(self):
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / "progress.json"
            target.write_text('{"progress": 1, "message": "Anterior valido"}', encoding="utf-8")
            with patch("vision.worker.os.replace", side_effect=PermissionError("Archivo bloqueado")) as replace, \
                    patch("vision.worker.time.sleep") as sleep:
                with self.assertRaises(PermissionError):
                    atomic_json(target, {"progress": 100})

            self.assertEqual(replace.call_count, 6)
            self.assertEqual(sleep.call_count, 5)
            self.assertEqual(json.loads(target.read_text(encoding="utf-8")),
                             {"progress": 1, "message": "Anterior valido"})

    def test_failure_publishes_error_and_never_leaves_a_stale_result(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            output = root / "artifacts"
            output.mkdir()
            (output / "result.json").write_text('{"stale":true}')
            video, weights = root / "input.mp4", root / "local.pt"
            video.write_bytes(b"video")
            weights.write_bytes(b"model")
            request = root / "request.json"
            request.write_text(json.dumps({"input_path": str(video), "model_path": str(weights),
                                           "output_dir": str(output)}), encoding="utf-8")
            with patch("vision.worker.run", side_effect=RuntimeError("Fallo controlado")):
                self.assertEqual(main(["--request", str(request)]), 1)
            self.assertFalse((output / "result.json").exists())
            self.assertEqual(json.loads((output / "error.json").read_text())["error"], "Fallo controlado")
            self.assertEqual(json.loads((output / "progress.json").read_text())["stage"], "failed")

    def test_missing_ffmpeg_marks_mp4v_as_download_only(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / "source.mp4"
            destination = root / "video.mp4"
            source.write_bytes(b"encoded mp4v")
            warnings = []
            with patch("vision.worker._ffmpeg_path", return_value=None):
                codec, compatible = finish_video(source, destination, warnings)
            self.assertEqual(codec, "mp4v")
            self.assertFalse(compatible)
            self.assertEqual(destination.read_bytes(), b"encoded mp4v")
            self.assertTrue(warnings)

    def test_empty_detection_video_is_valid_and_releases_handles(self):
        """Una captura simulada verifica artefactos y liberación de recursos sin GPU."""
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            input_path, model = root / "input.mp4", root / "model.pt"
            input_path.write_bytes(b"input")
            model.write_bytes(b"model")
            config = WorkerConfig.from_dict({"input_path": str(input_path), "model_path": str(model),
                                             "output_dir": str(root / "artifacts")})

            class Capture:
                released = False
                frames = 2
                def isOpened(self): return True
                def get(self, key): return 25.0 if key == 1 else 2
                def read(self):
                    self.frames -= 1
                    return (True, types.SimpleNamespace(shape=(100, 200, 3))) if self.frames >= 0 else (False, None)
                def release(self): self.released = True

            class Writer:
                released = False
                written = 0
                def __init__(self, path, *args): Path(path).write_bytes(b"mp4v")
                def isOpened(self): return True
                def write(self, frame): self.written += 1
                def release(self): self.released = True

            capture = Capture()
            writers = []
            def create_writer(*args):
                writer = Writer(*args)
                writers.append(writer)
                return writer

            cv2 = types.SimpleNamespace(VideoCapture=lambda path: capture,
                                        VideoWriter=create_writer, VideoWriter_fourcc=lambda *args: 0,
                                        CAP_PROP_FPS=1, CAP_PROP_FRAME_COUNT=2)
            calls = []
            class FakeYOLO:
                def __init__(self, *args, **kwargs): pass
                def track(self, **kwargs):
                    calls.append(kwargs)
                    return [types.SimpleNamespace(boxes=types.SimpleNamespace(id=None))]

            with patch.dict(sys.modules, {"cv2": cv2, "numpy": types.SimpleNamespace(),
                                          "ultralytics": types.SimpleNamespace(YOLO=FakeYOLO)}), \
                    patch("vision.worker._ffmpeg_path", return_value=None):
                result = run(config)
            self.assertEqual(result["procesamiento"]["frames"], 2)
            self.assertEqual(result["metricas_por_track"], [])
            self.assertEqual(result["procesamiento"]["observaciones_tracking"], 0)
            self.assertFalse(result["procesamiento"]["video_browser_compatible"])
            self.assertTrue(capture.released)
            self.assertTrue(writers[0].released)
            self.assertEqual(writers[0].written, 2)
            self.assertTrue(all(call["tracker"] == "bytetrack.yaml" and call["persist"] for call in calls))
            with (config.output_dir / "tracks.csv").open(newline="") as file:
                self.assertEqual(next(csv.reader(file)), list(CSV_FIELDS))
            self.assertEqual(json.loads((config.output_dir / "progress.json").read_text())["progress"], 100)


if __name__ == "__main__":
    unittest.main()
