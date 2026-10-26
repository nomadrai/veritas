# VERITAS — AI-Powered Application Validation, Document Forensics & Infrastructure Compliance Platform for AICTE

**Problem Statement:** SIH26261 (All India Council for Technical Education — Ministry of Education, Government of India)

Veritas acts as an explainable, evidence-linked pre-scrutiny copilot for AICTE Scrutiny Officers, Expert Visit Committees (EVC), and Institutional Nodal Officers. Every AI finding is presented as an advisory flag linked to concrete visual and cryptographic evidence—never an opaque black-box rejection—while final statutory authority remains with AICTE officials.

---

## Live Running Services

- **Frontend Workbench (Next.js 15 + TypeScript + Tailwind CSS):** `http://localhost:3000`
- **Backend AI / Forensics / CV Pipeline (FastAPI + OpenCV + PyMuPDF + pikepdf + imagehash):** `http://localhost:8000` (Swagger Docs at `http://localhost:8000/docs`)

### Starting Manually
```bash
# 1. Start the Python FastAPI Forensics & CV Backend (Port 8000)
cd backend
./.venv/bin/uvicorn main:app --host 127.0.0.1 --port 8000

# 2. Start the Next.js Scrutiny Workbench (Port 3000)
cd frontend
npm run dev
```

---

## Core Modules & Open-Source Forensic Stack Implemented

1. **Intelligent OCR & Cross-Document Consistency Engine (`backend/forensics_engine.py`, `backend/seed_generator.py`)**
   - Uses `PyMuPDF` (`get_text("dict")`) to extract key fields (`Institution ID`, `Sanctioned Intake`, `Course Name`, `Certificate No`, `Issue/Expiry Dates`, `Carpet Area sq.m`) along with exact normalized bounding boxes.
   - Reconciles extracted fields four ways across: **(a) Application Form**, **(b) Printed Document OCR**, **(c) Embedded QR / Issuing Authority API**, and **(d) Historical AICTE EoA Database & APH 2024–2027 Norms**.

2. **3-Layer "X-Ray" Document Forensics (`backend/forensics_engine.py`)**
   - **Layer 1 · QR-vs-OCR Cross-Lock:** Uses OpenCV `cv2.QRCodeDetector()` with multi-pass thresholding to decode embedded QR payloads and draw orthogonal SVG cross-lock tethers on the optical canvas when the QR payload (`approved_intake: 120` or `valid_upto: 2025-03-31`) contradicts printed OCR text (`180 Seats` or `2026-12-31`).
   - **Layer 2 · PDF Structural, Incremental Save & Span-Level Font Forensics:** Uses `pikepdf` and `PyMuPDF` to inspect `/Producer`, `/Creator`, `/CreationDate` vs `/ModDate` deltas, raw `%%EOF` incremental update trailers, PKCS#7 `/Sig` status, and span-level typography—catching injected `Courier` spans inside `Helvetica` certificates.
   - **Layer 3 · Visual Tamper Heatmap (ELA + Laplacian Noise Grid + SIFT Copy-Move):**
     - **Error Level Analysis (ELA):** Live configurable JPEG recompression (`50%–98%` quality, `6×–38×` gain) with 16×16 block z-score clustering to localize spliced text/signatures.
     - **Laplacian Noise Variance Grid (8×8):** High-pass sensor/scanner noise consistency analysis (inspired by *Sherloq* / *Splicebuster* / Mahdian & Saic) to highlight digital overlays.
     - **SIFT Copy-Move Forgery Detection:** OpenCV `SIFT_create()` + `BFMatcher` knnMatch + Lowe's ratio test + spatial displacement clustering to detect cloned official stamps/seals on the same certificate.

3. **Issuing Authority Source Verification (`POST /api/authority/verify/{doc_id}`)**
   - Connects to simulated authoritative endpoints (DigiLocker / Maharashtra DHTE e-NOC Portal, Pune Municipal Corporation Fire Portal, Council of Architecture Registry, StockHolding e-Stamping CRA) and classifies status into: `Verified`, `Mismatch Detected`, `Expired`, `Pending`, or `Manual Review Required`.

4. **Infrastructure Computer Vision, EXIF Geo-Temporal Verifier & "Cross-College Clone Hunter" (`backend/cv_engine.py`)**
   - **Cross-College Clone Hunter:** Computes 64-bit Perceptual Hash (`pHash`), Difference Hash (`dHash`), Average Hash (`aHash`), Wavelet Hash (`wHash`) via `imagehash`, plus a 128-D normalized spatial color/gradient feature vector (`schema_pgvector.sql` compatible with PostgreSQL `pgvector`). Catches `MEDIA-8841-LAB` as a 96.9% clone (`pHash` Hamming distance = 8, Cosine Similarity = 100%) of a historical 2025 EoA photo from *Deccan College of Engineering, Nagpur*.
   - **EXIF Geo-Temporal Verification:** Uses `exifread` and WGS84 Haversine distance calculation to verify photo GPS coordinates against the institution's 500m registered campus boundary (catching the Nagpur GPS coordinates `624.1 km` away from the registered Pune campus).
   - **AICTE APH 2024–2027 CV & Floor Plan Checks:** Evaluates UG Classroom carpet area (`CR-102 = 48.0 sq.m` vs required `66.0 sq.m` for 60 intake), student seating count (`38` vs `60`), computer terminal ratio, fire safety gear, and 1:12 barrier-free wheelchair ramp norms.

5. **Explainable Split-Screen Scrutiny Workbench, Live Upload Sandbox & SHA-256 Audit Trail**
   - Role switcher between **AICTE Scrutiny Officer** and **Institution Nodal Officer**.
   - **Live Upload Lab (`POST /api/live-analyze`):** Upload any custom PDF or JPEG/PNG (or trigger 1-click synthetic specimens) to run the entire Python OpenCV + PyMuPDF + `imagehash` pipeline live.
   - **Immutable Audit Trail:** Every automated rule check, authority API response, and human officer decision/override is chained with SHA-256 (`prev_hash` → `entry_hash`).
