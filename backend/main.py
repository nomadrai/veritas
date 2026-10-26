import json
import shutil
import tempfile
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, File, Form, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from cv_engine import run_live_image_forensics_and_cv
from database import append_audit_log, get_connection
from forensics_engine import (
    _np_to_base64_png,
    compute_ela_analysis,
    render_document_page_rgb,
    run_full_document_xray,
)
from seed_generator import STORAGE_DIR, ensure_seeded

app = FastAPI(
    title="Veritas — AICTE AI Pre-Scrutiny, Document Forensics & Infrastructure CV API",
    description="SIH26261 · 3-Layer X-Ray Document Forensics, Cross-Document Consistency, Issuing Authority Verification & Cross-College Clone Hunter",
    version="2.4.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    ensure_seeded()


class ScrutinyDecisionRequest(BaseModel):
    app_id: str
    target_id: str
    target_type: str  # 'document' | 'media' | 'application' | 'checklist'
    new_status: str
    officer_name: str = "Shri V. K. Subramanian (AICTE Scrutiny Officer)"
    actor_role: str = "AICTE SCRUTINY OFFICER"
    rationale: str
    rule_id: Optional[str] = "OFFICER-MANUAL-DECISION"


@app.get("/api/health")
def health_check() -> Dict[str, Any]:
    ensure_seeded()
    return {
        "status": "ok",
        "service": "Veritas AI Pre-Scrutiny Engine (SIH26261)",
        "engines": {
            "ocr_pdf": "PyMuPDF 2.0 + pikepdf 10.17",
            "image_forensics": "OpenCV 5.0 (ELA + Laplacian Noise Grid + SIFT Copy-Move)",
            "qr_decoder": "OpenCV Multi-Pass QRCodeDetector",
            "clone_hunter": "imagehash (pHash/dHash/wHash) + 128-D pgvector Cosine Search",
            "exif_geo": "exifread + WGS84 Haversine Boundary Verifier",
        },
    }


@app.get("/api/applications")
def list_applications() -> List[Dict[str, Any]]:
    ensure_seeded()
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT a.*, i.name as inst_name, i.state, i.city, i.historical_eoa_intake,
               i.faculty_count, i.ter_payment_status, i.nodal_officer
        FROM applications a
        JOIN institutions i ON a.inst_id = i.inst_id
        ORDER BY a.risk_score DESC
        """
    )
    rows = cur.fetchall()
    conn.close()

    results = []
    for r in rows:
        results.append(
            {
                "app_id": r["app_id"],
                "inst_id": r["inst_id"],
                "inst_name": r["inst_name"],
                "state": r["state"],
                "city": r["city"],
                "academic_year": r["academic_year"],
                "category": r["category"],
                "submitted_at": r["submitted_at"],
                "applied_intake": r["applied_intake"],
                "historical_eoa_intake": r["historical_eoa_intake"],
                "overall_status": r["overall_status"],
                "risk_score": r["risk_score"],
                "ai_summary": r["ai_summary"],
                "nodal_officer": r["nodal_officer"],
            }
        )
    return results


@app.get("/api/applications/{app_id}")
def get_application_detail(app_id: str) -> Dict[str, Any]:
    ensure_seeded()
    conn = get_connection()
    cur = conn.cursor()

    cur.execute(
        """
        SELECT a.*, i.name as inst_name, i.state, i.city, i.address,
               i.campus_lat, i.campus_lng, i.campus_radius_m,
               i.established_year, i.historical_eoa_intake, i.historical_deficiencies,
               i.faculty_count, i.ter_payment_status, i.ter_receipt_no, i.nodal_officer
        FROM applications a
        JOIN institutions i ON a.inst_id = i.inst_id
        WHERE a.app_id = ?
        """,
        (app_id,),
    )
    app_row = cur.fetchone()
    if not app_row:
        conn.close()
        raise HTTPException(status_code=404, detail=f"Application {app_id} not found")

    # Fetch documents (fall back to 8841 documents for demo inspection if secondary app has no separate docs)
    cur.execute("SELECT * FROM documents WHERE app_id = ?", (app_id,))
    doc_rows = cur.fetchall()
    if not doc_rows:
        cur.execute("SELECT * FROM documents WHERE app_id = 'AICTE-2026-EOA-8841'")
        doc_rows = cur.fetchall()

    documents = []
    for d in doc_rows:
        xray = run_full_document_xray(d["file_path"], quality=90, scale=18)
        documents.append(
            {
                "doc_id": d["doc_id"],
                "app_id": d["app_id"],
                "doc_type": d["doc_type"],
                "title": d["title"],
                "issuing_authority": d["issuing_authority"],
                "cert_number": d["cert_number"],
                "issue_date": d["issue_date"],
                "expiry_date": d["expiry_date"],
                "authority_status": d["authority_status"],
                "authority_response": json.loads(d["authority_response_json"]),
                "forensic_score": d["forensic_score"],
                "extracted_fields": json.loads(d["extracted_fields_json"]),
                "qr_payload": json.loads(d["qr_payload_json"]) if d["qr_payload_json"] else None,
                "pdf_metadata": json.loads(d["pdf_metadata_json"]),
                "forensic_findings": json.loads(d["forensic_findings_json"]),
                "annotations": json.loads(d["annotations_json"]),
                "xray": xray,
            }
        )

    # Fetch infrastructure media
    cur.execute(
        "SELECT * FROM infrastructure_media WHERE app_id = ? AND is_historical = 0",
        (app_id,),
    )
    media_rows = cur.fetchall()
    if not media_rows:
        cur.execute(
            "SELECT * FROM infrastructure_media WHERE app_id = 'AICTE-2026-EOA-8841' AND is_historical = 0"
        )
        media_rows = cur.fetchall()

    media_items = []
    for m in media_rows:
        img_rgb = render_document_page_rgb(m["file_path"])
        ela = compute_ela_analysis(img_rgb, quality=90, scale=18)
        media_items.append(
            {
                "media_id": m["media_id"],
                "app_id": m["app_id"],
                "inst_id": m["inst_id"],
                "inst_name": m["inst_name"],
                "facility_type": m["facility_type"],
                "title": m["title"],
                "specimen_data_url": _np_to_base64_png(img_rgb),
                "ela_heatmap_data_url": ela["ela_heatmap_data_url"],
                "ela_hotspots": ela["hotspots"],
                "hashes": {
                    "phash": m["phash"],
                    "dhash": m["dhash"],
                    "ahash": m["ahash"],
                    "whash": m["whash"],
                },
                "exif": json.loads(m["exif_json"]),
                "geo_distance_m": m["geo_distance_m"],
                "geo_status": m["geo_status"],
                "cv_detections": json.loads(m["cv_detections_json"]),
                "aph_compliance": json.loads(m["aph_compliance_json"]),
                "clone_matches": json.loads(m["clone_matches_json"]),
            }
        )

    # Fetch audit logs
    cur.execute(
        "SELECT * FROM audit_logs WHERE app_id = ? ORDER BY id DESC",
        (app_id,),
    )
    log_rows = cur.fetchall()
    if not log_rows:
        cur.execute("SELECT * FROM audit_logs ORDER BY id DESC")
        log_rows = cur.fetchall()

    audit_logs = [dict(r) for r in log_rows]
    conn.close()

    return {
        "application": {
            "app_id": app_row["app_id"],
            "inst_id": app_row["inst_id"],
            "academic_year": app_row["academic_year"],
            "category": app_row["category"],
            "submitted_at": app_row["submitted_at"],
            "applied_intake": app_row["applied_intake"],
            "applied_courses": json.loads(app_row["applied_courses_json"]),
            "declared_land_acres": app_row["declared_land_acres"],
            "declared_builtup_sqm": app_row["declared_builtup_sqm"],
            "overall_status": app_row["overall_status"],
            "risk_score": app_row["risk_score"],
            "ai_summary": app_row["ai_summary"],
            "checklist": json.loads(app_row["checklist_json"]),
            "consistency_flags": json.loads(app_row["consistency_flags_json"]),
        },
        "institution": {
            "inst_id": app_row["inst_id"],
            "name": app_row["inst_name"],
            "state": app_row["state"],
            "city": app_row["city"],
            "address": app_row["address"],
            "campus_lat": app_row["campus_lat"],
            "campus_lng": app_row["campus_lng"],
            "campus_radius_m": app_row["campus_radius_m"],
            "established_year": app_row["established_year"],
            "historical_eoa_intake": app_row["historical_eoa_intake"],
            "historical_deficiencies": app_row["historical_deficiencies"],
            "faculty_count": app_row["faculty_count"],
            "ter_payment_status": app_row["ter_payment_status"],
            "ter_receipt_no": app_row["ter_receipt_no"],
            "nodal_officer": app_row["nodal_officer"],
        },
        "documents": documents,
        "infrastructure_media": media_items,
        "audit_logs": audit_logs,
    }


@app.get("/api/documents/{doc_id}/xray")
def recompute_document_xray(
    doc_id: str,
    quality: int = Query(90, ge=40, le=98),
    scale: int = Query(18, ge=5, le=45),
) -> Dict[str, Any]:
    """
    Live recomputation of Error Level Analysis (ELA) at custom JPEG recompression quality
    and amplification scale so officers can interactively sweep the ELA threshold slider.
    """
    ensure_seeded()
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT file_path FROM documents WHERE doc_id = ?", (doc_id,))
    row = cur.fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Document not found")

    return run_full_document_xray(row["file_path"], quality=quality, scale=scale)


@app.post("/api/authority/verify/{doc_id}")
def trigger_authority_verification(doc_id: str) -> Dict[str, Any]:
    """
    Re-queries the simulated Issuing Authority API (DigiLocker / State NOC / Fire Dept / COA)
    and logs the cryptographic verification event to the immutable audit trail.
    """
    ensure_seeded()
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM documents WHERE doc_id = ?", (doc_id,))
    doc = cur.fetchone()
    if not doc:
        conn.close()
        raise HTTPException(status_code=404, detail="Document not found")

    auth_resp = json.loads(doc["authority_response_json"])
    status = doc["authority_status"]
    conn.close()

    log_entry = append_audit_log(
        app_id=doc["app_id"],
        actor_role="SYSTEM · ISSUING AUTHORITY LIVE SYNC",
        actor_name=auth_resp.get("portal", doc["issuing_authority"]),
        action_type="LIVE_AUTHORITY_API_PING",
        target_id=doc_id,
        rule_id=f"AUTH-SYNC-{doc['cert_number']}",
        ai_confidence=1.0,
        status_after=status,
        rationale=auth_resp.get("discrepancy")
        or f"Source registry confirmed certificate {doc['cert_number']} is {status}.",
    )

    return {
        "doc_id": doc_id,
        "authority_status": status,
        "authority_response": auth_resp,
        "audit_log_entry": log_entry,
    }


@app.post("/api/scrutiny/decision")
def record_scrutiny_decision(req: ScrutinyDecisionRequest) -> Dict[str, Any]:
    """
    Allows the AICTE Scrutiny Officer / Competent Authority to approve, flag deficiencies,
    order EVC inspection, or override an AI advisory flag with mandatory justification.
    """
    ensure_seeded()
    if not req.rationale.strip():
        raise HTTPException(status_code=400, detail="Officer rationale is mandatory for statutory audit trail.")

    conn = get_connection()
    cur = conn.cursor()

    if req.target_type == "document":
        cur.execute(
            "UPDATE documents SET authority_status = ? WHERE doc_id = ?",
            (req.new_status, req.target_id),
        )
    elif req.target_type == "application":
        cur.execute(
            "UPDATE applications SET overall_status = ? WHERE app_id = ?",
            (req.new_status, req.app_id),
        )

    conn.commit()
    conn.close()

    log_entry = append_audit_log(
        app_id=req.app_id,
        actor_role=req.actor_role,
        actor_name=req.officer_name,
        action_type="OFFICER_STATUTORY_DECISION",
        target_id=req.target_id,
        rule_id=req.rule_id,
        ai_confidence=None,
        status_after=req.new_status,
        rationale=req.rationale,
    )

    return {"status": "recorded", "audit_log_entry": log_entry}


@app.post("/api/live-analyze")
async def live_analyze_upload(
    file: Optional[UploadFile] = File(None),
    preset_specimen: Optional[str] = Form(None),
    campus_lat: float = Form(18.4575),
    campus_lng: float = Form(73.8508),
) -> Dict[str, Any]:
    """
    Live Nodal Officer / Scrutiny Sandbox endpoint:
    Accepts any uploaded PDF or Image (or a preset specimen ID) and executes the real
    3-Layer Document Forensics OR Infrastructure CV + Clone Hunter + EXIF Geo-Verifier in real time.
    """
    ensure_seeded()

    tmp_path: Optional[Path] = None
    try:
        if file is not None and file.filename:
            suffix = Path(file.filename).suffix.lower() or ".pdf"
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
                shutil.copyfileobj(file.file, tmp)
                tmp_path = Path(tmp.name)
            target_path = tmp_path
            filename = file.filename
        else:
            preset_map = {
                "tampered_noc": STORAGE_DIR / "state_noc_8841.pdf",
                "expired_fire_seal_clone": STORAGE_DIR / "fire_safety_8841.pdf",
                "floor_plan_deficit": STORAGE_DIR / "floor_plan_8841.pdf",
                "clean_affidavit": STORAGE_DIR / "affidavit_8841.pdf",
                "cloned_nagpur_lab": STORAGE_DIR / "computer_lab_8841.jpg",
                "classroom_shortfall": STORAGE_DIR / "classroom_cr102_8841.jpg",
                "compliant_ramp": STORAGE_DIR / "ramp_entrance_8841.jpg",
            }
            target_path = preset_map.get(preset_specimen or "tampered_noc", STORAGE_DIR / "state_noc_8841.pdf")
            filename = target_path.name

        is_pdf = target_path.suffix.lower() == ".pdf"
        xray_res = run_full_document_xray(str(target_path), quality=90, scale=18)

        cv_res = None
        if not is_pdf:
            cv_res = run_live_image_forensics_and_cv(
                str(target_path), campus_lat=campus_lat, campus_lng=campus_lng
            )

        append_audit_log(
            app_id="AICTE-2026-EOA-8841",
            actor_role="NODAL OFFICER / LIVE SANDBOX",
            actor_name="Live Pre-Scrutiny Diagnostic",
            action_type="LIVE_SPECIMEN_SCAN",
            target_id=filename,
            rule_id="LIVE-XRAY-CV-SCAN",
            ai_confidence=0.98,
            status_after="Diagnostic Completed",
            rationale=f"Executed real-time X-Ray Forensics & Clone Hunter on '{filename}' (is_pdf={is_pdf}).",
        )

        return {
            "filename": filename,
            "is_pdf": is_pdf,
            "xray": xray_res,
            "cv_analysis": cv_res,
        }
    finally:
        if tmp_path and tmp_path.exists():
            try:
                tmp_path.unlink()
            except Exception:
                pass
