"""Drawing styles must leave tracking inputs, CSV and physical metrics intact."""
from __future__ import annotations

import json
from pathlib import Path
import sys
from tempfile import TemporaryDirectory
import types
import unittest
from unittest.mock import patch

BACKEND = Path(__file__).resolve().parents[1]
if str(BACKEND) not in sys.path:
    sys.path.insert(0, str(BACKEND))

from vision.annotations import VideoAnnotator
from vision.config import WorkerConfig
from vision.worker import run


class Frame:
    shape = (200, 300, 3)

    def __init__(self, index=0):
        self.index = index
        self.drawings = []

    def copy(self):
        copied = Frame(self.index)
        copied.drawings = list(self.drawings)
        return copied


class DrawingCV2:
    FONT_HERSHEY_SIMPLEX = 0
    LINE_AA = 16
    FILLED = -1

    def getTextSize(self, text, font, scale, thickness):
        return ((len(text) * 8, 12), 3)

    def ellipse(self, frame, *args, **kwargs):
        frame.drawings.append(("ellipse", args, kwargs))
        return frame

    def rectangle(self, frame, *args, **kwargs):
        frame.drawings.append(("rectangle", args, kwargs))
        return frame

    def circle(self, frame, *args, **kwargs):
        frame.drawings.append(("circle", args, kwargs))
        return frame

    def putText(self, frame, *args, **kwargs):
        frame.drawings.append(("text", args, kwargs))
        return frame


class AnnotationTests(unittest.TestCase):
    def annotator(self, style):
        # API tests need neither OpenCV/numpy nor the optional Supervision package.
        with patch.dict(sys.modules, {"supervision": None}):
            return VideoAnnotator(style, DrawingCV2(), types.SimpleNamespace())

    def test_ellipses_mark_feet_and_ids_above_heads_on_a_copy(self):
        frame = Frame()
        rendered = self.annotator("ellipses").annotate(frame, [((20, 60, 60, 140), 7)])
        self.assertIsNot(rendered, frame)
        self.assertEqual(frame.drawings, [])
        ellipses = [args for kind, args, _ in rendered.drawings if kind == "ellipse"]
        self.assertTrue(ellipses)
        self.assertTrue(all(ellipse[0] == (40, 140) for ellipse in ellipses))
        self.assertTrue(all(ellipse[1][0] > ellipse[1][1] for ellipse in ellipses))
        labels = [args for kind, args, _ in rendered.drawings if kind == "text"]
        self.assertEqual(len(labels), 1)
        self.assertIn("7", labels[0][0])
        self.assertLess(labels[0][1][1], 60)
        # Label backgrounds are allowed; the player's bounding box is hidden.
        self.assertFalse(any(kind == "rectangle" and args[:2] == ((20, 60), (60, 140))
                             for kind, args, _ in rendered.drawings))

    def test_box_style_still_draws_bbox_without_touching_inference_frame(self):
        frame = Frame()
        rendered = self.annotator("boxes").annotate(frame, [((20, 60, 60, 140), 7)])
        self.assertIsNot(rendered, frame)
        self.assertEqual(frame.drawings, [])
        self.assertTrue(any(kind == "rectangle" and args[:2] == ((20, 60), (60, 140))
                            for kind, args, _ in rendered.drawings))
        self.assertFalse(any(kind == "ellipse" for kind, _, _ in rendered.drawings))

    def test_track_colors_survive_reordering_and_new_annotator_instances(self):
        first = [((20, 60, 60, 140), 7), ((100, 60, 140, 140), 42)]
        second = list(reversed(first))
        for style in ("ellipses", "boxes"):
            with self.subTest(style=style):
                rendered_a = self.annotator(style).annotate(Frame(), first)
                rendered_b = self.annotator(style).annotate(Frame(), second)
                if style == "ellipses":
                    colors_a = {args[0]: args[5] for kind, args, _ in rendered_a.drawings if kind == "ellipse"}
                    colors_b = {args[0]: args[5] for kind, args, _ in rendered_b.drawings if kind == "ellipse"}
                else:
                    starts = {(20, 60), (100, 60)}
                    colors_a = {args[0]: args[2] for kind, args, _ in rendered_a.drawings
                                if kind == "rectangle" and args[0] in starts and args[1][1] == 140}
                    colors_b = {args[0]: args[2] for kind, args, _ in rendered_b.drawings
                                if kind == "rectangle" and args[0] in starts and args[1][1] == 140}
                self.assertEqual(len(colors_a), 2)
                self.assertEqual(colors_a, colors_b)

    def test_no_tracks_leaves_frame_untouched(self):
        for style in ("ellipses", "boxes"):
            with self.subTest(style=style):
                frame = Frame()
                rendered = self.annotator(style).annotate(frame, [])
                self.assertEqual(frame.drawings, [])
                self.assertEqual(rendered.drawings, [])


class Tensor:
    def __init__(self, values): self.values = values
    def detach(self): return self
    def cpu(self): return self
    def tolist(self): return self.values


class WorkerAnnotationTests(unittest.TestCase):
    def test_styles_preserve_csv_metrics_homography_inputs_and_original_frames(self):
        with TemporaryDirectory(prefix="futai-styles-") as temporary:
            root = Path(temporary)
            video, model = root / "input.mp4", root / "model.pt"
            video.write_bytes(b"mock input")
            model.write_bytes(b"local model")
            calibration = {
                "mode": "static", "image_points": [[0, 0], [299, 0], [299, 199], [0, 199]],
                "field_points": [[0, 0], [105, 0], [105, 68], [0, 68]],
            }
            outcomes = {}
            for style in ("ellipses", "boxes"):
                with self.subTest(style=style):
                    config = WorkerConfig.from_dict({
                        "input_path": str(video), "model_path": str(model), "video_name": "same-input.mp4",
                        "output_dir": str(root / style), "calibration": calibration, "annotation_style": style,
                    })
                    frames = [Frame(index) for index in range(3)]
                    inference_frames, written_frames, projected = [], [], []

                    class Capture:
                        index = 0
                        def isOpened(self): return True
                        def get(self, key): return 25 if key == 1 else len(frames)
                        def read(self):
                            if self.index == len(frames): return False, None
                            frame = frames[self.index]
                            self.index += 1
                            return True, frame
                        def release(self): pass

                    class Writer:
                        def __init__(self, path, *args): Path(path).write_bytes(b"mock encoded video")
                        def isOpened(self): return True
                        def write(self, frame): written_frames.append(frame)
                        def release(self): pass

                    class FakeYOLO:
                        def __init__(self, *args, **kwargs): pass
                        def track(self, **kwargs):
                            frame = kwargs["source"]
                            inference_frames.append(frame)
                            shift = frame.index * 2
                            boxes = types.SimpleNamespace(
                                xyxy=Tensor([[20 + shift, 60, 60 + shift, 140]]),
                                id=Tensor([7]), conf=Tensor([0.9]), cls=Tensor([0]),
                            )
                            return [types.SimpleNamespace(boxes=boxes)]

                    class FakeCalibration:
                        def __init__(self, *args): pass
                        def project(self, x, y):
                            projected.append((x, y))
                            return x / 10, y / 10

                    cv2 = DrawingCV2()
                    cv2.CAP_PROP_FPS, cv2.CAP_PROP_FRAME_COUNT = 1, 2
                    cv2.VideoCapture = lambda path: Capture()
                    cv2.VideoWriter, cv2.VideoWriter_fourcc = Writer, lambda *args: 0
                    modules = {"cv2": cv2, "numpy": types.SimpleNamespace(), "supervision": None,
                               "ultralytics": types.SimpleNamespace(YOLO=FakeYOLO)}
                    with patch.dict(sys.modules, modules), patch("vision.worker.Calibration", FakeCalibration), \
                            patch("vision.worker._ffmpeg_path", return_value=None):
                        result = run(config)
                    self.assertEqual(inference_frames, frames)
                    self.assertTrue(all(not frame.drawings for frame in frames))
                    self.assertTrue(all(rendered is not source and rendered.drawings
                                        for rendered, source in zip(written_frames, frames)))
                    self.assertEqual(len(written_frames), 3)
                    self.assertEqual(result["procesamiento"]["annotation_style"], style)
                    self.assertEqual(result["procesamiento"]["observaciones_tracking"], 3)
                    self.assertEqual(result["procesamiento"]["observaciones_en_cancha_y_calibradas"], 3)
                    self.assertEqual(json.loads((config.output_dir / "result.json").read_text(encoding="utf-8")), result)
                    comparable = json.loads(json.dumps(result))
                    comparable["procesamiento"].pop("annotation_style")
                    outcomes[style] = ((config.output_dir / "tracks.csv").read_bytes(), comparable, projected)
            self.assertEqual(outcomes["ellipses"], outcomes["boxes"])
            self.assertEqual(outcomes["ellipses"][2], [(40, 140), (42, 140), (44, 140)])
            self.assertEqual(outcomes["ellipses"][1]["metricas_por_track"][0]["distancia_observada_m"], 0.4)


if __name__ == "__main__":
    unittest.main()
