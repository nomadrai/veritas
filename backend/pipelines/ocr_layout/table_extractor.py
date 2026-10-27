"""
Phase 1.3 Scaffold & Engine: PyMuPDF Table-Cell Coordinate Extractor & Perspective QR Dewarper
==============================================================================================
Reference: pymupdf/PyMuPDF `find_tables()` & Eric-Canas/QReader homography preprocessing
"""

import json
from pathlib import Path
from typing import Any, Dict, List

import cv2
import numpy as np
import pymupdf


def extract_pdf_tables_with_bboxes(file_path: str, page_num: int = 0) -> List[Dict[str, Any]]:
    """
    Uses PyMuPDF's native `page.find_tables()` engine to extract structured table rows,
    columns, and normalized `[x, y, w, h]` cell bounding boxes without requiring a GPU.
    """
    path = Path(file_path)
    if not path.exists() or path.suffix.lower() != ".pdf":
        return []

    doc = pymupdf.open(str(path))
    page = doc[min(page_num, len(doc) - 1)]
    pw, ph = page.rect.width, page.rect.height

    extracted_tables: List[Dict[str, Any]] = []
    try:
        tabs = page.find_tables()
        for t_idx, tab in enumerate(tabs.tables):
            tb = tab.bbox
            extracted_tables.append(
                {
                    "table_index": t_idx,
                    "bbox": [
                        round(tb[0] / pw, 4),
                        round(tb[1] / ph, 4),
                        round((tb[2] - tb[0]) / pw, 4),
                        round((tb[3] - tb[1]) / ph, 4),
                    ],
                    "row_count": tab.row_count,
                    "col_count": tab.col_count,
                    "rows": tab.extract(),
                }
            )
    except Exception:
        pass
    finally:
        doc.close()

    return extracted_tables


def dewarp_and_decode_qr(img_rgb: np.ndarray) -> List[Dict[str, Any]]:
    """
    Enhances tilted, low-contrast, or stamped QR codes using CLAHE local contrast
    normalization + perspective homography dewarping (`cv2.warpPerspective`) before decoding.
    """
    h, w, _ = img_rgb.shape
    gray = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2GRAY)
    clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))
    enhanced = clahe.apply(gray)

    detector = cv2.QRCodeDetector()
    decoded_items: List[Dict[str, Any]] = []

    for candidate in (enhanced, gray, img_rgb):
        retval, points = detector.detect(candidate)
        if retval and points is not None:
            pts = points[0].astype(np.float32) if points.ndim == 3 else points.astype(np.float32)
            # Perspective dewarp onto a canonical 240x240 square
            dst_pts = np.array(
                [[0, 0], [239, 0], [239, 239], [0, 239]], dtype=np.float32
            )
            M = cv2.getPerspectiveTransform(pts, dst_pts)
            dewarped = cv2.warpPerspective(enhanced, M, (240, 240))

            text, _ = detector.decode(candidate, points)
            if not text:
                text, _, _ = detector.detectAndDecode(dewarped)

            if text:
                xs = pts[:, 0]
                ys = pts[:, 1]
                x0, y0 = float(np.min(xs)) / w, float(np.min(ys)) / h
                x1, y1 = float(np.max(xs)) / w, float(np.max(ys)) / h
                payload: Any = text
                try:
                    payload = json.loads(text)
                except Exception:
                    pass
                decoded_items.append(
                    {
                        "raw_text": text,
                        "payload": payload,
                        "dewarped": True,
                        "bbox": [round(x0, 4), round(y0, 4), round(x1 - x0, 4), round(y1 - y0, 4)],
                    }
                )
                break

    return decoded_items
