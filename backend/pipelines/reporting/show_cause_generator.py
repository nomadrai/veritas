"""
Phase 4 Scaffold: Automated AICTE Statutory Deficiency & Show-Cause Notice PDF Generator
========================================================================================
Generates an official downloadable PDF summary of all evidence-linked advisory flags,
4-way consistency mismatches, and SHA-256 audit hashes for committee issuance.
"""

from typing import Any, Dict
import pymupdf


def generate_deficiency_notice_pdf_bytes(dossier: Dict[str, Any]) -> bytes:
    """
    Builds a formatted AICTE Pre-Scrutiny Deficiency Notice PDF from a DossierPayload dict.
    """
    doc = pymupdf.open()
    page = doc.new_page(width=595, height=842)

    app = dossier.get("application", {})
    inst = dossier.get("institution", {})

    page.draw_rect(pymupdf.Rect(28, 28, 567, 96), color=(0.11, 0.22, 0.54), fill=(0.11, 0.22, 0.54))
    page.insert_text(
        (44, 52),
        "ALL INDIA COUNCIL FOR TECHNICAL EDUCATION (AICTE) · NEW DELHI",
        fontsize=11,
        fontname="helv",
        color=(1, 1, 1),
    )
    page.insert_text(
        (44, 70),
        f"VERITAS PRE-SCRUTINY DEFICIENCY & SHOW-CAUSE REPORT · {app.get('app_id', '')}",
        fontsize=9,
        fontname="helv",
        color=(0.85, 0.92, 1.0),
    )
    page.insert_text(
        (44, 86),
        f"Institution: {inst.get('name', '')} ({inst.get('inst_id', '')}) · Risk Index: {app.get('risk_score', 0)}/100",
        fontsize=8.5,
        fontname="helv",
        color=(0.98, 0.85, 0.42),
    )

    y = 122
    page.insert_text((40, y), "IDENTIFIED STATUTORY & FORENSIC DEFICIENCIES (APH 2024-2027):", fontsize=10, fontname="helv", color=(0.1, 0.15, 0.25))
    y += 20

    for item in app.get("checklist", []):
        status = item.get("status", "INFO")
        rule = item.get("rule", "")
        detail = item.get("detail", "")
        page.draw_rect(pymupdf.Rect(40, y, 555, y + 48), color=(0.8, 0.84, 0.88), fill=(0.98, 0.98, 0.99), width=0.6)
        page.insert_text((48, y + 16), f"[{status}] {rule}", fontsize=9, fontname="helv", color=(0.72, 0.1, 0.1) if status == "CRITICAL" else (0.1, 0.2, 0.3))
        page.insert_text((48, y + 32), detail[:95], fontsize=8, fontname="helv", color=(0.25, 0.3, 0.35))
        y += 56
        if y > 740:
            break

    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes
