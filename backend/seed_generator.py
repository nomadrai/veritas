import io
import json
from pathlib import Path
from typing import Any, Dict, List, Tuple

import cv2
import numpy as np
import piexif
import pikepdf
import pymupdf
import qrcode
from PIL import Image, ImageDraw, ImageEnhance

from cv_engine import (
    compute_hashes_and_embedding,
    extract_exif_and_verify_gps,
    find_cross_college_clones,
)
from database import append_audit_log, get_connection, init_db
from forensics_engine import run_full_document_xray

STORAGE_DIR = Path(__file__).parent / "storage"


def _decimal_to_dms_rational(dec: float) -> Tuple[Tuple[int, int], Tuple[int, int], Tuple[int, int]]:
    abs_val = abs(dec)
    deg = int(abs_val)
    rem = (abs_val - deg) * 60.0
    minutes = int(rem)
    sec = int(round((rem - minutes) * 60.0 * 10000))
    return ((deg, 1), (minutes, 1), (sec, 10000))


def _save_jpeg_with_exif(
    pil_img: Image.Image,
    out_path: Path,
    lat: float,
    lng: float,
    timestamp: str,
    make: str = "Canon",
    model: str = "EOS R50 Regulatory Inspection Kit",
    software: str = "Canon EOS Digital Solution v4.2",
    quality: int = 94,
) -> None:
    gps_ifd = {
        piexif.GPSIFD.GPSVersionID: (2, 0, 0, 0),
        piexif.GPSIFD.GPSLatitudeRef: b"N" if lat >= 0 else b"S",
        piexif.GPSIFD.GPSLatitude: _decimal_to_dms_rational(lat),
        piexif.GPSIFD.GPSLongitudeRef: b"E" if lng >= 0 else b"W",
        piexif.GPSIFD.GPSLongitude: _decimal_to_dms_rational(lng),
        piexif.GPSIFD.GPSAltitudeRef: 0,
        piexif.GPSIFD.GPSAltitude: (560, 1),
    }
    zeroth_ifd = {
        piexif.ImageIFD.Make: make.encode("utf-8"),
        piexif.ImageIFD.Model: model.encode("utf-8"),
        piexif.ImageIFD.Software: software.encode("utf-8"),
        piexif.ImageIFD.DateTime: timestamp.encode("utf-8"),
    }
    exif_ifd = {
        piexif.ExifIFD.DateTimeOriginal: timestamp.encode("utf-8"),
        piexif.ExifIFD.DateTimeDigitized: timestamp.encode("utf-8"),
    }
    exif_bytes = piexif.dump({"0th": zeroth_ifd, "Exif": exif_ifd, "GPS": gps_ifd})
    pil_img.save(str(out_path), format="JPEG", quality=quality, exif=exif_bytes)


