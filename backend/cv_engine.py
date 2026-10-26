import base64
import io
import json
import math
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import cv2
import exifread
import imagehash
import numpy as np
from PIL import Image

from database import get_connection
from forensics_engine import _np_to_base64_png, compute_ela_analysis


def haversine_distance_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculates great-circle Haversine distance in meters between two WGS84 coordinates.
    """
    r_earth = 6371000.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)

    a = (
        math.sin(dphi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return round(r_earth * c, 1)


def _dms_to_decimal(dms_values: Any, ref: str) -> Optional[float]:
    try:
        vals = dms_values.values
        deg = float(vals[0].num) / float(vals[0].den)
        minutes = float(vals[1].num) / float(vals[1].den)
        seconds = float(vals[2].num) / float(vals[2].den)
        dec = deg + (minutes / 60.0) + (seconds / 3600.0)
        if ref in ("S", "W"):
            dec = -dec
        return round(dec, 6)
    except Exception:
        return None


def extract_exif_and_verify_gps(
    file_path: str,
    campus_lat: float,
    campus_lng: float,
    campus_radius_m: float = 500.0,
) -> Dict[str, Any]:
    """
    Extracts EXIF metadata and GPS tags using `exifread`, and verifies whether the photo
    was captured inside the institution's registered AICTE campus boundary.
    """
    with open(file_path, "rb") as f:
        tags = exifread.process_file(f, details=False)

    lat = None
    lng = None
    if "GPS GPSLatitude" in tags and "GPS GPSLatitudeRef" in tags:
        lat = _dms_to_decimal(tags["GPS GPSLatitude"], str(tags["GPS GPSLatitudeRef"]))
    if "GPS GPSLongitude" in tags and "GPS GPSLongitudeRef" in tags:
        lng = _dms_to_decimal(tags["GPS GPSLongitude"], str(tags["GPS GPSLongitudeRef"]))

    make = str(tags.get("Image Make", "Unknown Camera")).strip()
    model = str(tags.get("Image Model", "Unknown Model")).strip()
    software = str(tags.get("Image Software", "Native Camera Firmware")).strip()
    timestamp = str(
        tags.get("EXIF DateTimeOriginal") or tags.get("Image DateTime") or "Missing Timestamp"
    ).strip()

    distance_m: Optional[float] = None
    geo_status = "MISSING_EXIF_GPS"
    explanation = "No GPS EXIF coordinates embedded in image header."

    if lat is not None and lng is not None:
        distance_m = haversine_distance_m(lat, lng, campus_lat, campus_lng)
        if distance_m <= campus_radius_m:
            geo_status = "VERIFIED_ON_CAMPUS"
            explanation = (
                f"GPS coordinates ({lat:.4f}° N, {lng:.4f}° E) fall {distance_m:.1f}m from "
                f"registered campus center (within {campus_radius_m:.0f}m APH boundary)."
            )
        else:
            geo_status = "OUTSIDE_CAMPUS_BOUNDARY"
            dist_str = f"{distance_m / 1000.0:.1f} km" if distance_m >= 1000 else f"{distance_m:.1f} m"
            explanation = (
                f"CRITICAL GEO-TEMPORAL ANOMALY: Photo GPS ({lat:.4f}° N, {lng:.4f}° E) is "
                f"{dist_str} away from registered AICTE campus ({campus_lat:.4f}° N, {campus_lng:.4f}° E)."
            )

    return {
        "lat": lat,
        "lng": lng,
        "campus_lat": campus_lat,
        "campus_lng": campus_lng,
        "allowed_radius_m": campus_radius_m,
        "distance_m": distance_m,
        "geo_status": geo_status,
        "camera_make": make,
        "camera_model": model,
        "software": software,
        "captured_at": timestamp,
        "explanation": explanation,
    }


def compute_hashes_and_embedding(file_path: str) -> Dict[str, Any]:
    """
    Computes 64-bit Perceptual Hash (pHash), Difference Hash (dHash), Average Hash (aHash),
    Wavelet Hash (wHash), plus a 128-D L2-normalized spatial color + edge embedding vector
    compatible with PostgreSQL `pgvector` cosine search.
    """
    pil_img = Image.open(file_path).convert("RGB")
    ph = str(imagehash.phash(pil_img))
    dh = str(imagehash.dhash(pil_img))
    ah = str(imagehash.average_hash(pil_img))
    wh = str(imagehash.whash(pil_img))

    # Compute 128-D visual feature vector:
    # 4x4 spatial grid x (6 RGB mean/std channels + 2 Sobel gradient magnitude/orientation moments) = 128 dims
    img_np = np.array(pil_img.resize((256, 256)), dtype=np.float32) / 255.0
    gray = cv2.cvtColor((img_np * 255).astype(np.uint8), cv2.COLOR_RGB2GRAY).astype(np.float32) / 255.0
    gx = cv2.Sobel(gray, cv2.CV_32F, 1, 0, ksize=3)
    gy = cv2.Sobel(gray, cv2.CV_32F, 0, 1, ksize=3)
    gmag = np.hypot(gx, gy)

    vec: List[float] = []
    for r in range(4):
        for c in range(4):
            patch_rgb = img_np[r * 64 : (r + 1) * 64, c * 64 : (c + 1) * 64]
            patch_g = gmag[r * 64 : (r + 1) * 64, c * 64 : (c + 1) * 64]
            patch_gx = np.abs(gx[r * 64 : (r + 1) * 64, c * 64 : (c + 1) * 64])
            means = np.mean(patch_rgb, axis=(0, 1)).tolist()
            stds = np.std(patch_rgb, axis=(0, 1)).tolist()
            vec.extend(means)
            vec.extend(stds)
            vec.append(float(np.mean(patch_g)))
            vec.append(float(np.mean(patch_gx)))

    arr = np.array(vec, dtype=np.float32)
    norm = float(np.linalg.norm(arr)) + 1e-8
    arr_norm = (arr / norm).round(5).tolist()

    return {
        "phash": ph,
        "dhash": dh,
        "ahash": ah,
        "whash": wh,
        "embedding": arr_norm,
    }


def hex_hamming_distance(h1: str, h2: str) -> int:
    try:
        return int(imagehash.hex_to_hash(h1) - imagehash.hex_to_hash(h2))
    except Exception:
        return 64


def cosine_similarity(v1: List[float], v2: List[float]) -> float:
    a = np.array(v1, dtype=np.float32)
    b = np.array(v2, dtype=np.float32)
    denom = (np.linalg.norm(a) * np.linalg.norm(b)) + 1e-8
    return float(np.dot(a, b) / denom)


def find_cross_college_clones(
    phash_hex: str,
    dhash_hex: str,
    whash_hex: str,
    embedding: List[float],
    exclude_media_id: Optional[str] = None,
    current_inst_id: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """
    Searches across the multi-institution database using pHash/dHash/wHash Hamming distance
    and 128-D vector cosine similarity to catch recycled, cropped, or brightness-adjusted photos.
    """
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT media_id, app_id, inst_id, inst_name, is_historical, facility_type,
               title, file_path, phash, dhash, whash, embedding_json, exif_json
        FROM infrastructure_media
        """
    )
    rows = cur.fetchall()
    conn.close()

    matches: List[Dict[str, Any]] = []
    for row in rows:
        if exclude_media_id and row["media_id"] == exclude_media_id:
            continue
        # Do not match an active photo against its own institution unless historical
        if current_inst_id and row["inst_id"] == current_inst_id and not row["is_historical"]:
            continue

        p_dist = hex_hamming_distance(phash_hex, row["phash"])
        d_dist = hex_hamming_distance(dhash_hex, row["dhash"])
        w_dist = hex_hamming_distance(whash_hex, row["whash"])
        min_dist = min(p_dist, d_dist, w_dist)

        other_emb = json.loads(row["embedding_json"])
        cos_sim = cosine_similarity(embedding, other_emb)

        if min_dist <= 12 or cos_sim >= 0.94:
            hash_sim_pct = round((1.0 - (min_dist / 64.0)) * 100.0, 1)
            combined_sim = round(max(hash_sim_pct, cos_sim * 100.0), 1)

            other_img = Image.open(row["file_path"]).convert("RGB")
            other_data_url = _np_to_base64_png(np.array(other_img))
            other_exif = json.loads(row["exif_json"])

            matches.append(
                {
                    "matched_media_id": row["media_id"],
                    "matched_app_id": row["app_id"],
                    "matched_inst_id": row["inst_id"],
                    "matched_inst_name": row["inst_name"],
                    "matched_facility": row["title"],
                    "phash_hamming_distance": p_dist,
                    "dhash_hamming_distance": d_dist,
                    "whash_hamming_distance": w_dist,
                    " matched_phash": row["phash"],
                    "matched_phash": row["phash"],
                    "vector_cosine_similarity": round(cos_sim, 4),
                    "similarity_percent": combined_sim,
                    "captured_at": other_exif.get("captured_at", "2024-11-14 11:20:05"),
                    "preview_data_url": other_data_url,
                    "verdict": (
                        "CROSS-INSTITUTION CLONE DETECTED"
                        if row["inst_id"] != current_inst_id
                        else "HISTORICAL SUBMISSION RE-USE"
                    ),
                }
            )

    matches.sort(key=lambda m: m["phash_hamming_distance"])
    return matches


