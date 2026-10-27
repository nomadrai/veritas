# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, interactive SVG/Canvas overlays, 2D-to-3D CSS/WebGL Blueprint Room Extruder (`Blueprint3DViewer.tsx`), and the **Laya System-1 Non-Autoregressive Decision Engine** (`layaEngine.ts` / `laya_engine.py`); Python FastAPI backend with OpenCV, PyMuPDF, pikepdf, imagehash, exifread, and SQLite/pgvector-compatible vector similarity storage.

## Users

- **AICTE Scrutiny Officer / Competent Authority (Primary Operate User):** Triages submitted institutional applications on the Scrutiny Queue (`/`), inspects the 4-Way Cross-Document Consistency Table and APH 2024–2027 Checklist (`/applications/[appId]`), evaluates Laya System-1 calibrated decision primitives (`choice`, `score`, `noul` + What-If Counterfactual Simulator), examines 3-Layer Document Forensics (`/forensics` with QR-vs-OCR tethers, ELA, Sherloq JPEG Ghost Maps, `pyHanko` revision trees, and 2.8× Optical Loupe), and verifies physical infrastructure (`/infrastructure` with CV equipment counts, EXIF GPS distance, Side-by-Side Clone Comparison, and 2D-to-3D Blueprint Room Extrusion) before recording an immutable SHA-256 decision.
- **Institution Nodal Officer (Secondary Operate User):** Submits new institutional application dossiers end-to-end (`/portal`) to dynamically generate the 4-Way Consistency Table and APH Checklist from OCR and forensics, or tests draft PDFs and campus photographs in the live pre-submission sandbox.

## Product Purpose

Veritas is an intelligent, explainable pre-scrutiny copilot for AICTE (Problem Statement SIH26261). It automates preliminary validation of institutional approval applications against the AICTE Approval Process Handbook (APH 2024–2027) and historical institutional records, detects potential document tampering or cross-college photo recycling, verifies certificates with issuing authorities, and synthesizes calibrated System-1 decision recommendations via Laya while retaining final regulatory authority with human officials.

## Positioning

Unlike generic OCR forms or black-box forgery detectors, Veritas cross-locks six orthogonal verification and decision streams across a 5-page Daylight Civic GovTech Portal:
1. 4-Way Cross-Document Semantic Consistency against AICTE APH norms and historical EoA records.
2. 3-Layer "X-Ray" Document Forensics combining QR payload vs. printed OCR cross-lock, `pikepdf`/`pyHanko` incremental-save & font-span inspection, and pixel-level OpenCV ELA + Sherloq JPEG Ghost Maps + 2D FFT Resampling + SIFT Copy-Move + 8×8 Laplacian Noise Grids.
3. Issuing Authority Source Verification (DigiLocker, State Higher Education NOC Portal, Municipal Fire Services, Council of Architecture Registry, StockHolding e-Stamp).
4. Infrastructure Computer Vision, 2D-to-3D Blueprint Room Norm Extrusion, and "Cross-College Clone Hunter" using 9-region perceptual hashing (`pHash`/`dHash`/`wHash` + 128-D feature embeddings) and EXIF Haversine geo-temporal boundary checks.
5. **Laya Non-Autoregressive System-1 Decision Copilot** computing RLCD-calibrated `choice`, `score` ($\mathbb{E}[S]$ rubric), and `noul` ($P(\text{true})$) primitives in a single forward pass (`19 ms`) with interactive counterfactual simulation.
6. Immutable, SHA-256 cryptographic-hash-linked regulatory audit log.