def _make_qr_png_bytes(payload_dict: Dict[str, Any]) -> bytes:
    qr = qrcode.QRCode(
        version=2,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=6,
        border=2,
    )
    qr.add_data(json.dumps(payload_dict, separators=(",", ":")))
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white").convert("RGB")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def _make_official_seal_png(title_top: str, title_bottom: str, code_center: str, color_rgb=(20, 62, 140)) -> bytes:
    """
    Creates a detailed circular official stamp/seal with high-contrast features
    so SIFT keypoint copy-move detection can reliably match cloned stamps.
    """
    size = 180
    img = Image.new("RGBA", (size, size), (255, 255, 255, 0))
    draw = ImageDraw.Draw(img)

    # Outer & inner concentric rings
    draw.ellipse((6, 6, size - 6, size - 6), outline=color_rgb + (235,), width=4)
    draw.ellipse((14, 14, size - 14, size - 14), outline=color_rgb + (210,), width=2)
    draw.ellipse((42, 42, size - 42, size - 42), outline=color_rgb + (200,), width=2)

    # Radial spokes / star ticks for distinctive SIFT keypoints
    cx, cy = size // 2, size // 2
    for angle_deg in range(0, 360, 15):
        rad = np.radians(angle_deg)
        x1 = cx + int(22 * np.cos(rad))
        y1 = cy + int(22 * np.sin(rad))
        x2 = cx + int(38 * np.cos(rad))
        y2 = cy + int(38 * np.sin(rad))
        draw.line((x1, y1, x2, y2), fill=color_rgb + (220,), width=2)

    # Inner geometric emblem
    draw.polygon([(cx, cy - 18), (cx - 16, cy + 12), (cx + 16, cy + 12)], outline=color_rgb + (240,), width=2)
    draw.rectangle((26, cy - 11, size - 26, cy + 11), fill=(248, 249, 252, 245), outline=color_rgb + (230,), width=2)
    draw.text((34, cy - 6), code_center, fill=color_rgb + (255,))
    draw.text((36, 22), title_top[:18], fill=color_rgb + (240,))
    draw.text((38, size - 34), title_bottom[:18], fill=color_rgb + (240,))

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def _create_state_noc_pdf(out_path: Path) -> None:
    """
    Creates `state_noc_8841.pdf` with:
    1. Embedded QR code stating `approved_intake: 120`
    2. Printed text altered to `180` in Courier-Bold (Font Mismatch + QR-vs-OCR Cross-Lock)
    3. Spliced low-quality JPEG patch over the intake box & signature (triggers real OpenCV ELA hotspot)
    4. Incremental update (`%%EOF` x2) + Photoshop ModDate 14 days after CreationDate.
    """
    doc = pymupdf.open()
    page = doc.new_page(width=595, height=842)

    # Subtle paper background & official border
    page.draw_rect(pymupdf.Rect(0, 0, 595, 842), color=(0.985, 0.982, 0.972), fill=(0.985, 0.982, 0.972))
    page.draw_rect(pymupdf.Rect(28, 28, 567, 814), color=(0.15, 0.22, 0.36), width=1.5)
    page.draw_rect(pymupdf.Rect(33, 33, 562, 809), color=(0.15, 0.22, 0.36), width=0.5)

    # Header block
    page.draw_rect(pymupdf.Rect(33, 33, 562, 108), color=(0.11, 0.17, 0.29), fill=(0.11, 0.17, 0.29))
    page.insert_text((52, 58), "GOVERNMENT OF MAHARASHTRA", fontsize=14, fontname="helv", color=(1, 1, 1))
    page.insert_text(
        (52, 76),
        "DEPARTMENT OF HIGHER AND TECHNICAL EDUCATION · MANTRALAYA, MUMBAI",
        fontsize=8.5,
        fontname="helv",
        color=(0.82, 0.87, 0.95),
    )
    page.insert_text(
        (52, 94),
        "STATUTORY NO-OBJECTION CERTIFICATE (NOC) FOR AICTE EXTENSION OF APPROVAL 2026-27",
        fontsize=9,
        fontname="helv",
        color=(0.95, 0.78, 0.32),
    )

    # Reference & Date strip
    page.insert_text((48, 134), "Certificate No: NOC-MH-2026-9921", fontsize=10, fontname="helv", color=(0.1, 0.1, 0.15))
    page.insert_text((390, 134), "Date of Issue: 2026-08-10", fontsize=10, fontname="helv", color=(0.1, 0.1, 0.15))
    page.draw_line((48, 144), (547, 144), color=(0.75, 0.78, 0.82), width=0.8)

    # Body paragraph
    page.insert_text(
        (48, 170),
        "This is to certify that the Government of Maharashtra has No Objection to the continuation",
        fontsize=10,
        fontname="helv",
        color=(0.15, 0.15, 0.2),
    )
    page.insert_text(
        (48, 186),
        "and Extension of Approval (EoA) for the following Technical Institution registered under AICTE:",
        fontsize=10,
        fontname="helv",
        color=(0.15, 0.15, 0.2),
    )

    # Structured Table
    rows = [
        ("1. AICTE Permanent Institution ID", "1-44928102"),
        ("2. Name of Technical Institution", "Vishwakarma Institute of Emerging Technologies"),
        ("3. Registered Campus Location", "Survey No. 44/2, Kondhwa-Katraj Link, Pune - 411048"),
        ("4. Affiliating University", "Savitribai Phule Pune University (SPPU), Pune"),
        ("5. Programme & Course Name", "B.Tech in Computer Science & Engg (AI & ML)"),
        ("6. Sanctioned Approved Intake", "TAMPERED_SLOT"),
        ("7. Certificate Validity Up To", "2027-06-30"),
        ("8. Land Area & Instructional Area", "7.50 Acres / 14,820 Sq.m Built-up"),
    ]

    y_cursor = 212
    for label, val in rows:
        page.draw_rect(pymupdf.Rect(48, y_cursor, 260, y_cursor + 32), color=(0.78, 0.8, 0.84), fill=(0.95, 0.96, 0.98), width=0.6)
        page.draw_rect(pymupdf.Rect(260, y_cursor, 547, y_cursor + 32), color=(0.78, 0.8, 0.84), fill=(1, 1, 1), width=0.6)
        page.insert_text((56, y_cursor + 20), label, fontsize=9.5, fontname="helv", color=(0.2, 0.24, 0.3))
        if val != "TAMPERED_SLOT":
            page.insert_text((272, y_cursor + 20), val, fontsize=10, fontname="helv", color=(0.08, 0.1, 0.14))
        else:
            # Insert a heavily compressed/spliced raster patch behind the tampered intake value so ELA detects the exact edit!
            patch = Image.new("RGB", (260, 28), (253, 250, 242))
            pdraw = ImageDraw.Draw(patch)
            # High-frequency synthetic compression artifacts inside the spliced patch
            for px in range(0, 260, 4):
                for py in range(0, 28, 4):
                    c_delta = ((px * 7 + py * 13) % 28) - 14
                    pdraw.rectangle(
                        [px, py, px + 2, py + 2],
                        fill=(248 + c_delta // 2, 240 - c_delta, 225 + c_delta),
                    )
            pdraw.rectangle([2, 2, 257, 25], outline=(215, 165, 155), width=1)
            buf_low = io.BytesIO()
            patch.save(buf_low, format="JPEG", quality=32)
            page.insert_image(pymupdf.Rect(264, y_cursor + 2, 535, y_cursor + 30), stream=buf_low.getvalue())

            # Insert tampered intake number "180" using mismatched Courier-Bold ("cour") font!
            page.insert_text(
                (272, y_cursor + 21),
                "180 Seats (Annual Intake)",
                fontsize=12.5,
                fontname="cour",
                color=(0.05, 0.05, 0.05),
            )
        y_cursor += 32

    # Statutory conditions block
    page.insert_text(
        (48, 502),
        "CONDITIONS OF APPROVAL (AICTE APH 2024-2027 CHAPTER II):",
        fontsize=9.5,
        fontname="helv",
        color=(0.12, 0.18, 0.28),
    )
    page.insert_text(
        (48, 520),
        "• The institution shall maintain minimum carpet area of 66 sq.m per classroom (60 intake division).",
        fontsize=9,
        fontname="helv",
        color=(0.25, 0.25, 0.3),
    )
    page.insert_text(
        (48, 536),
        "• Any unauthorized alteration of sanctioned intake on this NOC renders the application void.",
        fontsize=9,
        fontname="helv",
        color=(0.25, 0.25, 0.3),
    )

    # Embedded QR Code (cryptographically locked to true intake = 120!)
    qr_payload = {
        "cert_no": "NOC-MH-2026-9921",
        "inst_id": "1-44928102",
        "approved_intake": 120,
        "valid_upto": "2027-06-30",
        "status": "SANCTIONED_120",
    }
    qr_png = _make_qr_png_bytes(qr_payload)
    page.insert_image(pymupdf.Rect(50, 595, 184, 729), stream=qr_png)
    page.insert_text((54, 740), "SCAN FOR DIGILOCKER / e-NOC PAYLOAD", fontsize=7.5, fontname="helv", color=(0.3, 0.3, 0.35))

    # Official Seal
    seal_png = _make_official_seal_png("DEPT OF TECH EDUCATION", "GOVT OF MAHARASHTRA", "DHTE-MUMBAI")
    page.insert_image(pymupdf.Rect(235, 605, 345, 715), stream=seal_png)

    # Spliced signature block on the right (also triggers ELA hotspot)
    sig_patch = Image.new("RGB", (175, 70), (250, 246, 236))
    sdraw = ImageDraw.Draw(sig_patch)
    for sx in range(0, 175, 5):
        for sy in range(0, 70, 5):
            sdraw.rectangle([sx, sy, sx + 2, sy + 2], fill=(238, 226, 212))
    sdraw.line([(18, 48), (48, 22), (65, 52), (98, 25), (125, 44), (155, 30)], fill=(15, 35, 95), width=3)
    sbuf = io.BytesIO()
    sig_patch.save(sbuf, format="JPEG", quality=35)
    page.insert_image(pymupdf.Rect(375, 620, 545, 690), stream=sbuf.getvalue())

    page.insert_text((380, 712), "Dr. R. K. Deshmukh, IAS", fontsize=9.5, fontname="helv", color=(0.1, 0.1, 0.15))
    page.insert_text((380, 726), "Deputy Secretary (Technical Education)", fontsize=8.5, fontname="helv", color=(0.3, 0.3, 0.35))

    doc.set_metadata(
        {
            "title": "State Government NOC - NOC-MH-2026-9921",
            "author": "Department of Higher & Technical Education, Maharashtra",
            "creator": "Maharashtra e-Governance Portal v3.1",
            "producer": "Adobe Photoshop 25.4 (Windows) / Modified PDF Engine",
            "creationDate": "D:20260810103000+05'30'",
            "modDate": "D:20260824231419+05'30'",
        }
    )
    doc.save(str(out_path))
    doc.close()

    # Append an incremental update so `%%EOF` count >= 2 (post-signing modification forensic indicator)
    with open(out_path, "ab") as f:
        f.write(b"\n% Incremental revision saved by Adobe Photoshop 25.4\n%%EOF\n")


def _create_fire_safety_pdf(out_path: Path) -> None:
    """
    Creates `fire_safety_8841.pdf` with:
    1. Embedded QR code stating `valid_upto: 2025-03-31` (Expired!)
    2. Printed text altered to `2026-12-31` in Courier-Bold
    3. Copy-Move Forgery: Cloned Municipal Fire Brigade circular stamp placed in two spots on the certificate!
    """
    doc = pymupdf.open()
    page = doc.new_page(width=595, height=842)

    page.draw_rect(pymupdf.Rect(0, 0, 595, 842), color=(0.99, 0.985, 0.98), fill=(0.99, 0.985, 0.98))
    page.draw_rect(pymupdf.Rect(28, 28, 567, 814), color=(0.65, 0.14, 0.14), width=1.5)

    page.draw_rect(pymupdf.Rect(33, 33, 562, 105), color=(0.58, 0.12, 0.12), fill=(0.58, 0.12, 0.12))
    page.insert_text((48, 58), "PUNE MUNICIPAL CORPORATION · FIRE & EMERGENCY SERVICES", fontsize=12.5, fontname="helv", color=(1, 1, 1))
    page.insert_text(
        (48, 76),
        "PROVISIONAL FIRE SAFETY COMPLIANCE CERTIFICATE (NATIONAL BUILDING CODE PART-4)",
        fontsize=8.5,
        fontname="helv",
        color=(0.98, 0.88, 0.85),
    )
    page.insert_text(
        (48, 92),
        "FORM-B STATUTORY CLEARANCE FOR EDUCATIONAL BUILDINGS (AICTE APH ANNEXURE-3)",
        fontsize=8.5,
        fontname="helv",
        color=(1, 0.85, 0.4),
    )

    page.insert_text((48, 134), "Fire NOC No: FIRE-MH-PUN-2023-4102", fontsize=10, fontname="helv", color=(0.1, 0.1, 0.1))
    page.insert_text((385, 134), "Issue Date: 2024-04-01", fontsize=10, fontname="helv", color=(0.1, 0.1, 0.1))
    page.draw_line((48, 144), (547, 144), color=(0.8, 0.75, 0.75), width=0.8)

    rows = [
        ("1. Name of Educational Institution", "Vishwakarma Institute of Emerging Technologies, Pune"),
        ("2. AICTE Institution Permanent ID", "1-44928102"),
        ("3. Building Blocks Covered", "Academic Block A, Block B & Central Computer Lab (G+3)"),
        ("4. Hydrant & Sprinkler System Status", "Pressurized Wet Riser + 24 Ceiling Sprinklers Installed"),
        ("5. Certificate Expiry / Valid Up To", "TAMPERED_DATE"),
    ]

    y_cursor = 175
    for label, val in rows:
        page.draw_rect(pymupdf.Rect(48, y_cursor, 265, y_cursor + 34), color=(0.82, 0.76, 0.76), fill=(0.98, 0.95, 0.95), width=0.6)
        page.draw_rect(pymupdf.Rect(265, y_cursor, 547, y_cursor + 34), color=(0.82, 0.76, 0.76), fill=(1, 1, 1), width=0.6)
        page.insert_text((56, y_cursor + 21), label, fontsize=9.5, fontname="helv", color=(0.25, 0.15, 0.15))
        if val != "TAMPERED_DATE":
            page.insert_text((275, y_cursor + 21), val, fontsize=9.5, fontname="helv", color=(0.1, 0.1, 0.1))
        else:
            # Spliced patch for altered expiry date
            patch = Image.new("RGB", (250, 28), (252, 245, 240))
            pdraw = ImageDraw.Draw(patch)
            for px in range(0, 250, 4):
                for py in range(0, 28, 4):
                    pdraw.rectangle([px, py, px + 2, py + 2], fill=(242, 228, 222))
            buf_low = io.BytesIO()
            patch.save(buf_low, format="JPEG", quality=30)
            page.insert_image(pymupdf.Rect(270, y_cursor + 3, 535, y_cursor + 31), stream=buf_low.getvalue())
            page.insert_text(
                (278, y_cursor + 22),
                "2026-12-31 (Extended)",
                fontsize=12,
                fontname="cour",
                color=(0.7, 0.05, 0.05),
            )
        y_cursor += 34

    # QR Code with TRUE expired date (2025-03-31)
    qr_payload = {
        "cert_no": "FIRE-MH-PUN-2023-4102",
        "inst_id": "1-44928102",
        "issue_date": "2024-04-01",
        "valid_upto": "2025-03-31",
        "status": "EXPIRED",
        "issuer": "Chief Fire Officer, Pune Municipal Corporation",
    }
    qr_png = _make_qr_png_bytes(qr_payload)
    page.insert_image(pymupdf.Rect(52, 560, 178, 686), stream=qr_png)
    page.insert_text((54, 700), "VERIFY AT PMC FIRE PORTAL", fontsize=7.5, fontname="helv", color=(0.35, 0.2, 0.2))

    # COPY-MOVE FORGERY: Identical official fire seal cloned at two spatial positions on the same page!
    fire_seal_png = _make_official_seal_png("CHIEF FIRE OFFICER", "PUNE MUNICIPAL CORP", "PMC-FIRE-09", color_rgb=(175, 28, 28))
    page.insert_image(pymupdf.Rect(220, 565, 340, 685), stream=fire_seal_png)
    page.insert_image(pymupdf.Rect(395, 565, 515, 685), stream=fire_seal_png)
    page.insert_text((225, 705), "Inspector Verification Seal", fontsize=8.5, fontname="helv", color=(0.3, 0.3, 0.3))
    page.insert_text((395, 705), "Chief Fire Officer Seal (Cloned)", fontsize=8.5, fontname="helv", color=(0.3, 0.3, 0.3))

    doc.set_metadata(
        {
            "title": "Fire Safety Certificate - FIRE-MH-PUN-2023-4102",
            "author": "Pune Municipal Corporation Fire Dept",
            "creator": "Foxit PhantomPDF Editor 11.2",
            "producer": "Adobe Acrobat Pro DC (Tampered Revision)",
            "creationDate": "D:20240401091500+05'30'",
            "modDate": "D:20260918194210+05'30'",
        }
    )
    doc.save(str(out_path))
    doc.close()
    with open(out_path, "ab") as f:
        f.write(b"\n% Incremental update 1\n%%EOF\n% Incremental update 2\n%%EOF\n")


def _create_floor_plan_pdf(out_path: Path) -> None:
    """
    Creates `floor_plan_8841.pdf` — an Architect-Certified Instructional Area Blueprint
    showing rooms against AICTE APH 2024-27 Carpet Area Norms (CR-102 is 48.0 sq.m < 66.0 sq.m norm).
    """
    doc = pymupdf.open()
    page = doc.new_page(width=595, height=842)

    # Blueprint vellum ground
    page.draw_rect(pymupdf.Rect(0, 0, 595, 842), color=(0.96, 0.975, 0.99), fill=(0.96, 0.975, 0.99))
    page.draw_rect(pymupdf.Rect(24, 24, 571, 818), color=(0.12, 0.26, 0.48), width=1.5)

    # Grid lines
    for gx in range(44, 560, 28):
        page.draw_line((gx, 100), (gx, 520), color=(0.88, 0.92, 0.96), width=0.4)
    for gy in range(100, 530, 28):
        page.draw_line((44, gy), (555, gy), color=(0.88, 0.92, 0.96), width=0.4)

    # Title bar
    page.draw_rect(pymupdf.Rect(28, 28, 567, 92), color=(0.09, 0.21, 0.40), fill=(0.09, 0.21, 0.40))
    page.insert_text(
        (42, 52),
        "ARCHITECT-CERTIFIED INSTRUCTIONAL AREA FLOOR PLAN (AICTE APH 2024-27 APPENDIX-4)",
        fontsize=11,
        fontname="helv",
        color=(1, 1, 1),
    )
    page.insert_text(
        (42, 70),
        "INSTITUTION: Vishwakarma Institute of Emerging Technologies (1-44928102) · BLOCK-A FIRST FLOOR",
        fontsize=8.5,
        fontname="helv",
        color=(0.78, 0.88, 0.98),
    )
    page.insert_text(
        (42, 84),
        "COA Reg No: CA/2018/94812 · Scale 1:100 · Norm: UG Classroom >= 66.0 sq.m (60 students) | Computer Center >= 150.0 sq.m",
        fontsize=7.8,
        fontname="helv",
        color=(0.95, 0.82, 0.38),
    )

    # Room 1: CR-101 (Compliant 66.5 sq.m)
    page.draw_rect(pymupdf.Rect(48, 118, 285, 290), color=(0.08, 0.42, 0.28), fill=(0.91, 0.97, 0.94), width=1.8)
    page.insert_text((62, 146), "CLASSROOM CR-101 (UG CSE Division-A)", fontsize=9.5, fontname="helv", color=(0.06, 0.32, 0.2))
    page.insert_text((62, 166), "Dimensions: 11.0m x 6.05m", fontsize=9, fontname="helv", color=(0.15, 0.2, 0.25))
    page.insert_text((62, 184), "Measured Carpet Area: 66.55 sq.m", fontsize=10, fontname="helv", color=(0.06, 0.35, 0.2))
    page.insert_text((62, 202), "AICTE APH Norm: >= 66.00 sq.m (60 Seats)", fontsize=8.5, fontname="helv", color=(0.2, 0.3, 0.25))
    page.insert_text((62, 222), "STATUS: COMPLIANT (1.11 sq.m / student)", fontsize=8.5, fontname="helv", color=(0.06, 0.42, 0.22))

    # Room 2: CR-102 (DEFICIENT: 48.0 sq.m < 66.0 sq.m norm!)
    page.draw_rect(pymupdf.Rect(295, 118, 545, 290), color=(0.78, 0.14, 0.14), fill=(0.99, 0.92, 0.92), width=2.2)
    page.insert_text((308, 146), "CLASSROOM CR-102 (UG AI & ML Division-B)", fontsize=9.5, fontname="helv", color=(0.68, 0.1, 0.1))
    page.insert_text((308, 166), "Dimensions: 8.0m x 6.00m", fontsize=9, fontname="helv", color=(0.25, 0.15, 0.15))
    page.insert_text((308, 184), "Measured Carpet Area: 48.00 sq.m", fontsize=10.5, fontname="helv", color=(0.75, 0.08, 0.08))
    page.insert_text((308, 202), "AICTE APH Norm: >= 66.00 sq.m (60 Seats)", fontsize=8.5, fontname="helv", color=(0.4, 0.15, 0.15))
    page.insert_text((308, 222), "DEFICIENCY: -18.0 sq.m SHORTFALL (0.80 sq.m/student)", fontsize=8.2, fontname="helv", color=(0.78, 0.1, 0.1))
    page.insert_text((308, 240), "Max Permitted Capacity: 43 Students (Applied: 60)", fontsize=8.2, fontname="helv", color=(0.78, 0.1, 0.1))

    # Room 3: CC-201 Central Computer Center (Compliant 154.0 sq.m)
    page.draw_rect(pymupdf.Rect(48, 308, 365, 495), color=(0.12, 0.32, 0.58), fill=(0.92, 0.95, 0.99), width=1.6)
    page.insert_text((62, 336), "CENTRAL COMPUTER CENTER CC-201", fontsize=10, fontname="helv", color=(0.08, 0.24, 0.46))
    page.insert_text((62, 356), "Dimensions: 14.0m x 11.0m | Carpet Area: 154.00 sq.m", fontsize=9, fontname="helv", color=(0.15, 0.2, 0.3))
    page.insert_text((62, 374), "AICTE APH Norm: >= 150.00 sq.m | Terminals: 60 PCs", fontsize=8.5, fontname="helv", color=(0.15, 0.25, 0.35))
    page.insert_text((62, 392), "Server Rack + 1 Gbps NKN Leased Line + UPS Backup", fontsize=8.5, fontname="helv", color=(0.2, 0.3, 0.4))

    # Room 4: Accessibility Ramp & Fire Exit Core
    page.draw_rect(pymupdf.Rect(375, 308, 545, 495), color=(0.08, 0.42, 0.28), fill=(0.92, 0.97, 0.94), width=1.6)
    page.insert_text((386, 336), "BARRIER-FREE RAMP & EXIT", fontsize=9, fontname="helv", color=(0.06, 0.32, 0.2))
    page.insert_text((386, 356), "Gradient: 1:12 (APH Norm)", fontsize=8.5, fontname="helv", color=(0.15, 0.25, 0.2))
    page.insert_text((386, 374), "Clear Width: 1.80m + Handrails", fontsize=8.5, fontname="helv", color=(0.15, 0.25, 0.2))
    page.insert_text((386, 392), "Fire Hydrant & Exit Staircase", fontsize=8.5, fontname="helv", color=(0.15, 0.25, 0.2))

    # Schedule Table at bottom
    page.insert_text((48, 535), "INSTRUCTIONAL CARPET AREA SCHEDULE (AS PER AICTE APH 2024-2027 CHAPTER-VII):", fontsize=9.5, fontname="helv", color=(0.1, 0.18, 0.3))
    sched = [
        ("Room Code", "Facility Type", "APH Norm (Sq.m)", "Actual (Sq.m)", "Audit Status"),
        ("CR-101", "UG Classroom (Div-A)", "66.00", "66.55", "COMPLIANT"),
        ("CR-102", "UG Classroom (Div-B)", "66.00", "48.00", "DEFICIENCY (-18.0 Sq.m)"),
        ("CC-201", "Computer Center", "150.00", "154.00", "COMPLIANT"),
        ("RAMP-01", "Barrier-Free Ramp (1:12)", "Slope <= 1:12", "Slope 1:12", "COMPLIANT"),
    ]
    sy = 550
    for idx, r in enumerate(sched):
        bg = (0.88, 0.92, 0.96) if idx == 0 else ((0.99, 0.91, 0.91) if "DEFICIENCY" in r[4] else (1, 1, 1))
        page.draw_rect(pymupdf.Rect(48, sy, 547, sy + 24), color=(0.72, 0.78, 0.85), fill=bg, width=0.5)
        xs = [54, 125, 265, 360, 440]
        for col_i, txt in enumerate(r):
            c_txt = (0.72, 0.08, 0.08) if "DEFICIENCY" in r[4] and idx > 0 else (0.1, 0.15, 0.22)
            page.insert_text((xs[col_i], sy + 16), txt, fontsize=8.5, fontname="helv", color=c_txt)
        sy += 24

    qr_payload = {
        "cert_no": "COA-BP-2026-8841",
        "inst_id": "1-44928102",
        "architect_reg": "CA/2018/94812",
        "cr101_sqm": 66.55,
        "cr102_sqm": 48.00,
        "cc201_sqm": 154.00,
        "valid_upto": "2029-12-31",
    }
    qr_png = _make_qr_png_bytes(qr_payload)
    page.insert_image(pymupdf.Rect(48, 690, 152, 794), stream=qr_png)
    seal_png = _make_official_seal_png("COUNCIL OF ARCHITECTURE", "CERTIFIED BLUEPRINT", "CA-2018-94812", color_rgb=(18, 78, 130))
    page.insert_image(pymupdf.Rect(415, 690, 525, 800), stream=seal_png)

    doc.set_metadata(
        {
            "title": "Architect Certified Floor Plan - COA-BP-2026-8841",
            "author": "Ar. Siddharth Kulkarni (CA/2018/94812)",
            "creator": "AutoCAD 2026 PDF Plotter",
            "producer": "AutoCAD PDF Engine",
            "creationDate": "D:20260901110000+05'30'",
            "modDate": "D:20260901110000+05'30'",
        }
    )
    doc.save(str(out_path))
    doc.close()


def _create_affidavit_pdf(out_path: Path) -> None:
    """
    Creates a clean, digitally signed AICTE APH Annexure-2 Affidavit on Rs. 100 e-Stamp paper.
    """
    doc = pymupdf.open()
    page = doc.new_page(width=595, height=842)

    page.draw_rect(pymupdf.Rect(0, 0, 595, 842), color=(0.985, 0.99, 0.985), fill=(0.985, 0.99, 0.985))
    page.draw_rect(pymupdf.Rect(28, 28, 567, 814), color=(0.08, 0.38, 0.26), width=1.5)

    # e-Stamp Header
    page.draw_rect(pymupdf.Rect(33, 33, 562, 112), color=(0.07, 0.34, 0.24), fill=(0.07, 0.34, 0.24))
    page.insert_text((48, 56), "INDIA NON-JUDICIAL · GOVERNMENT OF MAHARASHTRA e-STAMP", fontsize=12, fontname="helv", color=(1, 1, 1))
    page.insert_text((48, 74), "Certificate No: IN-MH884190221048P · Stamp Duty Paid: INR 100/-", fontsize=9.5, fontname="helv", color=(0.85, 0.98, 0.9))
    page.insert_text(
        (48, 92),
        "AICTE APPROVAL PROCESS HANDBOOK 2024-2027 · SWORN AFFIDAVIT-2 (DIGITAL SIGNATURE VERIFIED)",
        fontsize=8.5,
        fontname="helv",
        color=(0.95, 0.88, 0.45),
    )

    lines = [
        "I, Dr. Milind S. Patwardhan, Principal & Authorized Signatory of Vishwakarma Institute of",
        "Emerging Technologies (AICTE Permanent ID: 1-44928102), Pune, do hereby solemnly affirm:",
        "",
        "1. That the Institution possesses clear title and possession of 7.50 Acres of contiguous land.",
        "2. That Faculty-Student Ratio (FSR) of 1:20 is maintained as per AICTE APH 2024-27 norms.",
        "3. That Transaction Processing Fee (TER) of INR 3,50,000/- has been remitted via AICTE Portal",
        "   vide Receipt No. TER-2026-MH-77412 dated 2026-09-14 (Valid Up To: 2027-09-13).",
        "4. That National Digital Library (NDL), APAAR Student ID, and Internal Complaint Committee",
        "   are constituted and active for Academic Year 2026-27.",
    ]
    y = 155
    for ln in lines:
        page.insert_text((48, y), ln, fontsize=10, fontname="helv", color=(0.12, 0.16, 0.14))
        y += 22

    qr_payload = {
        "cert_no": "IN-MH884190221048P",
        "inst_id": "1-44928102",
        "stamp_duty_inr": 100,
        "issue_date": "2026-09-14",
        "valid_upto": "2027-09-13",
        "dsc_Serial": "CCA-NIC-DSC-9948120",
        "status": "VERIFIED",
    }
    qr_png = _make_qr_png_bytes(qr_payload)
    page.insert_image(pymupdf.Rect(52, 560, 178, 686), stream=qr_png)
    seal_png = _make_official_seal_png("NOTARY PUBLIC GOVT OF INDIA", "DIGITALLY SIGNED DSC", "DSC-VALID-2026", color_rgb=(15, 110, 75))
    page.insert_image(pymupdf.Rect(380, 560, 500, 680), stream=seal_png)

    doc.set_metadata(
        {
            "title": "AICTE Annexure-2 e-Stamp Affidavit - IN-MH884190221048P",
            "author": "StockHolding e-Stamping Central Registry",
            "creator": "NIC e-Sign Gateway v4.0",
            "producer": "NIC e-Sign PKCS#7 Engine",
            "creationDate": "D:20260914142000+05'30'",
            "modDate": "D:20260914142000+05'30'",
        }
    )
    doc.save(str(out_path))
    doc.close()
    # Embed /Type /Sig marker for DSC check
    with open(out_path, "ab") as f:
        f.write(b"\n% /Type /Sig /SubFilter /adbe.pkcs7.detached\n")


def _draw_computer_lab_scene(is_cloned_variant: bool = False) -> Image.Image:
    """
    Renders a detailed synthetic architectural/perspective photograph of a Computer Lab
    with 24 desktop monitors, server rack, ceiling lights, and aisle benches so CV & pHash
    can analyze real pixel structures.
    """
    w, h = 960, 600
    img = Image.new("RGB", (w, h), (228, 232, 238))
    draw = ImageDraw.Draw(img)

    # Ceiling & perspective walls
    draw.polygon([(0, 0), (w, 0), (w - 140, 130), (140, 130)], fill=(242, 245, 248), outline=(195, 202, 212))
    # Left wall & Right wall
    draw.polygon([(0, 0), (140, 130), (140, 410), (0, h)], fill=(218, 224, 232), outline=(185, 192, 202))
    draw.polygon([(w, 0), (w - 140, 130), (w - 140, 410), (w, h)], fill=(212, 219, 228), outline=(185, 192, 202))
    # Back wall
    draw.rectangle([140, 130, w - 140, 410], fill=(234, 238, 243), outline=(180, 188, 198), width=2)
    # Tiled floor
    draw.polygon([(140, 410), (w - 140, 410), (w, h), (0, h)], fill=(196, 204, 214), outline=(160, 170, 180))
    for fx in range(160, w - 140, 65):
        draw.line([(fx, 410), (int((fx - 480) * 1.45 + 480), h)], fill=(178, 186, 196), width=1)
    for fy in [445, 485, 535, 585]:
        draw.line([(40, fy), (w - 40, fy)], fill=(178, 186, 196), width=1)

    # LED Ceiling Panels
    for lx in [240, 440, 640]:
        draw.rectangle([lx, 32, lx + 90, 68], fill=(252, 254, 255), outline=(160, 175, 190), width=2)
        draw.rectangle([lx + 15, 85, lx + 75, 110], fill=(248, 252, 255), outline=(170, 185, 200), width=1)

    # Smart Projection Board on Back Wall
    draw.rectangle([310, 165, 630, 295], fill=(24, 34, 48), outline=(70, 82, 98), width=4)
    draw.text((355, 215), "AI & DEEP LEARNING COMPUTING CLUSTER", fill=(130, 210, 255))
    draw.text((385, 240), "AICTE APH INFRASTRUCTURE NODE", fill=(180, 225, 245))

    # Server Rack on back-left
    draw.rectangle([165, 195, 245, 395], fill=(32, 36, 42), outline=(80, 88, 98), width=2)
    for sy in range(210, 380, 22):
        draw.rectangle([173, sy, 237, sy + 14], fill=(48, 54, 64), outline=(90, 100, 115))
        draw.ellipse([178, sy + 4, 184, sy + 10], fill=(34, 197, 94))
        draw.ellipse([190, sy + 4, 196, sy + 10], fill=(59, 130, 246))

    # Fire Extinguisher mounted on right pillar
    draw.rectangle([768, 255, 796, 335], fill=(205, 32, 32), outline=(120, 18, 18), width=2)
    draw.rectangle([776, 242, 788, 255], fill=(40, 40, 45))

    # Two rows of computer lab desks & 24 LCD monitors
    for row_idx, base_y in enumerate([355, 455]):
        scale = 0.82 if row_idx == 0 else 1.0
        mw = int(58 * scale)
        mh = int(40 * scale)
        # Left bank & Right bank of workstations
        for col_x in [115, 190, 265, 340, 545, 620, 695, 770]:
            mx = col_x
            my = base_y
            # Desk surface
            draw.rectangle([mx - 6, my + mh + 6, mx + mw + 8, my + mh + 26], fill=(168, 132, 96), outline=(115, 86, 58))
            # Monitor bezel & screen
            draw.rectangle([mx, my, mx + mw, my + mh], fill=(22, 28, 38), outline=(85, 95, 110), width=2)
            draw.rectangle([mx + 4, my + 4, mx + mw - 4, my + mh - 4], fill=(38, 92, 165))
            # Monitor stand
            draw.rectangle([mx + mw // 2 - 5, my + mh, mx + mw // 2 + 5, my + mh + 8], fill=(60, 65, 75))
            # Keyboard
            draw.rectangle([mx + 6, my + mh + 11, mx + mw - 6, my + mh + 19], fill=(45, 50, 58))

    if is_cloned_variant:
        # Slight brightness adjustment + pasted fake college banner in top-left corner (caught by Clone Hunter + ELA!)
        img = ImageEnhance.Brightness(img).enhance(1.03)
        banner = Image.new("RGB", (295, 48), (18, 42, 92))
        bdraw = ImageDraw.Draw(banner)
        bdraw.rectangle([2, 2, 292, 45], outline=(235, 195, 65), width=2)
        bdraw.text((14, 10), "VISHWAKARMA INST. PUNE - AI LAB", fill=(255, 255, 255))
        bdraw.text((14, 27), "BLOCK-A CC-201 (Pasted Overlay)", fill=(245, 205, 90))
        # Compress banner heavily before splicing so ELA lights it up!
        bbuf = io.BytesIO()
        banner.save(bbuf, format="JPEG", quality=28)
        bbuf.seek(0)
        spliced_banner = Image.open(bbuf).convert("RGB")
        img.paste(spliced_banner, (150, 136))

    return img


def _draw_classroom_scene() -> Image.Image:
    """
    Renders Classroom CR-102 showing cramped seating (38 desks vs 60 required) and no fire extinguisher.
    """
    w, h = 960, 600
    img = Image.new("RGB", (w, h), (236, 233, 225))
    draw = ImageDraw.Draw(img)

    # Walls & Floor
    draw.rectangle([120, 110, w - 120, 390], fill=(245, 242, 234), outline=(190, 185, 175), width=2)
    draw.polygon([(120, 390), (w - 120, 390), (w, h), (0, h)], fill=(188, 178, 166), outline=(150, 140, 130))

    # Chalkboard & Projector screen
    draw.rectangle([250, 155, 710, 285], fill=(28, 68, 48), outline=(125, 92, 62), width=5)
    draw.text((320, 205), "LECTURE HALL CR-102 · AI & ML DIVISION-B", fill=(235, 245, 238))
    draw.text((345, 232), "MEASURED AREA: 48.0 SQ.M (38 SEATS)", fill=(245, 215, 140))

    # Student Desks (cramped 3 rows)
    for row_y in [365, 435, 505]:
        for col_x in [145, 265, 385, 505, 625, 745]:
            draw.rectangle([col_x, row_y, col_x + 88, row_y + 32], fill=(158, 116, 76), outline=(102, 72, 44), width=2)
            draw.rectangle([col_x + 12, row_y + 34, col_x + 76, row_y + 48], fill=(72, 82, 96), outline=(45, 52, 64))

    return img


def _draw_ramp_scene() -> Image.Image:
    """
    Renders Barrier-Free Accessibility Ramp (1:12 slope), tactile paving, dual handrails, and Fire Hydrant.
    """
    w, h = 960, 600
    img = Image.new("RGB", (w, h), (218, 232, 246))
    draw = ImageDraw.Draw(img)

    # Building facade
    draw.rectangle([80, 70, 880, 420], fill=(238, 234, 226), outline=(175, 168, 158), width=2)
    draw.rectangle([80, 420, 880, 600], fill=(168, 174, 182))

    # Entrance portal
    draw.rectangle([370, 170, 590, 415], fill=(42, 58, 78), outline=(120, 130, 145), width=4)
    draw.text((405, 135), "ACADEMIC BLOCK-A · MAIN ENTRANCE", fill=(35, 45, 65))

    # Barrier-free concrete ramp with 1:12 slope & yellow tactile strip
    draw.polygon([(150, 540), (620, 415), (690, 465), (210, 590)], fill=(195, 202, 210), outline=(110, 118, 128), width=3)
    draw.line([(155, 490), (615, 365)], fill=(45, 115, 185), width=5)  # Upper handrail
    draw.line([(205, 535), (685, 410)], fill=(45, 115, 185), width=5)  # Lower handrail
    # Tactile paving tiles
    draw.rectangle([135, 535, 215, 590], fill=(235, 195, 35), outline=(180, 140, 15), width=2)

    # Fire Hydrant & Accessibility Sign
    draw.rectangle([745, 325, 788, 418], fill=(210, 32, 32), outline=(135, 15, 15), width=2)
    draw.rectangle([635, 240, 710, 315], fill=(22, 92, 188), outline=(255, 255, 255), width=2)
    draw.text((646, 272), "1:12 RAMP", fill=(255, 255, 255))

    return img


def ensure_seeded() -> None:
    init_db()
    STORAGE_DIR.mkdir(parents=True, exist_ok=True)

    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) as cnt FROM applications")
    if cur.fetchone()["cnt"] > 0:
        conn.close()
        return
    conn.close()

    # 1. Generate real PDFs and JPEGs on disk
    noc_pdf_path = STORAGE_DIR / "state_noc_8841.pdf"
    fire_pdf_path = STORAGE_DIR / "fire_safety_8841.pdf"
    floor_pdf_path = STORAGE_DIR / "floor_plan_8841.pdf"
    affidavit_pdf_path = STORAGE_DIR / "affidavit_8841.pdf"

    _create_state_noc_pdf(noc_pdf_path)
    _create_fire_safety_pdf(fire_pdf_path)
    _create_floor_plan_pdf(floor_pdf_path)
    _create_affidavit_pdf(affidavit_pdf_path)

    # Generate Infrastructure Photos (Historical Nagpur source + Cloned Pune submission + Classroom + Ramp)
    hist_lab_path = STORAGE_DIR / "deccan_historical_lab_3109.jpg"
    clone_lab_path = STORAGE_DIR / "computer_lab_8841.jpg"
    classroom_path = STORAGE_DIR / "classroom_cr102_8841.jpg"
    ramp_path = STORAGE_DIR / "ramp_entrance_8841.jpg"

    orig_lab_img = _draw_computer_lab_scene(is_cloned_variant=False)
    _save_jpeg_with_exif(
        orig_lab_img,
        hist_lab_path,
        lat=21.1458,
        lng=79.0882,
        timestamp="2025:10:14 11:22:09",
        make="Nikon",
        model="D7500 Campus Survey",
    )

    cloned_lab_img = _draw_computer_lab_scene(is_cloned_variant=True)
    _save_jpeg_with_exif(
        cloned_lab_img,
        clone_lab_path,
        lat=21.1458,  # Deliberate Nagpur GPS left in EXIF (618.4 km from Pune!)
        lng=79.0882,
        timestamp="2025:10:14 11:22:09",
        make="Nikon",
        model="D7500 Campus Survey",
        software="Adobe Photoshop 25.4 (Windows)",
    )

    classroom_img = _draw_classroom_scene()
    _save_jpeg_with_exif(
        classroom_img,
        classroom_path,
        lat=18.4579,
        lng=73.8511,
        timestamp="2026:10:02 14:15:30",
    )

    ramp_img = _draw_ramp_scene()
    _save_jpeg_with_exif(
        ramp_img,
        ramp_path,
        lat=18.4576,
        lng=73.8509,
        timestamp="2026:10:02 14:40:12",
    )

    conn = get_connection()
    cur = conn.cursor()

    # 2. Insert Institutions
    institutions = [
        (
            "1-44928102",
            "Vishwakarma Institute of Emerging Technologies, Pune",
            "Maharashtra",
            "Pune",
            "Survey No. 44/2, Kondhwa-Katraj Link Road, Pune - 411048",
            18.4575,
            73.8508,
            500.0,
            2014,
            120,
            1,
            28,
            "PAID",
            "TER-2026-MH-77412",
            "Dr. Milind S. Patwardhan (Nodal Officer)",
        ),
        (
            "1-31094421",
            "Deccan College of Engineering & Technology, Nagpur",
            "Maharashtra",
            "Nagpur",
            "Hingna Road, MIDC Sector-4, Nagpur - 440016",
            21.1458,
            79.0882,
            500.0,
            2009,
            180,
            0,
            42,
            "PAID",
            "TER-2025-MH-31090",
            "Prof. S. V. Kulkarni",
        ),
        (
            "1-90148821",
            "Indraprastha Institute of Autonomous Systems, New Delhi",
            "Delhi",
            "New Delhi",
            "Institutional Area Phase-II, Okhla, New Delhi - 110020",
            28.5450,
            77.2732,
            500.0,
            2026,
            0,
            0,
            18,
            "PAID",
            "TER-2026-DL-90142",
            "Dr. Ananya Sharma",
        ),
        (
            "1-77201943",
            "Kaveri College of Engineering & Robotics, Bengaluru",
            "Karnataka",
            "Bengaluru",
            "Hosur Road, Electronic City Phase-1, Bengaluru - 560100",
            12.8452,
            77.6602,
            500.0,
            2017,
            120,
            2,
            21,
            "PAID",
            "TER-2026-KA-77209",
            "Dr. R. Narayanan",
        ),
    ]
    cur.executemany(
        """
        INSERT INTO institutions VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        institutions,
    )
    conn.commit()

    # 3. Insert Historical Infrastructure Photo first so Clone Hunter catches it when indexing 8841!
    hist_hashes = compute_hashes_and_embedding(str(hist_lab_path))
    hist_exif = extract_exif_and_verify_gps(str(hist_lab_path), 21.1458, 79.0882, 500.0)
    cur.execute(
        """
        INSERT INTO infrastructure_media VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            "MEDIA-HIST-3109-LAB",
            "AICTE-2025-EOA-3109",
            "1-31094421",
            "Deccan College of Engineering & Technology, Nagpur",
            1,
            "Computer Center",
            "Central Computing Cluster Lab-1 (2025 EoA Submission)",
            str(hist_lab_path),
            hist_hashes["phash"],
            hist_hashes["dhash"],
            hist_hashes["ahash"],
            hist_hashes["whash"],
            json.dumps(hist_hashes["embedding"]),
            json.dumps(hist_exif),
            0.0,
            "VERIFIED_ON_CAMPUS",
            json.dumps([]),
            json.dumps({"status": "COMPLIANT"}),
            json.dumps([]),
        ),
    )
    conn.commit()

    # 4. Run real forensic pipeline on the 4 PDF documents of Application AICTE-2026-EOA-8841
    noc_xray = run_full_document_xray(str(noc_pdf_path))
    fire_xray = run_full_document_xray(str(fire_pdf_path))
    floor_xray = run_full_document_xray(str(floor_pdf_path))
    aff_xray = run_full_document_xray(str(affidavit_pdf_path))

    docs_to_insert = [
        (
            "DOC-8841-NOC",
            "AICTE-2026-EOA-8841",
            "State Government NOC",
            "Dept of Higher & Technical Education NOC (NOC-MH-2026-9921)",
            str(noc_pdf_path),
            "Dept of Higher & Technical Education, Govt of Maharashtra",
            "NOC-MH-2026-9921",
            "2026-08-10",
            "2027-06-30",
            "Mismatch Detected",
            json.dumps(
                {
                    "portal": "Maharashtra e-NOC / DigiLocker Gateway (in.gov.maharashtra.dhte)",
                    "queried_at": "2026-10-26T09:12:04Z",
                    "http_status": 200,
                    "latency_ms": 184,
                    "source_record": {
                        "cert_no": "NOC-MH-2026-9921",
                        "inst_id": "1-44928102",
                        "course": "B.Tech CSE (AI & ML)",
                        "sanctioned_intake": 120,
                        "valid_upto": "2027-06-30",
                        "signatory": "Dr. R. K. Deshmukh, IAS",
                    },
                    "discrepancy": "Source API & Embedded QR report Sanctioned Intake = 120, whereas uploaded PDF text reads 180.",
                }
            ),
            24,
            json.dumps(
                {
                    "Certificate Number": "NOC-MH-2026-9921",
                    "AICTE Permanent ID": "1-44928102",
                    "Course Name": "B.Tech in Computer Science & Engg (AI & ML)",
                    "Printed Intake (OCR)": "180 Seats (Annual Intake)",
                    "QR Payload Intake": "120 Seats",
                    "Historical EoA Intake": "120 Seats",
                    "Issue Date": "2026-08-10",
                    "Valid Up To": "2027-06-30",
                }
            ),
            json.dumps(noc_xray["qr_codes"][0]["payload"] if noc_xray["qr_codes"] else {}),
            json.dumps(
                {
                    "producer": noc_xray["pdf_forensics"]["producer"],
                    "creator": noc_xray["pdf_forensics"]["creator"],
                    "creation_date": noc_xray["pdf_forensics"]["creation_date"],
                    "mod_date": noc_xray["pdf_forensics"]["mod_date"],
                    "eof_markers": noc_xray["pdf_forensics"]["eof_markers"],
                    "incremental_updates": noc_xray["pdf_forensics"]["incremental_updates"],
                    "dominant_font": noc_xray["pdf_forensics"]["dominant_font"],
                    "font_anomalies": noc_xray["pdf_forensics"]["font_anomalies"],
                    "has_digital_signature": noc_xray["pdf_forensics"]["has_digital_signature"],
                }
            ),
            json.dumps(
                [
                    {
                        "id": "FLAG-NOC-QR-OCR",
                        "layer": "Layer 1 · QR-vs-OCR Cross-Lock",
                        "severity": "CRITICAL",
                        "title": "Sanctioned Intake Altered: QR Payload (120) != Printed Text (180)",
                        "confidence": 0.99,
                        "aph_clause": "APH 2024-27 Clause 2.14.3 (State NOC Sanctioned Intake Verification)",
                        "evidence": "Decoded QR JSON payload specifies `approved_intake: 120`, matching DHTE Mumbai API record, but printed Row 6 on page 1 reads `180 Seats (Annual Intake)`.",
                        "bbox": [0.443, 0.439, 0.455, 0.036],
                        "qr_bbox": noc_xray["qr_codes"][0]["bbox"] if noc_xray["qr_codes"] else [0.087, 0.712, 0.212, 0.150],
                    },
                    {
                        "id": "FLAG-NOC-FONT-META",
                        "layer": "Layer 2 · PDF Structure & Font Forensics",
                        "severity": "CRITICAL",
                        "title": "Foreign Font Injection (`Courier-Bold`) & Post-Issuance Photoshop Save",
                        "confidence": 0.96,
                        "aph_clause": "SIH26261 Document Authentication Standard §3.2",
                        "evidence": "Span `180 Seats (Annual Intake)` is set in `Courier` (12.5pt) while 96% of document body uses `Helvetica` (10pt). PDF header shows `/Producer: Adobe Photoshop 25.4`, 2 `%%EOF` incremental trailers, and `/ModDate` 14 days after `/CreationDate`.",
                        "bbox": [0.443, 0.439, 0.455, 0.036],
                    },
                    {
                        "id": "FLAG-NOC-ELA",
                        "layer": "Layer 3 · Visual Tamper Heatmap (ELA)",
                        "severity": "HIGH",
                        "title": "High-Energy ELA Compression Discontinuity at Intake & Signatory Block",
                        "confidence": 0.94,
                        "aph_clause": "Forensic Image Integrity Check (90% JPEG Recompression)",
                        "evidence": f"16x16 block Error Level Analysis detects z-score > 4.2 splice anomaly over Row 6 (`180 Seats`) and Deputy Secretary signature box.",
                        "bbox": [0.630, 0.736, 0.285, 0.083],
                    },
                ]
            ),
            json.dumps(
                [
                    {
                        "id": "ANN-NOC-1",
                        "label": "QR Code Payload: Intake = 120",
                        "severity": "INFO",
                        "layer": "qr",
                        "bbox": noc_xray["qr_codes"][0]["bbox"] if noc_xray["qr_codes"] else [0.087, 0.712, 0.212, 0.150],
                        "target_bbox": [0.443, 0.439, 0.455, 0.036],
                    },
                    {
                        "id": "ANN-NOC-2",
                        "label": "TAMPERED OCR: '180 Seats' (Courier Font + ELA z=5.8)",
                        "severity": "CRITICAL",
                        "layer": "ela",
                        "bbox": [0.443, 0.439, 0.455, 0.036],
                    },
                    {
                        "id": "ANN-NOC-3",
                        "label": "Spliced Signature Patch (ELA Compression Mismatch)",
                        "severity": "HIGH",
                        "layer": "ela",
                        "bbox": [0.630, 0.736, 0.285, 0.083],
                    },
                ]
            ),
        ),
        (
            "DOC-8841-FIRE",
            "AICTE-2026-EOA-8841",
            "Fire Safety Certificate",
            "Municipal Fire & Emergency Services NOC (FIRE-MH-PUN-2023-4102)",
            str(fire_pdf_path),
            "Chief Fire Officer, Pune Municipal Corporation",
            "FIRE-MH-PUN-2023-4102",
            "2024-04-01",
            "2025-03-31",
            "Expired",
            json.dumps(
                {
                    "portal": "Pune Municipal Corporation Fire Safety Portal API",
                    "queried_at": "2026-10-26T09:12:06Z",
                    "http_status": 200,
                    "latency_ms": 212,
                    "source_record": {
                        "cert_no": "FIRE-MH-PUN-2023-4102",
                        "inst_id": "1-44928102",
                        "issue_date": "2024-04-01",
                        "valid_upto": "2025-03-31",
                        "status": "EXPIRED_RENEWAL_PENDING",
                    },
                    "discrepancy": "Certificate expired on 2025-03-31 in PMC Fire Registry; uploaded PDF shows altered expiry 2026-12-31.",
                }
            ),
            19,
            json.dumps(
                {
                    "Certificate Number": "FIRE-MH-PUN-2023-4102",
                    "Issuing Authority": "Pune Municipal Corporation Fire Services",
                    "Printed Expiry (OCR)": "2026-12-31 (Extended)",
                    "QR & Registry Expiry": "2025-03-31 (EXPIRED)",
                    "Hydrant Status": "Pressurized Wet Riser Installed",
                }
            ),
            json.dumps(fire_xray["qr_codes"][0]["payload"] if fire_xray["qr_codes"] else {}),
            json.dumps(
                {
                    "producer": fire_xray["pdf_forensics"]["producer"],
                    "creator": fire_xray["pdf_forensics"]["creator"],
                    "creation_date": fire_xray["pdf_forensics"]["creation_date"],
                    "mod_date": fire_xray["pdf_forensics"]["mod_date"],
                    "eof_markers": fire_xray["pdf_forensics"]["eof_markers"],
                    "incremental_updates": fire_xray["pdf_forensics"]["incremental_updates"],
                    "dominant_font": fire_xray["pdf_forensics"]["dominant_font"],
                    "font_anomalies": fire_xray["pdf_forensics"]["font_anomalies"],
                    "has_digital_signature": fire_xray["pdf_forensics"]["has_digital_signature"],
                }
            ),
            json.dumps(
                [
                    {
                        "id": "FLAG-FIRE-EXPIRED",
                        "layer": "Layer 1 · QR-vs-OCR & Issuing Authority Check",
                        "severity": "CRITICAL",
                        "title": "Expired Fire Certificate: Registry/QR (2025-03-31) vs Printed (2026-12-31)",
                        "confidence": 0.99,
                        "aph_clause": "APH 2024-27 Annexure-3 Clause 4.1 (Mandatory Active Fire Safety NOC)",
                        "evidence": "PMC Fire Portal API and embedded QR code confirm certificate `FIRE-MH-PUN-2023-4102` expired on `2025-03-31`. Row 5 was overwritten with `2026-12-31 (Extended)`.",
                        "bbox": [0.453, 0.370, 0.445, 0.035],
                        "qr_bbox": fire_xray["qr_codes"][0]["bbox"] if fire_xray["qr_codes"] else [0.087, 0.665, 0.212, 0.150],
                    },
                    {
                        "id": "FLAG-FIRE-COPYMOVE",
                        "layer": "Layer 3 · SIFT Copy-Move Forgery Detection",
                        "severity": "CRITICAL",
                        "title": "Cloned Official Seal Detected via SIFT Keypoint Matching",
                        "confidence": 0.97,
                        "aph_clause": "SIH26261 Visual Forgery & Seal Duplication Check",
                        "evidence": "OpenCV SIFT descriptor matching with Lowe's ratio test identified 34 identical keypoints translated horizontally (+175px, 0px) between the Inspector Seal and the Chief Fire Officer Seal.",
                        "bbox": [0.663, 0.671, 0.201, 0.142],
                        "source_bbox": [0.369, 0.671, 0.201, 0.142],
                    },
                ]
            ),
            json.dumps(
                [
                    {
                        "id": "ANN-FIRE-1",
                        "label": "QR Payload: valid_upto = 2025-03-31 (EXPIRED)",
                        "severity": "INFO",
                        "layer": "qr",
                        "bbox": fire_xray["qr_codes"][0]["bbox"] if fire_xray["qr_codes"] else [0.087, 0.665, 0.212, 0.150],
                        "target_bbox": [0.453, 0.370, 0.445, 0.035],
                    },
                    {
                        "id": "ANN-FIRE-2",
                        "label": "OVERWRITTEN EXPIRY: '2026-12-31' (ELA + Font Mismatch)",
                        "severity": "CRITICAL",
                        "layer": "ela",
                        "bbox": [0.453, 0.370, 0.445, 0.035],
                    },
                    {
                        "id": "ANN-FIRE-3",
                        "label": "Copy-Move Source Seal (SIFT 34 Keypoints)",
                        "severity": "WARNING",
                        "layer": "copymove",
                        "bbox": [0.369, 0.671, 0.201, 0.142],
                        "target_bbox": [0.663, 0.671, 0.201, 0.142],
                    },
                    {
                        "id": "ANN-FIRE-4",
                        "label": "Cloned Target Seal (Exact Pixel Duplicate)",
                        "severity": "CRITICAL",
                        "layer": "copymove",
                        "bbox": [0.663, 0.671, 0.201, 0.142],
                    },
                ]
            ),
        ),
        (
            "DOC-8841-FLOOR",
            "AICTE-2026-EOA-8841",
            "Architect Certified Floor Plan",
            "Block-A First Floor Instructional Carpet Area Plan (COA-BP-2026-8841)",
            str(floor_pdf_path),
            "Council of Architecture Registry (CA/2018/94812)",
            "COA-BP-2026-8841",
            "2026-09-01",
            "2029-12-31",
            "Verified",
            json.dumps(
                {
                    "portal": "Council of Architecture (COA) Certificate Verification API",
                    "queried_at": "2026-10-26T09:12:08Z",
                    "http_status": 200,
                    "latency_ms": 142,
                    "source_record": {
                        "cert_no": "COA-BP-2026-8841",
                        "architect": "Ar. Siddharth Kulkarni (CA/2018/94812)",
                        "status": "ACTIVE_GOOD_STANDING",
                    },
                    "discrepancy": None,
                }
            ),
            96,
            json.dumps(
                {
                    "Plan Certificate No": "COA-BP-2026-8841",
                    "Classroom CR-101 Area": "66.55 sq.m (Norm >= 66.0 sq.m)",
                    "Classroom CR-102 Area": "48.00 sq.m (SHORTFALL: -18.0 sq.m)",
                    "Computer Center CC-201": "154.00 sq.m (Norm >= 150.0 sq.m)",
                    "Barrier-Free Ramp": "1:12 Slope, 1.80m Width (Compliant)",
                }
            ),
            json.dumps(floor_xray["qr_codes"][0]["payload"] if floor_xray["qr_codes"] else {}),
            json.dumps(
                {
                    "producer": floor_xray["pdf_forensics"]["producer"],
                    "creator": floor_xray["pdf_forensics"]["creator"],
                    "creation_date": floor_xray["pdf_forensics"]["creation_date"],
                    "mod_date": floor_xray["pdf_forensics"]["mod_date"],
                    "eof_markers": floor_xray["pdf_forensics"]["eof_markers"],
                    "incremental_updates": floor_xray["pdf_forensics"]["incremental_updates"],
                    "dominant_font": floor_xray["pdf_forensics"]["dominant_font"],
                    "font_anomalies": [],
                    "has_digital_signature": True,
                }
            ),
            json.dumps(
                [
                    {
                        "id": "FLAG-FLOOR-CR102",
                        "layer": "Module 1 · APH Carpet Area Norm Check",
                        "severity": "HIGH",
                        "title": "Classroom CR-102 Carpet Area (48.0 sq.m) Violates APH 66.0 sq.m Norm",
                        "confidence": 0.99,
                        "aph_clause": "AICTE APH 2024-27 Appendix-4 Clause 4.2 (1.1 sq.m/student · 66 sq.m per 60 Division)",
                        "evidence": "Architect blueprint schedule certifies CR-102 at `8.0m x 6.0m = 48.00 sq.m` (0.80 sq.m/student for 60 intake), resulting in an 18.0 sq.m deficit.",
                        "bbox": [0.495, 0.140, 0.420, 0.204],
                    }
                ]
            ),
            json.dumps(
                [
                    {
                        "id": "ANN-FLOOR-1",
                        "label": "CR-101: 66.55 sq.m (APH Compliant >= 66 sq.m)",
                        "severity": "VERIFIED",
                        "layer": "ocr",
                        "bbox": [0.080, 0.140, 0.398, 0.204],
                    },
                    {
                        "id": "ANN-FLOOR-2",
                        "label": "DEFICIENCY: CR-102 = 48.0 sq.m (< 66.0 sq.m APH Norm)",
                        "severity": "CRITICAL",
                        "layer": "ocr",
                        "bbox": [0.495, 0.140, 0.420, 0.204],
                    },
                    {
                        "id": "ANN-FLOOR-3",
                        "label": "Computer Center CC-201: 154.0 sq.m (Compliant >= 150 sq.m)",
                        "severity": "VERIFIED",
                        "layer": "ocr",
                        "bbox": [0.080, 0.365, 0.532, 0.222],
                    },
                ]
            ),
        ),
        (
            "DOC-8841-AFFIDAVIT",
            "AICTE-2026-EOA-8841",
            "Sworn Affidavit (Annexure-2)",
            "AICTE APH Annexure-2 e-Stamp Sworn Undertaking (IN-MH884190221048P)",
            str(affidavit_pdf_path),
            "StockHolding e-Stamping & NIC e-Sign CCA",
            "IN-MH884190221048P",
            "2026-09-14",
            "2027-09-13",
            "Verified",
            json.dumps(
                {
                    "portal": "StockHolding Central Record Keeping Agency (CRA) & CCA e-Sign",
                    "queried_at": "2026-10-26T09:12:10Z",
                    "http_status": 200,
                    "latency_ms": 118,
                    "source_record": {
                        "cert_no": "IN-MH884190221048P",
                        "stamp_duty_inr": 100,
                        "dsc_holder": "Dr. Milind S. Patwardhan",
                        "dsc_status": "VALID_X509_CHAIN",
                    },
                    "discrepancy": None,
                }
            ),
            98,
            json.dumps(
                {
                    "e-Stamp Certificate No": "IN-MH884190221048P",
                    "Stamp Duty": "INR 100/- (APH Compliant)",
                    "TER Fee Receipt": "TER-2026-MH-77412 (INR 3,50,000 Paid)",
                    "Digital Signature (DSC)": "Valid Class-III X.509 Token (NIC CCA)",
                }
            ),
            json.dumps(aff_xray["qr_codes"][0]["payload"] if aff_xray["qr_codes"] else {}),
            json.dumps(
                {
                    "producer": aff_xray["pdf_forensics"]["producer"],
                    "creator": aff_xray["pdf_forensics"]["creator"],
                    "creation_date": aff_xray["pdf_forensics"]["creation_date"],
                    "mod_date": aff_xray["pdf_forensics"]["mod_date"],
                    "eof_markers": aff_xray["pdf_forensics"]["eof_markers"],
                    "incremental_updates": 0,
                    "dominant_font": aff_xray["pdf_forensics"]["dominant_font"],
                    "font_anomalies": [],
                    "has_digital_signature": True,
                }
            ),
            json.dumps([]),
            json.dumps(
                [
                    {
                        "id": "ANN-AFF-1",
                        "label": "QR-vs-OCR Cross-Lock: Verified (IN-MH884190221048P)",
                        "severity": "VERIFIED",
                        "layer": "qr",
                        "bbox": aff_xray["qr_codes"][0]["bbox"] if aff_xray["qr_codes"] else [0.087, 0.665, 0.212, 0.150],
                    },
                    {
                        "id": "ANN-AFF-2",
                        "label": "Valid PKCS#7 Detached Digital Signature (NIC CCA)",
                        "severity": "VERIFIED",
                        "layer": "ocr",
                        "bbox": [0.638, 0.665, 0.201, 0.142],
                    },
                ]
            ),
        ),
    ]

    cur.executemany(
        """
        INSERT INTO documents VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        docs_to_insert,
    )
    conn.commit()

    # 5. Insert Active Infrastructure Photos for 8841 (running real pHash + Clone Hunter + EXIF GPS!)
    lab_hashes = compute_hashes_and_embedding(str(clone_lab_path))
    lab_exif = extract_exif_and_verify_gps(str(clone_lab_path), 18.4575, 73.8508, 500.0)
    lab_clones = find_cross_college_clones(
        lab_hashes["phash"],
        lab_hashes["dhash"],
        lab_hashes["whash"],
        lab_hashes["embedding"],
        current_inst_id="1-44928102",
    )

    cr_hashes = compute_hashes_and_embedding(str(classroom_path))
    cr_exif = extract_exif_and_verify_gps(str(classroom_path), 18.4575, 73.8508, 500.0)

    ramp_hashes = compute_hashes_and_embedding(str(ramp_path))
    ramp_exif = extract_exif_and_verify_gps(str(ramp_path), 18.4575, 73.8508, 500.0)

    media_to_insert = [
        (
            "MEDIA-8841-LAB",
            "AICTE-2026-EOA-8841",
            "1-44928102",
            "Vishwakarma Institute of Emerging Technologies, Pune",
            0,
            "Computer Center",
            "AI & Deep Learning Computer Lab CC-201",
            str(clone_lab_path),
            lab_hashes["phash"],
            lab_hashes["dhash"],
            lab_hashes["ahash"],
            lab_hashes["whash"],
            json.dumps(lab_hashes["embedding"]),
            json.dumps(lab_exif),
            lab_exif["distance_m"],
            lab_exif["geo_status"],
            json.dumps(
                [
                    {
                        "id": "CV-LAB-BANNER",
                        "label": "Spliced College Banner Overlay (ELA z=6.1)",
                        "confidence": 0.98,
                        "status": "CRITICAL",
                        "bbox": [0.156, 0.226, 0.307, 0.080],
                    },
                    {
                        "id": "CV-LAB-PCS",
                        "label": "Workstation Terminals Detected: 16 Units (APH Norm: >= 30 PCs for 180 Intake)",
                        "confidence": 0.94,
                        "status": "WARNING",
                        "bbox": [0.110, 0.580, 0.760, 0.300],
                    },
                    {
                        "id": "CV-LAB-SERVER",
                        "label": "Rack Server & NKN Switch Unit",
                        "confidence": 0.92,
                        "status": "VERIFIED",
                        "bbox": [0.171, 0.325, 0.084, 0.333],
                    },
                    {
                        "id": "CV-LAB-EXT",
                        "label": "Wall-Mounted CO2 Fire Extinguisher",
                        "confidence": 0.95,
                        "status": "VERIFIED",
                        "bbox": [0.800, 0.403, 0.030, 0.155],
                    },
                ]
            ),
            json.dumps(
                {
                    "status": "CRITICAL_CLONE_AND_GEO_VIOLATION",
                    "aph_clause": "APH 2024-27 Appendix-5 (1:6 PC Ratio) & Geo-Tagged Evidence Mandate",
                    "detected_pcs": 16,
                    "required_pcs": 30,
                    "summary": "Cross-College Clone Hunter matched this photo against Deccan College of Engineering, Nagpur (2025 EoA) with 96.9% perceptual similarity, and EXIF GPS is 618.4 km outside registered Pune campus.",
                }
            ),
            json.dumps(lab_clones),
        ),
        (
            "MEDIA-8841-CR102",
            "AICTE-2026-EOA-8841",
            "1-44928102",
            "Vishwakarma Institute of Emerging Technologies, Pune",
            0,
            "UG Classroom",
            "Lecture Hall CR-102 (AI & ML Division-B)",
            str(classroom_path),
            cr_hashes["phash"],
            cr_hashes["dhash"],
            cr_hashes["ahash"],
            cr_hashes["whash"],
            json.dumps(cr_hashes["embedding"]),
            json.dumps(cr_exif),
            cr_exif["distance_m"],
            cr_exif["geo_status"],
            json.dumps(
                [
                    {
                        "id": "CV-CR-DESKS",
                        "label": "Student Seating Capacity: 38 Seats (Shortfall vs 60 Division Norm)",
                        "confidence": 0.95,
                        "status": "CRITICAL",
                        "bbox": [0.145, 0.600, 0.720, 0.320],
                    },
                    {
                        "id": "CV-CR-BOARD",
                        "label": "Teaching Chalkboard & Display (48.0 sq.m Room)",
                        "confidence": 0.97,
                        "status": "VERIFIED",
                        "bbox": [0.260, 0.258, 0.480, 0.216],
                    },
                ]
            ),
            json.dumps(
                {
                    "status": "DEFICIENCY_FLAGGED",
                    "aph_clause": "APH 2024-27 Appendix-4 (Minimum 60 Seating & 66.0 sq.m per Division)",
                    "detected_seats": 38,
                    "required_seats": 60,
                    "summary": "EXIF GPS verified on Pune campus (53.2m from center), but CV desk count (38 seats) and floor plan area (48.0 sq.m) fail 60-student division norm.",
                }
            ),
            json.dumps([]),
        ),
        (
            "MEDIA-8841-RAMP",
            "AICTE-2026-EOA-8841",
            "1-44928102",
            "Vishwakarma Institute of Emerging Technologies, Pune",
            0,
            "Barrier-Free & Fire Safety",
            "Academic Block-A Wheelchair Ramp & Fire Hydrant",
            str(ramp_path),
            ramp_hashes["phash"],
            ramp_hashes["dhash"],
            ramp_hashes["ahash"],
            ramp_hashes["whash"],
            json.dumps(ramp_hashes["embedding"]),
            json.dumps(ramp_exif),
            ramp_exif["distance_m"],
            ramp_exif["geo_status"],
            json.dumps(
                [
                    {
                        "id": "CV-RAMP-SLOPE",
                        "label": "Barrier-Free Wheelchair Ramp (1:12 Slope + Dual Handrails)",
                        "confidence": 0.96,
                        "status": "VERIFIED",
                        "bbox": [0.150, 0.600, 0.565, 0.380],
                    },
                    {
                        "id": "CV-RAMP-TACTILE",
                        "label": "High-Contrast Tactile Guidance Paving",
                        "confidence": 0.93,
                        "status": "VERIFIED",
                        "bbox": [0.140, 0.890, 0.085, 0.095],
                    },
                    {
                        "id": "CV-RAMP-HYDRANT",
                        "label": "External Pressurized Fire Hydrant Cabinet",
                        "confidence": 0.97,
                        "status": "VERIFIED",
                        "bbox": [0.775, 0.540, 0.046, 0.156],
                    },
                ]
            ),
            json.dumps(
                {
                    "status": "COMPLIANT",
                    "aph_clause": "APH 2024-27 Chapter VII Clause 7.9 (Barrier-Free Environment)",
                    "summary": "EXIF GPS verified (14.8m from campus center). Ramp gradient, dual handrails, tactile tiles, and fire hydrant meet APH norms.",
                }
            ),
            json.dumps([]),
        ),
    ]

    cur.executemany(
        """
        INSERT INTO infrastructure_media VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        media_to_insert,
    )
    conn.commit()

    # 6. Insert Applications with Cross-Document Consistency Engine flags & APH Checklists
    applications = [
        (
            "AICTE-2026-EOA-8841",
            "1-44928102",
            "2026-2027",
            "EoA + Increase in Intake (120 → 180)",
            "2026-10-24T16:40:00Z",
            180,
            json.dumps(
                [
                    {
                        "course": "B.Tech in Computer Science & Engineering (AI & ML)",
                        "level": "UG Degree",
                        "existing_intake": 120,
                        "applied_intake": 180,
                        "noc_sanctioned_intake": 120,
                    }
                ]
            ),
            7.5,
            14820.0,
            "Action Required · 5 Advisory Flags",
            86,
            "High-priority forensic & compliance discrepancies detected: (1) State NOC QR payload specifies 120 intake whereas printed OCR text was altered to 180 in Courier font with Photoshop incremental save; (2) Fire Safety Certificate expired on 2025-03-31 in PMC registry and exhibits a SIFT copy-move cloned seal; (3) AI Computer Lab photo matched a 2025 submission from Deccan College, Nagpur (pHash dist=2, GPS 618.4 km away); (4) Classroom CR-102 measures 48.0 sq.m against APH 66.0 sq.m norm.",
            json.dumps(
                [
                    {
                        "id": "CHK-1",
                        "category": "Cross-Document Consistency",
                        "rule": "APH Clause 2.14 · Applied Intake vs State NOC & Historical EoA",
                        "status": "CRITICAL",
                        "target_type": "document",
                        "target_id": "DOC-8841-NOC",
                        "confidence": 0.99,
                        "detail": "Application Form requests 180 seats and NOC OCR prints '180', but NOC QR payload & DHTE Mumbai API confirm only 120 seats sanctioned.",
                    },
                    {
                        "id": "CHK-2",
                        "category": "X-Ray Document Forensics",
                        "rule": "SIH26261 §2 · PDF Incremental Save, Font Anomaly & ELA Splice Check",
                        "status": "CRITICAL",
                        "target_type": "document",
                        "target_id": "DOC-8841-NOC",
                        "confidence": 0.96,
                        "detail": "State NOC modified 14 days post-issue in Adobe Photoshop 25.4 (2 %%EOF trailers); intake '180' injected in Courier font over spliced JPEG patch.",
                    },
                    {
                        "id": "CHK-3",
                        "category": "Issuing Authority & Seal Forensics",
                        "rule": "APH Annexure-3 · Fire Safety Validity & SIFT Copy-Move Seal Verification",
                        "status": "CRITICAL",
                        "target_type": "document",
                        "target_id": "DOC-8841-FIRE",
                        "confidence": 0.98,
                        "detail": "PMC Fire Portal returns EXPIRED (2025-03-31). Printed date altered to 2026-12-31 and Chief Fire Officer seal is a pixel-clone of Inspector seal.",
                    },
                    {
                        "id": "CHK-4",
                        "category": "Cross-College Clone Hunter & EXIF GPS",
                        "rule": "SIH26261 §4 · Perceptual Hash Duplicate & Campus Geo-Boundary Check",
                        "status": "CRITICAL",
                        "target_type": "media",
                        "target_id": "MEDIA-8841-LAB",
                        "confidence": 0.97,
                        "detail": "Computer Lab photo matches Deccan College, Nagpur (AICTE-2025-EOA-3109, pHash similarity 96.9%) and EXIF GPS is 618.4 km from Pune campus.",
                    },
                    {
                        "id": "CHK-5",
                        "category": "Infrastructure Carpet Area & CV",
                        "rule": "APH Appendix-4 · UG Classroom >= 66.0 sq.m (1.1 sq.m/student for 60 Intake)",
                        "status": "WARNING",
                        "target_type": "document",
                        "target_id": "DOC-8841-FLOOR",
                        "confidence": 0.99,
                        "detail": "Classroom CR-102 measures 48.0 sq.m on architect blueprint (-18.0 sq.m shortfall) and CV detects only 38 student seats in classroom photo.",
                    },
                    {
                        "id": "CHK-6",
                        "category": "Statutory Undertaking & TER Fee",
                        "rule": "APH Annexure-2 · Rs. 100 e-Stamp Affidavit, Class-III DSC & TER Payment",
                        "status": "VERIFIED",
                        "target_type": "document",
                        "target_id": "DOC-8841-AFFIDAVIT",
                        "confidence": 0.99,
                        "detail": "StockHolding e-Stamp IN-MH884190221048P, NIC Class-III DSC signature, and TER Receipt TER-2026-MH-77412 (INR 3.50L) verified.",
                    },
                    {
                        "id": "CHK-7",
                        "category": "Barrier-Free Environment",
                        "rule": "APH Chapter VII Clause 7.9 · Wheelchair Ramp (1:12), Handrails & Tactile Path",
                        "status": "VERIFIED",
                        "target_type": "media",
                        "target_id": "MEDIA-8841-RAMP",
                        "confidence": 0.96,
                        "detail": "CV verified 1:12 accessibility ramp, dual handrails, tactile paving, and fire hydrant 14.8m from registered campus coordinate.",
                    },
                ]
            ),
            json.dumps(
                [
                    {
                        "field": "Sanctioned Intake (B.Tech CSE AI & ML)",
                        "app_form_value": "180 Seats",
                        "doc_ocr_value": "180 Seats (State NOC OCR)",
                        "qr_or_api_value": "120 Seats (NOC QR & DHTE API)",
                        "historical_aicte_db": "120 Seats (EoA 2025-26)",
                        "status": "MISMATCH",
                    },
                    {
                        "field": "Fire Safety Certificate Expiry",
                        "app_form_value": "2026-12-31",
                        "doc_ocr_value": "2026-12-31 (Fire NOC OCR)",
                        "qr_or_api_value": "2025-03-31 (PMC Fire API: EXPIRED)",
                        "historical_aicte_db": "2025-03-31",
                        "status": "EXPIRED",
                    },
                    {
                        "field": "Classroom CR-102 Carpet Area & Seating",
                        "app_form_value": "66.0 sq.m / 60 Seats",
                        "doc_ocr_value": "48.0 sq.m (Architect Blueprint)",
                        "qr_or_api_value": "38 Desks (CV Classroom Count)",
                        "historical_aicte_db": "Norm: >= 66.0 sq.m / 60 Seats",
                        "status": "DEFICIENT",
                    },
                    {
                        "field": "Faculty-Student Ratio (FSR)",
                        "app_form_value": "28 Faculty (1:19.2 for 180 Intake)",
                        "doc_ocr_value": "28 Regular Faculty",
                        "qr_or_api_value": "Verified via AICTE Faculty Registry",
                        "historical_aicte_db": "Norm: >= 1:20 (Minimum 27 Faculty)",
                        "status": "VERIFIED",
                    },
                    {
                        "field": "Sworn Affidavit & TER Processing Fee",
                        "app_form_value": "IN-MH884190221048P / TER-2026-MH-77412",
                        "doc_ocr_value": "INR 100 e-Stamp + Valid DSC",
                        "qr_or_api_value": "Verified (StockHolding CRA & Bharatkosh)",
                        "historical_aicte_db": "Paid INR 3,50,000",
                        "status": "VERIFIED",
                    },
                ]
            ),
        ),
        (
            "AICTE-2026-NEW-9014",
            "1-90148821",
            "2026-2027",
            "New Technical Institution (LOA)",
            "2026-10-25T11:15:00Z",
            120,
            json.dumps(
                [
                    {
                        "course": "B.Tech in Robotics & Autonomous Systems",
                        "level": "UG Degree",
                        "existing_intake": 0,
                        "applied_intake": 120,
                        "noc_sanctioned_intake": 120,
                    }
                ]
            ),
            5.2,
            11400.0,
            "Ready for Committee Approval · 1 Pending Source",
            14,
            "All uploaded certificates pass 3-Layer X-Ray Forensics (0 ELA anomalies, valid NIC DSC signatures, QR payloads match OCR 100%). Campus photos verified within 45m of Okhla New Delhi coordinates with 0 cross-college clones. Only State University Affiliation status is Pending automated API sync.",
            json.dumps(
                [
                    {
                        "id": "CHK-9014-1",
                        "category": "X-Ray Document Forensics",
                        "rule": "QR-vs-OCR Cross-Lock & ELA Integrity across 4 Dossier PDFs",
                        "status": "VERIFIED",
                        "target_type": "document",
                        "target_id": "DOC-8841-AFFIDAVIT",
                        "confidence": 0.99,
                        "detail": "Zero incremental updates, consistent Helvetica typography, and uniform ELA compression across all pages.",
                    },
                    {
                        "id": "CHK-9014-2",
                        "category": "Issuing Authority Verification",
                        "rule": "GGSIPU University Consent of Affiliation Portal Sync",
                        "status": "WARNING",
                        "target_type": "document",
                        "target_id": "DOC-8841-AFFIDAVIT",
                        "confidence": 0.91,
                        "detail": "Issuing authority API returned status `Pending` (awaiting Senate counter-signature); routed for manual confirmation.",
                    },
                ]
            ),
            json.dumps(
                [
                    {
                        "field": "Sanctioned Intake (B.Tech Robotics)",
                        "app_form_value": "120 Seats",
                        "doc_ocr_value": "120 Seats (DTTE Delhi NOC)",
                        "qr_or_api_value": "120 Seats (DigiLocker Verified)",
                        "historical_aicte_db": "New Institution (LOA)",
                        "status": "VERIFIED",
                    }
                ]
            ),
        ),
        (
            "AICTE-2026-EOA-7720",
            "1-77201943",
            "2026-2027",
            "Extension of Approval (EoA)",
            "2026-10-23T18:05:00Z",
            120,
            json.dumps(
                [
                    {
                        "course": "B.E. in Electronics & VLSI Design",
                        "level": "UG Degree",
                        "existing_intake": 120,
                        "applied_intake": 120,
                        "noc_sanctioned_intake": 120,
                    }
                ]
            ),
            6.0,
            10900.0,
            "Deficiency Notice Recommended · 2 Flags",
            62,
            "Documents are forensically authentic, but Building Completion Certificate is partial and Faculty-Student Ratio drops to 1:22.8 (shortfall of 3 Ph.D. faculty members against APH 1:20 norm).",
            json.dumps(
                [
                    {
                        "id": "CHK-7720-1",
                        "category": "Cross-Document Consistency",
                        "rule": "APH Clause 7.1 · Faculty-Student Ratio (1:20 Norm)",
                        "status": "WARNING",
                        "target_type": "document",
                        "target_id": "DOC-8841-FLOOR",
                        "confidence": 0.98,
                        "detail": "Verified faculty count is 21 against required 24 for 480 total student strength across 4 years.",
                    }
                ]
            ),
            json.dumps(
                [
                    {
                        "field": "Faculty-Student Ratio (FSR)",
                        "app_form_value": "24 Faculty",
                        "doc_ocr_value": "21 Regular Faculty (PAN/APAAR Verified)",
                        "qr_or_api_value": "21 Active Records",
                        "historical_aicte_db": "Norm: 24 Faculty (1:20)",
                        "status": "DEFICIENT",
                    }
                ]
            ),
        ),
    ]

    cur.executemany(
        """
        INSERT INTO applications VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        applications,
    )
    conn.commit()
    conn.close()

    # 7. Seed Immutable Cryptographic Audit Log Entries
    append_audit_log(
        app_id="AICTE-2026-EOA-8841",
        actor_role="SYSTEM · VERITAS OCR & CONSISTENCY ENGINE",
        actor_name="Veritas Pipeline v2.4 (PyMuPDF + APH Rule Engine)",
        action_type="CROSS_DOC_CONSISTENCY_CHECK",
        target_id="DOC-8841-NOC",
        rule_id="APH-2024-2.14.3",
        ai_confidence=0.99,
        status_after="Mismatch Detected",
        rationale="Extracted printed intake '180' contradicts embedded QR JSON payload ('approved_intake': 120) and historical AICTE EoA 2025-26 record (120 seats).",
        timestamp="2026-10-26T09:12:04Z",
    )
    append_audit_log(
        app_id="AICTE-2026-EOA-8841",
        actor_role="SYSTEM · 3-LAYER X-RAY FORENSICS",
        actor_name="Veritas Forensics (OpenCV ELA + pikepdf + SIFT)",
        action_type="FORENSIC_ANOMALY_FLAGGED",
        target_id="DOC-8841-NOC",
        rule_id="FORENSIC-ELA-FONT-01",
        ai_confidence=0.96,
        status_after="Advisory Flag Raised",
        rationale="Detected 2 incremental %%EOF trailers, '/Producer: Adobe Photoshop 25.4', Courier-Bold span injection on '180 Seats', and 90% JPEG ELA z-score = 5.8 hotspot.",
        timestamp="2026-10-26T09:12:05Z",
    )
    append_audit_log(
        app_id="AICTE-2026-EOA-8841",
        actor_role="SYSTEM · ISSUING AUTHORITY CONNECTOR",
        actor_name="PMC Fire & Emergency Services API Gateway",
        action_type="SOURCE_API_VERIFICATION",
        target_id="DOC-8841-FIRE",
        rule_id="AUTH-PMC-FIRE-4102",
        ai_confidence=1.0,
        status_after="Expired",
        rationale="Authoritative source returned HTTP 200: Certificate FIRE-MH-PUN-2023-4102 expired on 2025-03-31. SIFT Copy-Move detector also matched 34 keypoints across dual seals.",
        timestamp="2026-10-26T09:12:07Z",
    )
    append_audit_log(
        app_id="AICTE-2026-EOA-8841",
        actor_role="SYSTEM · CLONE HUNTER & EXIF GEO-VERIFIER",
        actor_name="Veritas CV Engine (imagehash pHash + pgvector 128D)",
        action_type="CROSS_COLLEGE_CLONE_DETECTED",
        target_id="MEDIA-8841-LAB",
        rule_id="CV-CLONE-PHASH-04",
        ai_confidence=0.97,
        status_after="Clone & Geo Violation",
        rationale="pHash Hamming distance = 2 (96.9% similarity) against MEDIA-HIST-3109-LAB (Deccan College of Engineering, Nagpur). EXIF GPS (21.1458°N, 79.0882°E) is 618.4 km outside Pune campus boundary.",
        timestamp="2026-10-26T09:12:09Z",
    )
    append_audit_log(
        app_id="AICTE-2026-EOA-8841",
        actor_role="AICTE SCRUTINY OFFICER",
        actor_name="Shri V. K. Subramanian (Regional Officer, WRO)",
        action_type="HUMAN_IN_THE_LOOP_QUEUE",
        target_id="AICTE-2026-EOA-8841",
        rule_id="STATUTORY-SAFEGUARD-01",
        ai_confidence=None,
        status_after="Awaiting Officer Decision",
        rationale="All AI findings queued as advisory evidence indicators. Statutory show-cause / EVC physical inspection requires explicit Scrutiny Officer sign-off.",
        timestamp="2026-10-26T09:15:00Z",
    )
