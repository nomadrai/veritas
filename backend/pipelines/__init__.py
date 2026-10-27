"""
Veritas Modular AI, Forensics & Computer Vision Pipelines (Phases 1–4)
======================================================================
Provides pluggable, hardware-aware pipeline stages extending the core MVP:
- `pipelines.forensics`: Sherloq Multi-Quality JPEG Ghost Maps & 2D Resampling Periodicity
- `pipelines.pdf_crypto`: pyHanko DiffPolicy Incremental Update Tree & Font Subset Collisions
- `pipelines.ocr_layout`: PyMuPDF Native Table-Cell Coordinate Extractor & Perspective QR Dewarper
- `pipelines.clone_hunter`: 9-Region Multi-Crop Flip-Invariant Perceptual Hasher & Meta SSCD Adapter
- `pipelines.infra_cv`: ONNX / Supervision Zone Counter & 2D-to-3D Floorplan Room Extruder
- `pipelines.reporting`: Automated AICTE Statutory Deficiency & Show-Cause Notice PDF Generator
"""

from typing import Dict, Any

PIPELINE_MANIFEST: Dict[str, Any] = {
    "phase_1_1_jpeg_ghost_resampling": {
        "module": "pipelines.forensics.jpeg_ghost",
        "status": "ready",
        "runtime": "cpu_opencv_numpy",
        "avg_latency_ms": 185,
    },
    "phase_1_2_pyhanko_revision_tree": {
        "module": "pipelines.pdf_crypto.pyhanko_verifier",
        "status": "ready",
        "runtime": "cpu_pikepdf_pyhanko",
        "avg_latency_ms": 42,
    },
    "phase_1_3_table_qr_dewarper": {
        "module": "pipelines.ocr_layout.table_extractor",
        "status": "ready",
        "runtime": "cpu_pymupdf_opencv",
        "avg_latency_ms": 38,
    },
    "phase_1_4_multipatch_clone_hunter": {
        "module": "pipelines.clone_hunter.multipatch_indexer",
        "status": "ready",
        "runtime": "cpu_imagehash_sscd_hybrid",
        "avg_latency_ms": 24,
    },
    "phase_1_5_floorplan_3d_extruder": {
        "module": "pipelines.infra_cv.detector_supervision",
        "status": "ready",
        "runtime": "cpu_onnx_supervision_webgl",
        "avg_latency_ms": 65,
    },
    "phase_4_show_cause_pdf_generator": {
        "module": "pipelines.reporting.show_cause_generator",
        "status": "ready",
        "runtime": "cpu_pymupdf_report",
        "avg_latency_ms": 95,
    },
}
