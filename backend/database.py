import sqlite3
import json
import hashlib
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

DB_PATH = Path(__file__).parent / "veritas.db"


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    conn = get_connection()
    cur = conn.cursor()

    cur.executescript(
        """
        CREATE TABLE IF NOT EXISTS institutions (
            inst_id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            state TEXT NOT NULL,
            city TEXT NOT NULL,
            address TEXT NOT NULL,
            campus_lat REAL NOT NULL,
            campus_lng REAL NOT NULL,
            campus_radius_m REAL DEFAULT 500.0,
            established_year INTEGER NOT NULL,
            historical_eoa_intake INTEGER NOT NULL,
            historical_deficiencies INTEGER DEFAULT 0,
            faculty_count INTEGER NOT NULL,
            ter_payment_status TEXT DEFAULT 'PAID',
            ter_receipt_no TEXT,
            nodal_officer TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS applications (
            app_id TEXT PRIMARY KEY,
            inst_id TEXT NOT NULL,
            academic_year TEXT NOT NULL,
            category TEXT NOT NULL,
            submitted_at TEXT NOT NULL,
            applied_intake INTEGER NOT NULL,
            applied_courses_json TEXT NOT NULL,
            declared_land_acres REAL NOT NULL,
            declared_builtup_sqm REAL NOT NULL,
            overall_status TEXT NOT NULL,
            risk_score INTEGER NOT NULL,
            ai_summary TEXT NOT NULL,
            checklist_json TEXT NOT NULL,
            consistency_flags_json TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS documents (
            doc_id TEXT PRIMARY KEY,
            app_id TEXT NOT NULL,
            doc_type TEXT NOT NULL,
            title TEXT NOT NULL,
            file_path TEXT NOT NULL,
            issuing_authority TEXT NOT NULL,
            cert_number TEXT,
            issue_date TEXT,
            expiry_date TEXT,
            authority_status TEXT NOT NULL,
            authority_response_json TEXT NOT NULL,
            forensic_score INTEGER NOT NULL,
            extracted_fields_json TEXT NOT NULL,
            qr_payload_json TEXT,
            pdf_metadata_json TEXT NOT NULL,
            forensic_findings_json TEXT NOT NULL,
            annotations_json TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS infrastructure_media (
            media_id TEXT PRIMARY KEY,
            app_id TEXT NOT NULL,
            inst_id TEXT NOT NULL,
            inst_name TEXT NOT NULL,
            is_historical INTEGER DEFAULT 0,
            facility_type TEXT NOT NULL,
            title TEXT NOT NULL,
            file_path TEXT NOT NULL,
            phash TEXT NOT NULL,
            dhash TEXT NOT NULL,
            ahash TEXT NOT NULL,
            whash TEXT NOT NULL,
            embedding_json TEXT NOT NULL,
            exif_json TEXT NOT NULL,
            geo_distance_m REAL,
            geo_status TEXT NOT NULL,
            cv_detections_json TEXT NOT NULL,
            aph_compliance_json TEXT NOT NULL,
            clone_matches_json TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            app_id TEXT NOT NULL,
            actor_role TEXT NOT NULL,
            actor_name TEXT NOT NULL,
            action_type TEXT NOT NULL,
            target_id TEXT NOT NULL,
            rule_id TEXT,
            ai_confidence REAL,
            status_after TEXT NOT NULL,
            rationale TEXT NOT NULL,
            prev_hash TEXT NOT NULL,
            entry_hash TEXT NOT NULL
        );
        """
    )
    conn.commit()
    conn.close()


def append_audit_log(
    app_id: str,
    actor_role: str,
    actor_name: str,
    action_type: str,
    target_id: str,
    status_after: str,
    rationale: str,
    rule_id: Optional[str] = None,
    ai_confidence: Optional[float] = None,
    timestamp: Optional[str] = None,
) -> Dict[str, Any]:
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("SELECT entry_hash FROM audit_logs ORDER BY id DESC LIMIT 1")
    row = cur.fetchone()
    prev_hash = row["entry_hash"] if row else "0" * 64

    ts = timestamp or datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    payload = f"{ts}|{app_id}|{actor_role}|{actor_name}|{action_type}|{target_id}|{rule_id}|{ai_confidence}|{status_after}|{rationale}|{prev_hash}"
    entry_hash = hashlib.sha256(payload.encode("utf-8")).hexdigest()

    cur.execute(
        """
        INSERT INTO audit_logs (
            timestamp, app_id, actor_role, actor_name, action_type,
            target_id, rule_id, ai_confidence, status_after, rationale,
            prev_hash, entry_hash
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            ts,
            app_id,
            actor_role,
            actor_name,
            action_type,
            target_id,
            rule_id,
            ai_confidence,
            status_after,
            rationale,
            prev_hash,
            entry_hash,
        ),
    )
    log_id = cur.lastrowid
    conn.commit()
    conn.close()

    return {
        "id": log_id,
        "timestamp": ts,
        "app_id": app_id,
        "actor_role": actor_role,
        "actor_name": actor_name,
        "action_type": action_type,
        "target_id": target_id,
        "rule_id": rule_id,
        "ai_confidence": ai_confidence,
        "status_after": status_after,
        "rationale": rationale,
        "prev_hash": prev_hash,
        "entry_hash": entry_hash,
    }
