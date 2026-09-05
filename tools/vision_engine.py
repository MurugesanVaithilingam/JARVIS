"""Desktop screen capture for multimodal vision analysis."""

import base64
import os

from PIL import ImageGrab


def capture_and_encode_screen() -> str:
    """Captures the primary monitor and returns a base64 JPEG string."""
    screenshot_path = "temp_screen.jpg"
    screenshot = ImageGrab.grab()
    screenshot = screenshot.convert("RGB")
    screenshot.save(screenshot_path, "JPEG", quality=75)

    with open(screenshot_path, "rb") as image_file:
        base64_string = base64.b64encode(image_file.read()).decode("utf-8")

    if os.path.exists(screenshot_path):
        os.remove(screenshot_path)

    return base64_string


def computer_vision_scan(mode: str = "auto") -> str:
    """Optional OpenCV / YOLO / OCR. Falls back to screen capture description."""
    notes = []
    try:
        import cv2

        cam = cv2.VideoCapture(0)
        ok, frame = cam.read()
        cam.release()
        if not ok or frame is None:
            notes.append("Camera frame unavailable.")
        else:
            h, w = frame.shape[:2]
            notes.append(f"Captured camera frame {w}x{h}.")
            try:
                from ultralytics import YOLO

                model = YOLO("yolov8n.pt")
                results = model(frame, verbose=False)
                labels = []
                for r in results:
                    if r.boxes is not None:
                        for cls_id in r.boxes.cls.tolist():
                            labels.append(r.names[int(cls_id)])
                notes.append("YOLOv8 objects: " + (", ".join(labels) if labels else "none"))
            except Exception as exc:
                notes.append(f"YOLOv8 not loaded ({exc}).")
            try:
                import pytesseract

                gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                ocr = pytesseract.image_to_string(gray).strip()
                notes.append("OCR: " + (ocr[:240] or "no text"))
            except Exception as exc:
                notes.append(f"Tesseract OCR not loaded ({exc}).")
    except Exception as exc:
        notes.append(f"OpenCV camera path skipped ({exc}). Using screen capture fallback.")
        try:
            capture_and_encode_screen()
            notes.append("Screen JPEG captured for LLM vision analysis.")
        except Exception as shot:
            notes.append(f"Screen capture failed: {shot}")
    return "Computer vision scan: " + " ".join(notes)
