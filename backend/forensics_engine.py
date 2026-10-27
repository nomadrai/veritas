import base64
import io
import json
import re
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import cv2
import numpy as np
import pikepdf
import pymupdf
from PIL import Image

from pipelines.forensics import compute_jpeg_ghost_map, compute_resampling_periodicity_map
from pipelines.pdf_crypto import inspect_pdf_revision_tree_and_signatures


def _np_to_base64_png(img_rgb: np.ndarray) -> str:
    pil_img = Image.fromarray(img_rgb)
    buf = io.BytesIO()
    pil_img.save(buf, format="JPEG", quality=84)
    return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode("ascii")


def render_document_page_rgb(file_path: str, page_num: int = 0, dpi: int = 150) -> np.ndarray:
    path = Path(file_path)
    if path.suffix.lower() == ".pdf":
        doc = pymupdf.open(str(path))
        page = doc[min(page_num, len(doc) - 1)]
        pix = page.get_pixmap(dpi=dpi, alpha=False)
        img = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, 3)
        doc.close()
        return img.copy()
    else:
        pil_img = Image.open(str(path)).convert("RGB")
        return np.array(pil_img)


def compute_ela_analysis(
    img_rgb: np.ndarray, quality: int = 90, scale: int = 18
) -> Dict[str, Any]:
    """
    Runs real Error Level Analysis (ELA) by re-encoding at JPEG `quality`,
    computing pixel-wise absolute difference, amplifying by `scale`,
    and clustering 16x16 block energy outliers into bounding boxes.
    """
    h, w, _ = img_rgb.shape
    pil_orig = Image.fromarray(img_rgb)
    buf = io.BytesIO()
    pil_orig.save(buf, format="JPEG", quality=max(30, min(98, int(quality))))
    buf.seek(0)
    pil_recomp = Image.open(buf).convert("RGB")
    img_recomp = np.array(pil_recomp)

    diff = cv2.absdiff(img_rgb, img_recomp).astype(np.float32)
    ela_raw = np.clip(diff * float(scale), 0, 255).astype(np.uint8)

    # Compute grayscale error energy for heatmap and block outlier localization
    ela_gray = np.mean(diff, axis=2)
    ela_norm = np.clip(ela_gray * float(scale) * 1.4, 0, 255).astype(np.uint8)
    heatmap_bgr = cv2.applyColorMap(ela_norm, cv2.COLORMAP_INFERNO)
    heatmap_rgb = cv2.cvtColor(heatmap_bgr, cv2.COLOR_BGR2RGB)

    # Blend heatmap with darkened original specimen for optical light-table overlay
    dark_specimen = (img_rgb.astype(np.float32) * 0.28).astype(np.uint8)
    blended_rgb = cv2.addWeighted(dark_specimen, 0.45, heatmap_rgb, 0.85, 0)

    # Block-level (16x16) statistical outlier detection
    block_size = 16
    bh = max(1, h // block_size)
    bw = max(1, w // block_size)
    cropped = ela_gray[: bh * block_size, : bw * block_size]
    blocks = cropped.reshape(bh, block_size, bw, block_size).mean(axis=(1, 3))

    mean_energy = float(np.mean(blocks))
    std_energy = float(np.std(blocks)) + 1e-5
    max_energy = float(np.max(blocks))

    # Threshold blocks with z-score > 3.1 and absolute mean diff > 5.0
    z_grid = (blocks - mean_energy) / std_energy
    mask = ((z_grid > 3.1) & (blocks > 5.0)).astype(np.uint8) * 255

    # Morphological dilation to group adjacent tampered blocks
    kernel = np.ones((2, 2), np.uint8)
    mask_dilated = cv2.dilate(mask, kernel, iterations=1)
    contours, _ = cv2.findContours(mask_dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    hotspots: List[Dict[str, Any]] = []
    for cnt in contours:
        bx, by, bw_c, bh_c = cv2.boundingRect(cnt)
        region_z = float(np.max(z_grid[by : by + bh_c, bx : bx + bw_c]))
        region_energy = float(np.mean(blocks[by : by + bh_c, bx : bx + bw_c]))
        if bw_c * bh_c < 1 and region_z < 3.4:
            continue
        x_norm = round((bx * block_size) / w, 4)
        y_norm = round((by * block_size) / h, 4)
        w_norm = round(min(1.0 - x_norm, (bw_c * block_size) / w), 4)
        h_norm = round(min(1.0 - y_norm, (bh_c * block_size) / h), 4)
        hotspots.append(
            {
                "bbox": [x_norm, y_norm, w_norm, h_norm],
                "z_score": round(region_z, 2),
                "mean_error_level": round(region_energy, 2),
                "confidence": round(min(0.99, 0.65 + (region_z - 2.5) * 0.08), 2),
            }
        )

    hotspots.sort(key=lambda item: item["z_score"], reverse=True)

    return {
        "quality": quality,
        "scale": scale,
        "mean_error": round(mean_energy, 3),
        "std_error": round(std_energy, 3),
        "max_block_error": round(max_energy, 3),
        "ela_heatmap_data_url": _np_to_base64_png(blended_rgb),
        "ela_raw_data_url": _np_to_base64_png(ela_raw),
        "hotspots": hotspots[:6],
    }


def compute_noise_variance_grid(img_rgb: np.ndarray, grid_size: int = 8) -> Dict[str, Any]:
    """
    Mahdian & Saic / Splicebuster high-frequency Laplacian noise variance analysis
    across an 8x8 spatial grid to detect spliced patches or digital white-out regions.
    """
    gray = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2GRAY).astype(np.float32)
    lap = cv2.Laplacian(gray, cv2.CV_32F, ksize=3)
    h, w = gray.shape
    gh = h // grid_size
    gw = w // grid_size

    variances = np.zeros((grid_size, grid_size), dtype=np.float32)
    for r in range(grid_size):
        for c in range(grid_size):
            patch = lap[r * gh : (r + 1) * gh, c * gw : (c + 1) * gw]
            variances[r, c] = float(np.std(patch))

    median_var = float(np.median(variances))
    mad = float(np.median(np.abs(variances - median_var))) + 1e-4

    anomalous_cells: List[Dict[str, Any]] = []
    for r in range(grid_size):
        for c in range(grid_size):
            dev = abs(float(variances[r, c]) - median_var) / mad
            if dev > 3.2:
                anomalous_cells.append(
                    {
                        "row": r,
                        "col": c,
                        "bbox": [
                            round(c / grid_size, 4),
                            round(r / grid_size, 4),
                            round(1.0 / grid_size, 4),
                            round(1.0 / grid_size, 4),
                        ],
                        "noise_sigma": round(float(variances[r, c]), 2),
                        "deviation_score": round(dev, 2),
                    }
                )

    return {
        "grid_size": grid_size,
        "median_noise_sigma": round(median_var, 2),
        "grid_values": [[round(float(v), 2) for v in row] for row in variances],
        "anomalous_cells": anomalous_cells[:6],
    }


def detect_copy_move_sift(img_rgb: np.ndarray) -> List[Dict[str, Any]]:
    """
    SIFT Keypoint + Lowe's Ratio Test + Spatial Displacement Vector Clustering
    to detect Copy-Move Forgery (e.g., cloned official stamps, signatures, or equipment).
    """
    gray = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2GRAY)
    h, w = gray.shape
    sift = cv2.SIFT_create(nfeatures=350)
    keypoints, descriptors = sift.detectAndCompute(gray, None)

    if descriptors is None or len(keypoints) < 10:
        return []

    bf = cv2.BFMatcher(cv2.NORM_L2)
    knn_matches = bf.knnMatch(descriptors, descriptors, k=4)

    candidate_pairs: List[Tuple[Tuple[float, float], Tuple[float, float], Tuple[int, int]]] = []
    min_spatial_dist = max(40.0, min(w, h) * 0.06)

    for matches in knn_matches:
        # matches[0] is self-match (distance 0); check matches[1] and matches[2]
        valid_non_self = []
        pt1 = keypoints[matches[0].queryIdx].pt
        for m in matches[1:]:
            pt2 = keypoints[m.trainIdx].pt
            spatial_d = np.hypot(pt1[0] - pt2[0], pt1[1] - pt2[1])
            if spatial_d >= min_spatial_dist:
                valid_non_self.append((m, pt2, spatial_d))

        if len(valid_non_self) >= 1:
            best_m, pt2, _ = valid_non_self[0]
            # Lowe's ratio or absolute descriptor similarity check
            second_dist = valid_non_self[1][0].distance if len(valid_non_self) > 1 else 250.0
            if best_m.distance < 95.0 and (best_m.distance < 0.78 * second_dist or best_m.distance < 35.0):
                # Canonicalize direction so (pA -> pB) has dx >= 0
                if pt1[0] <= pt2[0]:
                    pA, pB = pt1, pt2
                else:
                    pA, pB = pt2, pt1
                dx_bin = int(round((pB[0] - pA[0]) / 18.0))
                dy_bin = int(round((pB[1] - pA[1]) / 18.0))
                candidate_pairs.append((pA, pB, (dx_bin, dy_bin)))

    if not candidate_pairs:
        return []

    # Group by quantized displacement vector
    clusters: Dict[Tuple[int, int], List[Tuple[Tuple[float, float], Tuple[float, float]]]] = {}
    for pA, pB, vec_bin in candidate_pairs:
        clusters.setdefault(vec_bin, []).append((pA, pB))

    clone_regions: List[Dict[str, Any]] = []
    for vec_bin, pairs in clusters.items():
        if len(pairs) >= 7:
            src_pts = np.array([p[0] for p in pairs])
            dst_pts = np.array([p[1] for p in pairs])
            if np.std(src_pts[:, 0]) < 4.0 and np.std(src_pts[:, 1]) < 4.0:
                continue
            pad_x = w * 0.025
            pad_y = h * 0.025

            sx0 = max(0.0, float(np.min(src_pts[:, 0]) - pad_x)) / w
            sy0 = max(0.0, float(np.min(src_pts[:, 1]) - pad_y)) / h
            sx1 = min(float(w), float(np.max(src_pts[:, 0]) + pad_x)) / w
            sy1 = min(float(h), float(np.max(src_pts[:, 1]) + pad_y)) / h

            dx0 = max(0.0, float(np.min(dst_pts[:, 0]) - pad_x)) / w
            dy0 = max(0.0, float(np.min(dst_pts[:, 1]) - pad_y)) / h
            dx1 = min(float(w), float(np.max(dst_pts[:, 0]) + pad_x)) / w
            dy1 = min(float(h), float(np.max(dst_pts[:, 1]) + pad_y)) / h

            clone_regions.append(
                {
                    "source_bbox": [round(sx0, 4), round(sy0, 4), round(sx1 - sx0, 4), round(sy1 - sy0, 4)],
                    "target_bbox": [round(dx0, 4), round(dy0, 4), round(dx1 - dx0, 4), round(dy1 - dy0, 4)],
                    "matched_keypoints": len(pairs),
                    "confidence": round(min(0.99, 0.72 + len(pairs) * 0.025), 2),
                }
            )

    clone_regions.sort(key=lambda c: c["matched_keypoints"], reverse=True)
    return clone_regions[:3]


def decode_qr_codes(img_rgb: np.ndarray) -> List[Dict[str, Any]]:
    """
    Decodes QR codes from a rendered document image using OpenCV QRCodeDetector
    with multi-pass preprocessing (raw, grayscale, adaptive/Otsu threshold).
    Returns decoded payload + normalized bounding box [x, y, w, h].
    """
    h, w, _ = img_rgb.shape
    detector = cv2.QRCodeDetector()
    gray = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2GRAY)
    _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

    results: List[Dict[str, Any]] = []
    for candidate_img in [img_rgb, gray, thresh]:
        try:
            retval, decoded_info, points, _ = detector.detectAndDecodeMulti(candidate_img)
            if retval and points is not None:
                for text, pts in zip(decoded_info, points):
                    if not text:
                        continue
                    xs = pts[:, 0]
                    ys = pts[:, 1]
                    x0 = max(0.0, float(np.min(xs))) / w
                    y0 = max(0.0, float(np.min(ys))) / h
                    x1 = min(float(w), float(np.max(xs))) / w
                    y1 = min(float(h), float(np.max(ys))) / h
                    parsed: Any = text
                    try:
                        parsed = json.loads(text)
                    except Exception:
                        pass
                    results.append(
                        {
                            "raw_text": text,
                            "payload": parsed,
                            "bbox": [round(x0, 4), round(y0, 4), round(x1 - x0, 4), round(y1 - y0, 4)],
                        }
                    )
                if results:
                    break
        except Exception:
            pass

        # Single QR code fallback
        try:
            text, pts, _ = detector.detectAndDecode(candidate_img)
            if text and pts is not None:
                pts_2d = pts[0] if pts.ndim == 3 else pts
                xs = pts_2d[:, 0]
                ys = pts_2d[:, 1]
                x0 = max(0.0, float(np.min(xs))) / w
                y0 = max(0.0, float(np.min(ys))) / h
                x1 = min(float(w), float(np.max(xs))) / w
                y1 = min(float(h), float(np.max(ys))) / h
                parsed = text
                try:
                    parsed = json.loads(text)
                except Exception:
                    pass
                results.append(
                    {
                        "raw_text": text,
                        "payload": parsed,
                        "bbox": [round(x0, 4), round(y0, 4), round(x1 - x0, 4), round(y1 - y0, 4)],
                    }
                )
                break
        except Exception:
            pass

    return results


