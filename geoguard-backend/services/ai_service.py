"""
AI Service — Simulates:
  1. Deepfake / image manipulation detection  (Intel FakeCatcher-style)
  2. YOLOv8 drone object detection result

In production, replace the stubs with real model calls.
"""

import asyncio
import random
import json
from pathlib import Path


async def run_deepfake_check(image_path: str | None) -> dict:
    """
    Simulate deepfake / EXIF noise analysis.
    Returns a score 0.0–1.0 (higher = more likely fake).

    Production: call Intel FakeCatcher API or a CNN served via TorchServe.
    """
    await asyncio.sleep(1.5)   # simulate inference latency

    if not image_path or not Path(image_path).exists():
        # No image submitted — pass with neutral score
        return {"score": 0.05, "passed": True, "message": "No image — text report accepted"}

    # Simulate: 90% of submissions pass
    score = random.uniform(0.0, 0.18) if random.random() < 0.9 else random.uniform(0.72, 0.99)
    passed = score < 0.5

    stages = [
        "EXIF metadata stripped",
        "Pixel noise analysis complete",
        f"FakeCatcher score: {score:.3f}",
        "GPS cross-reference done",
        "Encryption applied",
    ]

    return {
        "score": round(score, 4),
        "passed": passed,
        "stages": stages,
        "message": "Image appears genuine" if passed else "Possible manipulation detected — rejected",
    }


async def run_yolo_detection(image_path: str | None) -> dict:
    """
    Simulate YOLOv8 object detection on drone night-vision frame.

    Production: run inference on drone edge device (NVIDIA Jetson) via MQTT/WebSocket.
    """
    await asyncio.sleep(2.0)

    objects = [
        {"label": "excavator",   "confidence": 0.94, "bbox": [120, 80, 340, 260]},
        {"label": "dump_truck",  "confidence": 0.87, "bbox": [400, 150, 580, 290]},
        {"label": "person",      "confidence": 0.76, "bbox": [210, 200, 250, 310]},
        {"label": "mining_pit",  "confidence": 0.91, "bbox": [50,  300, 500, 480]},
    ]

    # Randomly return a subset to simulate real variability
    detected = random.sample(objects, k=random.randint(1, len(objects)))
    confirmed = any(o["label"] in ("excavator", "mining_pit") for o in detected)

    return {
        "confirmed_mining": confirmed,
        "detections": detected,
        "model": "YOLOv8n-edge",
        "inference_ms": random.randint(38, 90),
    }


async def simulate_satellite_alert() -> dict:
    """
    Simulate an ESA Sentinel-2 Change Detection event.
    Production: run a Change Detection CNN on Sentinel-2 NDVI bands.
    """
    await asyncio.sleep(0.5)
    return {
        "ndvi_delta": round(random.uniform(-0.45, -0.10), 3),
        "area_hectares": round(random.uniform(0.5, 5.0), 2),
        "confidence": round(random.uniform(0.80, 0.99), 3),
        "source": "ESA Sentinel-2",
        "band": "B08/B04 NDVI",
    }
