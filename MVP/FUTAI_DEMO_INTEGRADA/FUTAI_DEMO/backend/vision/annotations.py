"""Presentation only: original tracking coordinates and frames remain untouched."""
from __future__ import annotations

import logging


# Stable colors per ByteTrack ID; colors do not imply teams or player identities.
PALETTE = ("#00D4FF", "#FFB454", "#C084FC", "#FF6B9D",
           "#FFE066", "#71E096", "#85A8FF", "#F4A7FF")
logger = logging.getLogger(__name__)


class VideoAnnotator:
    def __init__(self, style, cv2, np):
        if style not in ("ellipses", "boxes"):
            raise ValueError("annotation_style debe ser ellipses o boxes")
        self.style, self.cv2, self.np = style, cv2, np
        self._sv = None
        if style == "ellipses":
            try:
                import supervision as sv
                palette = sv.ColorPalette.from_hex(list(PALETTE))
                self._outline = sv.EllipseAnnotator(color=sv.Color.BLACK, thickness=4)
                self._ellipse = sv.EllipseAnnotator(color=palette, thickness=2,
                                                   color_lookup=sv.ColorLookup.TRACK)
                self._label = sv.LabelAnnotator(color=palette, color_lookup=sv.ColorLookup.TRACK,
                                                text_color=sv.Color.BLACK, text_scale=0.45,
                                                text_thickness=1, text_padding=3,
                                                text_position=sv.Position.TOP_CENTER, border_radius=3)
                self._sv = sv
            except (ImportError, AttributeError, TypeError, OSError) as exc:
                logger.info("Supervision no disponible/compatible; anotación OpenCV: %s", exc)

    def annotate(self, frame, tracks):
        if not tracks:
            return frame
        scene = frame.copy()
        if self._sv is not None:
            try:
                detections = self._sv.Detections(
                    xyxy=self.np.array([box for box, _ in tracks], dtype=float),
                    tracker_id=self.np.array([track_id for _, track_id in tracks], dtype=self.np.int64),
                    class_id=self.np.zeros(len(tracks), dtype=self.np.int32),
                )
                scene = self._outline.annotate(scene=scene, detections=detections)
                scene = self._ellipse.annotate(scene=scene, detections=detections)
                return self._label.annotate(scene=scene, detections=detections,
                                            labels=[f"ID {track_id}" for _, track_id in tracks])
            except (AttributeError, TypeError, ValueError, ImportError) as exc:
                logger.warning("Anotador Supervision incompatible; usando OpenCV: %s", exc)
                self._sv = None
                scene = frame.copy()
        for box, track_id in tracks:
            self._draw_opencv(scene, box, track_id)
        return scene

    def _draw_opencv(self, scene, box, track_id):
        cv2 = self.cv2
        x1, y1, x2, y2 = map(int, box)
        rgb = PALETTE[track_id % len(PALETTE)].lstrip("#")
        color = tuple(int(rgb[index:index + 2], 16) for index in (4, 2, 0))
        if self.style == "ellipses":
            center = (int((box[0] + box[2]) / 2), y2)
            width = max(1, x2 - x1)
            axes = (width, max(1, int(0.35 * width)))
            for thickness, stroke in ((4, (0, 0, 0)), (2, color)):
                cv2.ellipse(scene, center, axes, 0, -45, 235, stroke, thickness, cv2.LINE_AA)
        else:
            cv2.rectangle(scene, (x1, y1), (x2, y2), (0, 0, 0), 4, cv2.LINE_AA)
            cv2.rectangle(scene, (x1, y1), (x2, y2), color, 2, cv2.LINE_AA)

        label = f"ID {track_id}"
        (text_width, text_height), baseline = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.45, 1)
        height, width = scene.shape[:2]
        left = max(0, min(width - text_width - 6, int((x1 + x2 - text_width) / 2) - 3))
        top = max(0, min(height - text_height - baseline - 6, y1 - text_height - baseline - 8))
        cv2.rectangle(scene, (left, top),
                      (min(width - 1, left + text_width + 6), min(height - 1, top + text_height + baseline + 6)),
                      color, -1)
        cv2.putText(scene, label, (left + 3, top + text_height + 3), cv2.FONT_HERSHEY_SIMPLEX,
                    0.45, (0, 0, 0), 1, cv2.LINE_AA)