def inspect_pdf_forensics(file_path: str) -> Dict[str, Any]:
    """
    Deep PDF structural, metadata, incremental update, digital signature,
    and span-level font consistency inspection using PyMuPDF and pikepdf.
    """
    path = Path(file_path)
    if path.suffix.lower() != ".pdf":
        return {
            "is_pdf": False,
            "eof_markers": 0,
            "incremental_updates": 0,
            "producer": "Image Container",
            "creator": "Camera/Scanner",
            "creation_date": None,
            "mod_date": None,
            "has_digital_signature": False,
            "font_anomalies": [],
            "text_spans": [],
        }

    raw_bytes = path.read_bytes()
    eof_count = len(re.findall(rb"%%EOF", raw_bytes))
    has_sig_bytes = b"/Type /Sig" in raw_bytes or b"/SubFilter /adbe.pkcs7" in raw_bytes

    doc = pymupdf.open(str(path))
    meta = doc.metadata or {}

    pikepdf_info: Dict[str, str] = {}
    try:
        with pikepdf.open(str(path)) as pdf:
            for k, v in pdf.docinfo.items():
                pikepdf_info[str(k)] = str(v)
    except Exception:
        pass

    producer = pikepdf_info.get("/Producer") or meta.get("producer") or "Unknown"
    creator = pikepdf_info.get("/Creator") or meta.get("creator") or "Unknown"
    creation_date = pikepdf_info.get("/CreationDate") or meta.get("creationDate") or ""
    mod_date = pikepdf_info.get("/ModDate") or meta.get("modDate") or ""

    # Span-level font & coordinate extraction on Page 1
    page = doc[0]
    pw, ph = page.rect.width, page.rect.height
    text_dict = page.get_text("dict")

    font_counts: Dict[str, int] = {}
    spans_list: List[Dict[str, Any]] = []

    for block in text_dict.get("blocks", []):
        if block.get("type") != 0:
            continue
        for line in block.get("lines", []):
            for span in line.get("spans", []):
                txt = span.get("text", "").strip()
                if not txt:
                    continue
                font_name = span.get("font", "Unknown")
                font_size = round(float(span.get("size", 10.0)), 1)
                bbox = span.get("bbox", [0, 0, 0, 0])
                norm_bbox = [
                    round(bbox[0] / pw, 4),
                    round(bbox[1] / ph, 4),
                    round((bbox[2] - bbox[0]) / pw, 4),
                    round((bbox[3] - bbox[1]) / ph, 4),
                ]
                font_counts[font_name] = font_counts.get(font_name, 0) + len(txt)
                spans_list.append(
                    {
                        "text": txt,
                        "font": font_name,
                        "size": font_size,
                        "color": span.get("color", 0),
                        "bbox": norm_bbox,
                    }
                )

    dominant_font = max(font_counts.items(), key=lambda kv: kv[1])[0] if font_counts else "Helvetica"
    font_anomalies: List[Dict[str, Any]] = []
    for sp in spans_list:
        # Flag rare fonts used on numbers/dates or Courier/Mono injected into proportional text
        if sp["font"] != dominant_font and font_counts.get(sp["font"], 0) < 35:
            if any(ch.isdigit() for ch in sp["text"]):
                font_anomalies.append(
                    {
                        "text": sp["text"],
                        "detected_font": sp["font"],
                        "expected_font": dominant_font,
                        "font_size": sp["size"],
                        "bbox": sp["bbox"],
                        "reason": f"Span '{sp['text']}' rendered in '{sp['font']}' ({sp['size']}pt) whereas surrounding document body uses '{dominant_font}'.",
                    }
                )

    doc.close()

    suspicious_software = any(
        kw in (producer + " " + creator).lower()
        for kw in ["photoshop", "illustrator", "gimp", "canva", "ilovepdf", "sejda", "phantompdf"]
    )

    return {
        "is_pdf": True,
        "eof_markers": eof_count,
        "incremental_updates": max(0, eof_count - 1),
        "producer": producer,
        "creator": creator,
        "creation_date": creation_date,
        "mod_date": mod_date,
        "date_mismatch": bool(creation_date and mod_date and creation_date != mod_date),
        "suspicious_editing_software": suspicious_software,
        "has_digital_signature": has_sig_bytes,
        "dominant_font": dominant_font,
        "font_distribution": font_counts,
        "font_anomalies": font_anomalies,
        "text_spans": spans_list,
    }


