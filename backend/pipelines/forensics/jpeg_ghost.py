"""
Phase 1.1 Scaffold & Engine: Sherloq Multi-Quality JPEG Ghost Map & 2D Resampling Detector
==========================================================================================
Reference: GuidoBartoli/sherloq & Farid (2009) "Exposing Digital Forgeries from JPEG Ghosts"
"""

import base64
import io
from typing import Any, Dict, List

import cv2
import numpy as np
from PIL import Image


def _rgb_to_data_url(img_rgb: np.ndarray) -> str:
    pil_img = Image.fromarray(img_rgb)
    buf = io.BytesIO()
    pil_img.save(buf, format="PNG")
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode("ascii")


def compute_jpeg_ghost_map(
    img_rgb: np.ndarray,
    qualities: List[int] = [65, 75, 85, 92],
    smoothing_window: int = 17,
) -> Dict[str, Any]:
    """
    Sweeps across candidate JPEG qualities to detect spliced regions ("JPEG Ghosts")
    that were previously compressed at a lower quality than the host document page.
    """
    h, w, _ = img_rgb.shape
    orig_f = img_rgb.astype(np.float32)
    pil_orig = Image.fromarray(img_rgb)

    ghost_maps: List[Dict[str, Any]] = []
    best_ghost_score = 0.0
    best_quality = qualities[0]
    best_heatmap_url = ""

    for q in qualities:
        buf = io.BytesIO()
        pil_orig.save(buf, format="JPEG", quality=int(q))
        buf.seek(0)
        recomp = np.array(Image.open(buf).convert("RGB"), dtype=np.float32)

        # Spatially averaged squared difference across RGB channels
        diff_sq = np.mean((orig_f - recomp) ** 2, axis=2)
        smooth_diff = cv2.boxFilter(diff_sq, ddepth=-1, ksize=(smoothing_window, smoothing_window))

        # Normalize locally to isolate regions with anomalous compression minima/maxima
        min_v = float(np.min(smooth_diff))
        max_v = float(np.max(smooth_diff)) + 1e-5
        norm_map = ((smooth_diff - min_v) / (max_v - min_v) * 255.0).astype(np.uint8)

        cmap_bgr = cv2.applyColorMap(norm_map, cv2.COLORMAP_TURBO)
        cmap_rgb = cv2.cvtColor(cmap_bgr, cv2.COLOR_BGR2RGB)
        data_url = _rgb_to_data_url(cmap_rgb)

        contrast_ratio = float(np.percentile(smooth_diff, 98) / (np.median(smooth_diff) + 1e-4))
        if contrast_ratio > best_ghost_score:
            best_ghost_score = contrast_ratio
            best_quality = q
            best_heatmap_url = data_url

        ghost_maps.append(
            {
                "quality": q,
                "contrast_ratio": round(contrast_ratio, 2),
                "ghost_map_data_url": data_url,
            }
        )

    return {
        "dominant_splice_quality": best_quality,
        "peak_ghost_contrast": round(best_ghost_score, 2),
        "primary_ghost_heatmap_url": best_heatmap_url,
        "quality_sweep": ghost_maps,
    }


def compute_resampling_periodicity_map(
    img_rgb: np.ndarray, patch_size: int = 64
) -> Dict[str, Any]:
    """
    Detects 2D pixel interpolation / resampling traces (caused by resizing, rotating,
    or warping a pasted signature or seal) using the Laplacian residual + 2D FFT spectrum.
    """
    gray = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2GRAY).astype(np.float32)
    lap = cv2.Laplacian(gray, cv2.CV_32F, ksize=3)

    h, w = lap.shape
    rows = max(1, h // patch_size)
    cols = max(1, w // patch_size)
    periodicity_grid = np.zeros((rows, cols), dtype=np.float32)

    for r in range(rows):
        for c in range(cols):
            patch = lap[r * patch_size : (r + 1) * patch_size, c * patch_size : (c + 1) * patch_size]
            if patch.shape[0] < 16 or patch.shape[1] < 16:
                continue
            fft_mag = np.abs(np.fft.fftshift(np.fft.fft2(patch)))
            # Suppress DC center component
            cy, cx = fft_mag.shape[0] // 2, fft_mag.shape[1] // 2
            fft_mag[max(0, cy - 3) : cy + 4, max(0, cx - 3) : cx + 4] = 0.0
            peak_to_mean = float(np.max(fft_mag) / (np.mean(fft_mag) + 1e-5))
            periodicity_grid[r, c] = peak_to_mean

    med = float(np.median(periodicity_grid))
    flagged_patches = []
    for r in range(rows):
        for c in range(cols):
            score = float(periodicity_grid[r, c])
            if score > med * 1.65 and score > 8.5:
                flagged_patches.append(
                    {
                        "row": r,
                        "col": c,
                        "bbox": [
                            round((c * patch_size) / w, 4),
                            round((r * patch_size) / h, 4),
                            round(patch_size / w, 4),
                            round(patch_size / h, 4),
                        ],
                        "periodicity_score": round(score, 2),
                    }
                )

    flagged_patches.sort(key=lambda item: item["periodicity_score"], reverse=True)
    return {
        "patch_size": patch_size,
        "median_periodicity": round(med, 2),
        "resampled_patches": flagged_patches[:5],
    }
