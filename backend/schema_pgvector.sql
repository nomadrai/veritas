-- Veritas (SIH26261) Production PostgreSQL + pgvector Schema
-- Supports relational AICTE scrutiny records, 128-D visual embeddings & perceptual hashes for Clone Hunter,
-- and an immutable SHA-256 hash-chained regulatory audit trail.

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS institutions (
    inst_id VARCHAR(32) PRIMARY KEY,
    name TEXT NOT NULL,
    state VARCHAR(64) NOT NULL,
    city VARCHAR(64) NOT NULL,
    campus_lat DOUBLE PRECISION NOT NULL,
    campus_lng DOUBLE PRECISION NOT NULL,
    campus_radius_m DOUBLE PRECISION DEFAULT 500.0,
    established_year INT NOT NULL,
    historical_eoa_intake INT NOT NULL,
    historical_deficiencies INT DEFAULT 0,
    faculty_count INT NOT NULL,
    ter_payment_status VARCHAR(32) DEFAULT 'PAID'
);

CREATE TABLE IF NOT EXISTS applications (
    app_id VARCHAR(32) PRIMARY KEY,
    inst_id VARCHAR(32) REFERENCES institutions(inst_id),
    academic_year VARCHAR(16) NOT NULL,
    category VARCHAR(64) NOT NULL, -- 'Extension of Approval (EoA)' | 'New Institution' | 'Increase in Intake'
    submitted_at TIMESTAMP NOT NULL,
    applied_intake INT NOT NULL,
    applied_courses JSONB NOT NULL,
    declared_land_acres DOUBLE PRECISION NOT NULL,
    declared_builtup_sqm DOUBLE PRECISION NOT NULL,
    overall_status VARCHAR(32) NOT NULL,
    risk_score INT NOT NULL,
    ai_summary TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS documents (
    doc_id VARCHAR(48) PRIMARY KEY,
    app_id VARCHAR(32) REFERENCES applications(app_id),
    doc_type VARCHAR(64) NOT NULL,
    title TEXT NOT NULL,
    file_path TEXT NOT NULL,
    issuing_authority TEXT NOT NULL,
    cert_number VARCHAR(64),
    issue_date VARCHAR(32),
    expiry_date VARCHAR(32),
    authority_status VARCHAR(32) NOT NULL, -- 'Verified' | 'Mismatch Detected' | 'Expired' | 'Pending' | 'Manual Review Required'
    forensic_score INT NOT NULL,
    extracted_fields JSONB NOT NULL,
    qr_payload JSONB,
    pdf_metadata JSONB NOT NULL,
    forensic_findings JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS infrastructure_media (
    media_id VARCHAR(48) PRIMARY KEY,
    app_id VARCHAR(32) REFERENCES applications(app_id),
    inst_id VARCHAR(32) REFERENCES institutions(inst_id),
    facility_type VARCHAR(64) NOT NULL,
    title TEXT NOT NULL,
    file_path TEXT NOT NULL,
    phash VARCHAR(32) NOT NULL,
    dhash VARCHAR(32) NOT NULL,
    whash VARCHAR(32) NOT NULL,
    embedding vector(128), -- pgvector 128-D normalized visual feature embedding
    exif_data JSONB NOT NULL,
    geo_distance_m DOUBLE PRECISION,
    geo_status VARCHAR(32) NOT NULL,
    cv_detections JSONB NOT NULL,
    aph_compliance JSONB NOT NULL,
    clone_matches JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_infra_embedding ON infrastructure_media
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    app_id VARCHAR(32) NOT NULL,
    actor_role VARCHAR(64) NOT NULL,
    actor_name VARCHAR(128) NOT NULL,
    action_type VARCHAR(64) NOT NULL,
    target_id VARCHAR(64) NOT NULL,
    rule_id VARCHAR(64),
    ai_confidence DOUBLE PRECISION,
    status_after VARCHAR(32) NOT NULL,
    rationale TEXT NOT NULL,
    prev_hash VARCHAR(64) NOT NULL,
    entry_hash VARCHAR(64) NOT NULL
);