def run_full_document_xray(
    file_path: str,
    quality: int = 90,
    scale: int = 18,
) -> Dict[str, Any]:
    """
    Executes the full 3-Layer X-Ray Document Forensics pipeline on any PDF or image file:
    1. QR-vs-OCR Cross-Lock
    2. PDF Metadata, Incremental Update & Font Span Inspection
    3. ELA Heatmap + Noise Variance Grid + SIFT Copy-Move Detection
    """
    img_rgb = render_document_page_rgb(file_path, page_num=0, dpi=150)
    specimen_data_url = _np_to_base64_png(img_rgb)

    qr_codes = decode_qr_codes(img_rgb)
    pdf_forensics = inspect_pdf_forensics(file_path)
    ela_result = compute_ela_analysis(img_rgb, quality=quality, scale=scale)
    noise_result = compute_noise_variance_grid(img_rgb, grid_size=8)
    copy_move_regions = detect_copy_move_sift(img_rgb)
    jpeg_ghost = compute_jpeg_ghost_map(img_rgb)
    resampling = compute_resampling_periodicity_map(img_rgb)
    revision_tree = inspect_pdf_revision_tree_and_signatures(file_path)

    # Perform automatic QR-vs-OCR Cross-Lock comparison against extracted PDF text spans
    qr_ocr_discrepancies: List[Dict[str, Any]] = []
    full_ocr_text = " ".join(sp["text"] for sp in pdf_forensics.get("text_spans", []))

    for qr in qr_codes:
        payload = qr.get("payload")
        if isinstance(payload, dict):
            # Check approved_intake
            if "approved_intake" in payload:
                qr_intake = str(payload["approved_intake"])
                # Find intake line in text spans
                for sp in pdf_forensics.get("text_spans", []):
                    m = re.search(r"\b(60|120|180|240|300)\b", sp["text"])
                    if m and ("intake" in full_ocr_text.lower()):
                        printed_val = m.group(1)
                        if printed_val != qr_intake and (
                            "intake" in sp["text"].lower() or sp["text"].strip().isdigit()
                        ):
                            qr_ocr_discrepancies.append(
                                {
                                    "field": "Approved Intake",
                                    "qr_value": qr_intake,
                                    "ocr_printed_value": printed_val,
                                    "qr_bbox": qr["bbox"],
                                    "ocr_bbox": sp["bbox"],
                                    "severity": "CRITICAL",
                                    "explanation": f"Embedded QR cryptographic payload specifies Approved Intake = {qr_intake}, but printed OCR text on certificate face reads {printed_val}.",
                                }
                            )
            # Check valid_upto / expiry_date
            if "valid_upto" in payload:
                qr_date = str(payload["valid_upto"])
                if qr_date not in full_ocr_text:
                    # Find printed date span that conflicts
                    for sp in pdf_forensics.get("text_spans", []):
                        if re.search(r"202[6-9]-\d{2}-\d{2}|\d{2}-\d{2}-202[6-9]", sp["text"]):
                            qr_ocr_discrepancies.append(
                                {
                                    "field": "Certificate Validity / Expiry Date",
                                    "qr_value": qr_date,
                                    "ocr_printed_value": sp["text"],
                                    "qr_bbox": qr["bbox"],
                                    "ocr_bbox": sp["bbox"],
                                    "severity": "CRITICAL",
                                    "explanation": f"QR payload states validity expires on {qr_date}, whereas printed document text displays {sp['text']}.",
                                }
                            )

    return {
        "specimen_data_url": specimen_data_url,
        "dimensions": {"width": int(img_rgb.shape[1]), "height": int(img_rgb.shape[0])},
        "qr_codes": qr_codes,
        "qr_ocr_discrepancies": qr_ocr_discrepancies,
        "pdf_forensics": pdf_forensics,
        "ela": ela_result,
        "noise_grid": noise_result,
        "copy_move_regions": copy_move_regions,
        "jpeg_ghost": jpeg_ghost,
        "resampling": resampling,
        "revision_tree": revision_tree,
    }
