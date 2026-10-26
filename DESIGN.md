---
name: Veritas — AICTE Pre-Scrutiny & Compliance Portal
description: Daylight-First Multi-Page Civic GovTech Portal for AI Application Validation, 3-Layer Document Forensics & Infrastructure Compliance (SIH26261)
colors:
  aicte-navy: "#1E3A8A"
  cobalt: "#1D4ED8"
  cobalt-surface: "#EFF6FF"
  vermilion: "#B91C1C"
  vermilion-surface: "#FEF2F2"
  amber: "#B45309"
  amber-surface: "#FFFBEB"
  veridian: "#0F766E"
  veridian-surface: "#F0FDFA"
  canvas: "#F8FAFC"
  surface: "#FFFFFF"
  surface-muted: "#F1F5F9"
  border-subtle: "#E2E8F0"
  border-strong: "#CBD5E1"
  ink: "#0F172A"
  ink-secondary: "#334155"
  ink-muted: "#64748B"
typography:
  headline:
    fontFamily: "'Public Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.3
  title:
    fontFamily: "'Public Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "1rem"
    fontWeight: 700
    lineHeight: 1.4
  body:
    fontFamily: "'Public Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "'JetBrains Mono', 'Fira Code', 'SFMono-Regular', Consolas, monospace"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.3
rounded:
  sm: "6px"
  md: "8px"
  lg: "12px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.aicte-navy}"
    textColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: "10px 16px"
  button-affirmative:
    backgroundColor: "{colors.veridian}"
    textColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-adverse-isolated:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.vermilion}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
---

# Design System: Veritas — AICTE Pre-Scrutiny & Compliance Portal

## Overview

**Creative North Star: "The Daylight Civic Regulatory Portal & Multi-Page Scrutiny Suite"**

Veritas is designed for AICTE Scrutiny Officers, Expert Visit Committees (EVC), and Institutional Nodal Officers working through high-volume Extension of Approval (EoA) and New Institution submissions. Instead of crowding every tool into a single dark console, Veritas organizes the workflow across **five dedicated, daylight-first pages**:
1. **Scrutiny Queue (`/`)**: The officer's daily landing triage queue showing submitted dossiers, readiness status, and priority findings requiring attention.
2. **Application Checklist (`/applications/[appId]`)**: 4-way Cross-Document Consistency Table, APH 2024–2027 Checklist, Issuing Authority Portal Sync, and Officer Decision Sign-Off.
3. **Document Verification (`/forensics`)**: Dedicated 3-Layer Document Forensics Studio (QR vs. Printed Text Cross-Lock, PDF Revision & Font Check, and Error Level Analysis / Seal Duplication).
4. **Infrastructure & Photos (`/infrastructure`)**: Computer Vision equipment detection, EXIF GPS campus boundary verification, and Side-by-Side Cross-College Clone Comparison.
5. **Upload & Audit Log (`/portal`)**: Nodal Officer pre-submission self-check uploader and the immutable SHA-256 hash-chained regulatory audit log.

**Key Characteristics:**
- Daylight-first civic palette (`#F8FAFC` slate-alabaster canvas with `#FFFFFF` elevated cards and `#1E3A8A` AICTE Navy accents).
- Purpose-built multi-page navigation bar separating daily triage from deep forensic and computer-vision inspection.
- Plain-English regulatory explanations paired with tabular monospace (`JetBrains Mono`) strictly for certificate IDs, GPS distances, perceptual hashes, and SHA-256 digests.

## Colors

### Primary
- **AICTE Civic Navy** (`#1E3A8A`) & **Interactive Cobalt** (`#1D4ED8`): Used for primary navigation indicators, primary workflow CTAs, and active document/facility selection states.

### Secondary
- **Verified Veridian** (`#0F766E` on `#F0FDFA`): Confirms compliant APH checks, verified authority API responses, and on-campus GPS coordinates.
- **Discrepancy Vermilion** (`#B91C1C` on `#FEF2F2`): Signals QR-vs-OCR mismatches, expired certificates, cross-college duplicate photos, and show-cause notices.
- **Shortfall Amber** (`#B45309` on `#FFFBEB`): Marks carpet-area shortfalls, pending authority syncs, and EVC inspection routing.

### Neutral
- **Portal Canvas** (`#F8FAFC`), **Card Surface** (`#FFFFFF`), and **Inspection Well** (`#F1F5F9`).
- **Structural Borders** (`#E2E8F0` / `#CBD5E1`) and **Slate Ink Hierarchy** (`#0F172A`, `#334155`, `#64748B`).

## Typography

**Body & UI Font:** Public Sans (`'Public Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`)
**Telemetry & Hash Font:** JetBrains Mono (`'JetBrains Mono', Consolas, monospace`)

## Layout

Multi-page responsive container (`max-w-[1440px]`) with a sticky top header and 5-tab primary navigation bar. Pages use 12-column responsive grids (`8:4` on the Scrutiny Queue and Infrastructure pages; `7:5` on the Document Forensics Studio) that stack cleanly into a single column below `1024px`.

## Elevation & Depth

Cards rest on `#F8FAFC` with `1px` solid `#E2E8F0` borders and subtle ambient elevation (`shadow-sm`), while inspected certificate and photograph specimens sit inside a recessed `#F1F5F9` well with `shadow-md` separation.

## Shapes

Friendly, approachable civic geometry: `12px` (`rounded-xl`) on primary section containers, `8px` (`rounded-lg`) on buttons and interactive sub-cards, and `9999px` (`rounded-full`) on status pills.

## Components

### Buttons
- **Primary (`button-primary`):** Solid `#1E3A8A` background, white text, `8px` radius.
- **Affirmative (`button-affirmative`):** Solid `#0F766E` background, white text, `8px` radius.
- **Adverse / Show-Cause (`button-adverse-isolated`):** Spatially isolated at the far right of the decision dock; `#FFFFFF` background with `1px` solid `#B91C1C` border and text, filling to `#B91C1C` on hover.

## Do's and Don'ts

### Do:
- **Do** present the Scrutiny Queue first so AICTE officers can immediately triage which institutions need attention.
- **Do** keep deep inspection tools (Document Forensics Studio, Infrastructure CV & Clone Hunter, Live Upload & Audit Trail) on dedicated pages linked from the queue and checklist.

### Don't:
- **Don't** cram all five modules into a single dark terminal screen.
- **Don't** place uppercase eyebrow/kicker labels above headings or use thick colored side borders.