def run_live_image_forensics_and_cv(
    file_path: str,
    campus_lat: float = 18.4575,
    campus_lng: float = 73.8508,
    facility_type: str = "Computer Lab",
) -> Dict[str, Any]:
    """
    Runs full CV + EXIF Geo-Temporal + Clone Hunter + ELA forensics on a user-uploaded image.
    """
    pil_img = Image.open(file_path).convert("RGB")
    img_rgb = np.array(pil_img)

    exif_res = extract_exif_and_verify_gps(file_path, campus_lat, campus_lng)
    hash_res = compute_hashes_and_embedding(file_path)
    clones = find_cross_college_clones(
        hash_res["phash"],
        hash_res["dhash"],
        hash_res["whash"],
        hash_res["embedding"],
    )
    ela_res = compute_ela_analysis(img_rgb, quality=90, scale=18)

    return {
        "specimen_data_url": _np_to_base64_png(img_rgb),
        "dimensions": {"width": int(img_rgb.shape[1]), "height": int(img_rgb.shape[0])},
        "facility_type": facility_type,
        "hashes": {
            "phash": hash_res["phash"],
            "dhash": hash_res["dhash"],
            "ahash": hash_res["ahash"],
            "whash": hash_res["whash"],
        },
        "exif": exif_res,
        "clone_matches": clones,
        "ela": ela_res,
    }
