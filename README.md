<div align="center">

# VERITAS

### AI-Powered Application Validation, 3-Layer Document Forensics, and Infrastructure Compliance Verification Platform for AICTE

[![Live Demo on Vercel](https://img.shields.io/badge/Live_Demo-veritas--aicte.vercel.app-1E3A8A?style=for-the-badge&logo=vercel&logoColor=white)](https://veritas-aicte.vercel.app)
[![Problem Statement](https://img.shields.io/badge/SIH_2026-PS_SIH26261-1D4ED8?style=for-the-badge)](https://veritas-aicte.vercel.app)
[![Next.js](https://img.shields.io/badge/Next.js_16-TypeScript-0F172A?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-OpenCV_&_PyMuPDF-0F766E?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-B45309?style=for-the-badge)](./LICENSE)

**[Live Deployed Application](https://veritas-aicte.vercel.app)** · **[11-Page Technical Dossier (PDF)](./Veritas_AICTE_SIH26261_Technical_Dossier.pdf)** · **[Master Implementation Plan](./IMPLEMENTATION_PLAN.md)** · **[Design System Spec](./DESIGN.md)**

</div>

---

## 1. Overview & Product Vision

**Veritas** is an explainable, evidence-linked pre-scrutiny copilot built for the **All India Council for Technical Education (AICTE)**, Ministry of Education, Government of India (**Problem Statement: SIH26261**).

When technical institutions apply for **Extension of Approval (EoA)**, **Increase in Intake**, or **New Institution Approval (LOA)** and upload supporting PDFs (State Government NOCs, Municipal Fire Safety Certificates, Sworn e-Stamp Affidavits, Architect-Certified Floor Plans) alongside geotagged campus photographs, Veritas automatically:
1. Validates application fields against the **AICTE Approval Process Handbook (APH 2024 to 2027)** and historical institutional records.
2. Runs **3-Layer "X-Ray" Document Forensics** to expose altered intake numbers, modified dates, font mismatches, incremental PDF edits, and cloned official seals.
3. Verifies certificates directly against simulated/authorized **Issuing Authority Gateways** (DigiLocker, State Higher Education Portals, Municipal Fire Services, Council of Architecture).
4. Inspects physical infrastructure using **Computer Vision**, **EXIF WGS84 Haversine GPS Verification**, and a national **Cross-College Clone Hunter** (`pHash` + 128-D `pgvector` embeddings).

> **Human-in-the-Loop Statutory Safeguard:** All AI and forensic findings are presented as **evidence-linked advisory flags** tied to exact bounding-box coordinates and APH clause citations. Final scrutiny, EVC physical inspection directives, and regulatory decisions remain exclusively with competent AICTE authorities.

---

## 2. Live Portal Walkthrough (5 Dedicated Pages)

Veritas is designed around a **daylight-first Civic GovTech UI** organized into five purpose-built pages so AICTE Scrutiny Officers and Institution Nodal Officers can work clearly and efficiently:

### Page 1: AICTE Scrutiny Queue & Daily Triage (`/`)
The landing workspace for AICTE staff. Displays assigned institutional dossiers ranked by pre-scrutiny risk, status filter tabs (`All Dossiers`, `Needs Review`, `Ready to Approve`), a 4-step workflow guide, and a Priority Findings sidebar with direct deep links to flagged exhibits.

![Page 1: AICTE Scrutiny Queue](./docs/screenshots/page1_queue.png)

### Page 2: Application Checklist & 4-Way Consistency Matrix (`/applications/[appId]`)
Reconciles key institutional parameters across four sources (**Application Form** vs. **Printed Document OCR** vs. **Decoded QR / Authority API** vs. **Historical AICTE DB**), evaluates the clause-by-clause **APH 2024 to 2027 Checklist**, provides one-click **Issuing Authority Portal Re-Verification**, and records cryptographically signed officer dispositions.

![Page 2: Application Checklist and Consistency Table](./docs/screenshots/page2_checklist.png)

### Page 3: 3-Layer Document Forensics Studio (`/forensics`)
Dedicated certificate inspection studio featuring interactive view modes (**Annotated Certificate**, **QR vs. Text Cross-Lock** with orthogonal SVG connector tethers, **Tamper Heatmap (ELA)** with live JPEG quality and contrast sliders, and **Seal Duplication Check**) paired with a plain-English 3-layer forensic breakdown.

![Page 3: 3-Layer Document Forensics Studio](./docs/screenshots/page3_forensics.png)

### Page 4: Infrastructure Computer Vision & Cross-College Clone Hunter (`/infrastructure`)
Inspects campus and laboratory photographs against APH equipment and carpet-area norms, verifies **EXIF GPS coordinates** against the institution's 500m registered campus boundary, and provides a **Side-by-Side Cross-College Clone Comparator** when duplicate photos are detected across institutions.

![Page 4: Infrastructure CV and Clone Hunter](./docs/screenshots/page4_infrastructure.png)

### Page 5: Nodal Officer Pre-Submission Self-Check & Audit Log (`/portal`)
Allows **Institution Nodal Officers** to upload draft PDFs or JPEG/PNG campus photos (or run 1-click synthetic test specimens) for instant pre-scrutiny validation before formal submission, and displays the **Immutable SHA-256 Hash-Chained Regulatory Audit Trail**.

---

## 3. Core Modules & Unique Selling Propositions (USPs)

| Module | Core USP | Technical Mechanism |
|---|---|---|
| **Module 1: OCR & Consistency Engine** | **4-Way Semantic Reconciliation** | Uses `PyMuPDF` (`get_text("dict")` & `find_tables()`) to extract fields and normalized `[x, y, w, h]` bounding boxes, cross-checking Application Form values against Printed OCR, QR Payloads, and AICTE Historical EoA records. |
| **Module 2: 3-Layer Document Forensics** | **QR-vs-OCR Cross-Lock + PDF Container + Pixel ELA/SIFT** | **Layer 1:** Multi-pass OpenCV `QRCodeDetector` + CLAHE homography dewarping compares signed QR JSON payloads against printed OCR text.<br>**Layer 2:** `pikepdf` & `pyHanko`-style inspection of `%%EOF` incremental saves, `/Producer` tags (`Adobe Photoshop`), `/ModDate` deltas, and span-level font anomalies (`Courier` injected into `Helvetica`).<br>**Layer 3:** JPEG Recompression Error Level Analysis (ELA) $z$-score clustering, Multi-Quality JPEG Ghost Maps, 8x8 Laplacian Noise Variance Grids, and SIFT Keypoint Copy-Move seal duplication detection. |
| **Module 3: Issuing Authority Sync** | **5-State Statutory Registry Verification** | Connects to simulated authoritative endpoints (DigiLocker / Maharashtra DHTE e-NOC, Municipal Fire Portal, Council of Architecture, StockHolding e-Stamp) and classifies status into `Verified`, `Mismatch Detected`, `Expired`, `Pending`, or `Manual Review Required`. |
| **Module 4: Infrastructure CV & Clone Hunter** | **Multi-Patch `pHash` + 128-D `pgvector` + EXIF Haversine GPS** | Computes 64-bit `pHash`, `dHash`, `aHash`, `wHash` (including 9-region multi-crop and horizontal flip signatures) plus 128-D spatial color/Sobel feature vectors to catch recycled lab photos across colleges. Extracts EXIF GPS coordinates via `exifread` to verify distance from the registered campus center. |
| **Module 5: Explainable Audit Ledger** | **SHA-256 Hash-Chained Decisions** | Every automated rule check, AI confidence score, authority API response, and officer override is chained with SHA-256 (`prev_hash` -> `entry_hash`). |

---

## 4. Technology Stack

| Layer | Technologies Used |
|---|---|
| **Frontend Portal** | `Next.js 16` (App Router), `React 19`, `TypeScript 5.7`, `Tailwind CSS 3.4`, `Lucide Icons`, Interactive SVG/Canvas Forensics & 3D Blueprint Extrusion |
| **Backend API** | `Python 3.12+`, `FastAPI`, `Uvicorn`, `Pydantic v2`, `python-multipart` |
| **PDF & Cryptographic Forensics** | `PyMuPDF (fitz) 2.0`, `pikepdf 10.17` (QPDF C++ bindings), `pyHanko` incremental revision & signature diff patterns |
| **Image Forensics & Computer Vision** | `OpenCV 5.0` (`cv2`), `NumPy`, `SciPy`, `Pillow 13.0`, `imagehash 4.3` (`PyWavelets`), `exifread 3.5`, `piexif`, `qrcode` |
| **Database & Vector Search** | `PostgreSQL 16` + `pgvector` (`vector(128)` IVFFlat cosine index in `backend/schema_pgvector.sql`) + zero-config local `SQLite3` engine |

---

## 5. Repository Structure

```text
Veritas/
├── README.md                                                # Project documentation
├── LICENSE                                                  # MIT License
├── IMPLEMENTATION_PLAN.md                                   # Multi-phase engineering roadmap & 15-tool audit
├── PRODUCT.md                                               # Product context & user roles
├── DESIGN.md                                                # Daylight Civic Portal design system specification
├── Veritas_AICTE_SIH26261_Technical_Dossier.pdf             # 11-Page Technical & Product Dossier PDF
├── docker-compose.yml                                       # PostgreSQL (pgvector) + Backend + Frontend stack
├── backend/
│   ├── main.py                                              # FastAPI server & REST endpoints
│   ├── database.py                                          # SQLite persistence & SHA-256 audit logger
│   ├── schema_pgvector.sql                                  # PostgreSQL + pgvector production DDL
│   ├── forensics_engine.py                                  # 3-Layer X-Ray Document Forensics engine
│   ├── cv_engine.py                                         # Clone Hunter (pHash + 128-D) & EXIF GPS verifier
│   ├── seed_generator.py                                    # Programmatic synthetic PDF & geotagged photo generator
│   ├── requirements.txt                                     # Python dependencies
│   └── pipelines/                                           # Modular Phase 1-4 pipeline extensions
│       ├── forensics/jpeg_ghost.py                          # Multi-quality JPEG Ghost & 2D Resampling detector
│       ├── pdf_crypto/pyhanko_verifier.py                   # PDF revision tree & font subset inspector
│       ├── ocr_layout/table_extractor.py                    # Native table-cell bbox parser & QR dewarper
│       ├── clone_hunter/multipatch_indexer.py               # 9-Region crop/flip-invariant perceptual hasher
│       ├── infra_cv/detector_supervision.py                 # 2D-to-3D floorplan room extruder & zone occupancy
│       └── reporting/show_cause_generator.py                # Automated AICTE Show-Cause Notice PDF generator
└── frontend/
    └── src/
        ├── app/
        │   ├── page.tsx                                     # Page 1: AICTE Scrutiny Queue & Triage
        │   ├── applications/[appId]/page.tsx                # Page 2: APH Checklist & 4-Way Consistency
        │   ├── forensics/page.tsx                           # Page 3: 3-Layer Document Forensics Studio
        │   ├── infrastructure/page.tsx                      # Page 4: Infrastructure CV & Clone Comparator
        │   ├── portal/page.tsx                              # Page 5: Nodal Self-Check & SHA-256 Audit Log
        │   └── api/[...slug]/route.ts                       # FastAPI proxy + serverless snapshot handler
        └── components/
            ├── AppShell.tsx                                 # Shared 5-page Civic GovTech navigation shell
            ├── LiveUploadSandbox.tsx                        # Live file upload diagnostic component
            ├── floorplan3d/Blueprint3DViewer.tsx            # Interactive 2D-to-3D room norm extruder
            └── forensics/ForensicLoupe.tsx                  # Optical magnifier loupe component
```

---

## 6. Local Development & Quickstart

### 1. Start the Python FastAPI Forensics & CV Backend (Port 8000)

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Starts FastAPI on http://127.0.0.1:8000 and auto-generates synthetic AICTE PDFs & EXIF JPEGs
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

### 2. Start the Next.js Multi-Page Portal (Port 3000)

```bash
cd frontend
npm install
npm run dev
```

Open **`http://localhost:3000`** in your browser, or explore the live cloud deployment at **`https://veritas-aicte.vercel.app`**.

---

## 7. License

Distributed under the **MIT License**. See [`LICENSE`](./LICENSE) for full details.
