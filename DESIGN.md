---
name: Veritas — AICTE Pre-Scrutiny & Forensics Workbench
description: Explainable AI Application Validation, 3-Layer X-Ray Document Forensics & Infrastructure Compliance Copilot for AICTE (SIH26261)
colors:
  cobalt: "#1D4ED8"
  cobalt-surface: "#EFF6FF"
  vermilion: "#B91C1C"
  vermilion-surface: "#FEF2F2"
  amber: "#B45309"
  amber-surface: "#FFFBEB"
  veridian: "#0F766E"
  veridian-surface: "#F0FDFA"
  paper: "#F5F4F0"
  paper-elevated: "#FFFFFF"
  paper-sunken: "#ECEAE3"
  paper-border: "#D5D2C8"
  chamber: "#10141A"
  chamber-stage: "#0D1117"
  chamber-panel: "#171C24"
  chamber-border: "#262E3B"
  ink: "#14181F"
  ink-secondary: "#3F4756"
  ink-muted: "#5E6778"
typography:
  headline:
    fontFamily: "'Public Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "1rem"
    fontWeight: 700
    lineHeight: 1.35
  title:
    fontFamily: "'Public Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "'Public Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "'JetBrains Mono', 'Fira Code', 'SFMono-Regular', Consolas, monospace"
    fontSize: "0.6875rem"
    fontWeight: 600
    lineHeight: 1.3
rounded:
  none: "0px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
components:
  button-affirmative:
    backgroundColor: "{colors.veridian}"
    textColor: "{colors.paper-elevated}"
    rounded: "{rounded.none}"
    padding: "4px 10px"
  button-advisory:
    backgroundColor: "{colors.amber-surface}"
    textColor: "{colors.amber}"
    rounded: "{rounded.none}"
    padding: "4px 10px"
  button-adverse-isolated:
    backgroundColor: "transparent"
    textColor: "{colors.vermilion}"
    rounded: "{rounded.none}"
    padding: "4px 10px"
  button-stage-active:
    backgroundColor: "{colors.cobalt}"
    textColor: "{colors.paper-elevated}"
    rounded: "{rounded.none}"
    padding: "4px 10px"
---

# Design System: Veritas — AICTE Pre-Scrutiny & Forensics Workbench

## Overview

**Creative North Star: "The National Forensic Light-Table & Statutory Comparator Workbench"**

Veritas is built for high-consequence regulatory scrutiny under the All India Council for Technical Education (AICTE) Approval Process Handbook (APH 2024–2027). Rather than treating document validation as a generic SaaS dashboard with decorative gauges or opaque AI scores, Veritas divides the workspace into two physically grounded zones: a warm alabaster **Statutory Dossier Ledger** (`#F5F4F0`) for reading multi-document checklists and consistency tables under bright office lighting, and a calibrated dark **Optical Inspection Chamber** (`#10141A` / `#0D1117`) for inspecting high-DPI PDF certificates, Error Level Analysis (ELA) heatmaps, SIFT copy-move vectors, and computer-vision bounding boxes without glare.

Every panel is separated by crisp `1px` structural hairline seams rather than floating card shadows. Semantic color is reserved strictly for evidentiary state (`● VERIFIED`, `▲ CRITICAL / MISMATCH`, `◆ DEFICIENCY`), and adverse regulatory actions are physically isolated from routine confirmation buttons to prevent accidental clicks during high-volume EoA scrutiny cycles.

**Key Characteristics:**
- Dual-zone polarity pairing warm statutory paper (`#F5F4F0`) with a dark optical comparator chamber (`#10141A`).
- Zero-radius (`0px`) rectilinear precision with `1px` hairline structural borders across all panels, tables, and controls.
- Orthogonal SVG cross-lock tethers connecting decoded QR code payloads directly to conflicting printed OCR spans on the document specimen.
- Live parameter calibration sliders (`JPEG Q`, `GAIN`, `ELA MIX`) driving real-time OpenCV recompression overlays alongside a monospaced `(X, Y)` cursor coordinate readout.
- Deliberate spatial isolation and outline-until-focused gating on adverse deficiency / show-cause actions.

## Colors

The palette enforces strict functional separation between paper-ledger reading surfaces, dark optical-inspection surfaces, and four calibrated evidentiary signal inks.

### Primary
- **Cross-Reference Cobalt** (`#1D4ED8`): Used for active optical layer toggles, co-reference links between checklist items and stage exhibits, QR source anchors, and keyboard focus rings.
- **Cobalt Tint Surface** (`#EFF6FF`): Highlights the currently co-referenced checklist row or active exhibit in the statutory ledger.

### Secondary
- **Statutory Veridian** (`#0F766E`): Confirms verified source registry responses, intact PKCS#7 digital signatures, on-campus EXIF GPS coordinates, and officer approval actions.
- **Forensic Vermilion** (`#B91C1C`): Signals critical discrepancies (`QR != OCR`), expired certificates, high-z-score ELA tamper regions, cross-college `pHash` clones, and show-cause flags.
- **Advisory Amber** (`#B45309`): Marks infrastructure carpet-area shortfalls, pending authority API syncs, and EVC physical inspection routing.

### Neutral
- **Statutory Dossier Paper** (`#F5F4F0`): Primary background for the left-hand checklist, consistency matrix, and audit ledger.
- **Elevated Ledger Sheet** (`#FFFFFF`): Used for institutional summary headers, data tables, and input fields on the paper side.
- **Sunken Rule Strip** (`#ECEAE3`): Secondary neutral layer for tab rails, table headers, and SHA-256 hash strips.
- **Paper Hairline Rule** (`#D5D2C8`): `1px` structural divider across all paper-zone panels.
- **Optical Chamber Ground** (`#10141A`) & **Stage Bed** (`#0D1117`): Low-reflectance dark surroundings for the PDF/image comparator so false-color Inferno ELA heatmaps and bounding boxes read with maximum contrast.
- **Chamber Panel** (`#171C24`) & **Chamber Seam** (`#262E3B`): Instrument header, slider bar, and bottom telemetry drawer surfaces inside the optical chamber.
- **Statutory Ink** (`#14181F`), **Secondary Ink** (`#3F4756`), **Muted Ink** (`#5E6778`): High-contrast text hierarchy on paper surfaces (all meeting ≥4.5:1 contrast).

### Named Rules
**The Evidentiary Signal Rule.** Saturated red, amber, and teal inks never appear as decorative accents; they appear only when tied to a specific forensic measurement, APH clause check, or source API status, always paired with a geometric prefix glyph (`●`, `▲`, `◆`, `○`).

**The Dual-Zone Polarity Rule.** Text-heavy checklists and statutory tables live on warm alabaster paper (`#F5F4F0`); pixel-level document specimens, ELA heatmaps, and CV bounding boxes live inside the dark optical chamber (`#10141A`).

## Typography

**Body & UI Font:** Public Sans (`'Public Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`)
**Telemetry & Forensic Font:** JetBrains Mono (`'JetBrains Mono', "Fira Code", "SFMono-Regular", Consolas, monospace`)

**Character:** Workhorse operational sans-serif for rapid scanning of statutory clauses and institutional names, paired with tabular-numeral monospace strictly for certificate IDs, perceptual hashes (`pHash`), GPS coordinates, ELA z-scores, and SHA-256 audit digests.

### Hierarchy
- **Headline** (`700`, `1rem` / `16px`, `1.35` line-height): Institution title and application identity in the top command bar and dossier header.
- **Title** (`600`, `0.875rem` / `14px`, `1.4` line-height): Active exhibit titles, APH rule headings, and drawer section headers.
- **Body** (`400`, `0.75rem` / `12px`, `1.5` line-height, `65–75ch` max prose measure): Executive synthesis, forensic evidence explanations, and audit rationale.
- **Label / Telemetry** (`600`, `0.6875rem` / `11px`, `1.3` line-height, `tabular-nums`): Status badges, coordinate readouts, confidence percentages, and hash chains.

### Named Rules
**The Tabular Measurement Rule.** Every numeric readout—intake counts, carpet area in sq.m, Haversine GPS distance, ELA error levels, and confidence scores—uses `font-variant-numeric: tabular-nums` so columns and live slider readouts never jitter.

## Layout

Veritas uses a full-viewport (`100vh` on desktop `lg:` breakpoints, stacked scrollable flow on mobile) 12-column split-screen workbench:
- **Top Statutory Command Bar + Safeguard Strip:** Fixed-height full-width header containing the Veritas identity, Dossier selector, and Role Switcher (`AICTE Scrutiny Officer` vs `Institution Nodal Officer`).
- **Left Statutory Dossier Pane (5 of 12 columns on `lg:`):** Contains the Institution Summary Ledger, 4-column telemetry strip (`1px` gap grid), 5-tab workspace switcher (`APH Checklist`, `Cross-Doc Matrix`, `Exhibits`, `Audit Trail`, `Live Upload Lab`), scrollable evidence list, and a pinned bottom Officer Decision Dock.
- **Right Optical Inspection Chamber (7 of 12 columns on `lg:`):** Contains the Stage Specimen quick-bar, Exhibit header, X-Ray mode toolbar with live `JPEG Q` / `GAIN` / `ELA MIX` sliders, centered interactive document/photo stage, and a tabbed bottom Forensic Telemetry Drawer.

## Elevation & Depth

Veritas is **flat and seam-driven by default**. Hierarchy is established through tonal surface shifts (`#ECEAE3` → `#F5F4F0` → `#FFFFFF` on the left; `#0D1117` → `#10141A` → `#171C24` on the right) and `1px` solid borders rather than drop shadows.

### Shadow Vocabulary
- **Specimen Stage Shadow** (`box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.35)`): Applied only to the physical document or photograph sheet resting on the dark optical chamber bed, separating the document edge from the dark stage.

### Named Rules
**The Hairline Seam Rule.** Panels, metric cells, and checklist rows divide with `1px` solid borders (`#D5D2C8` on paper, `#262E3B` in the chamber), never with floating card shadows or thick colored side stripes.

## Shapes

All interactive controls, badges, tabs, inputs, and panels use **rectilinear `0px` border radius** (`rounded: 0px`) with `1px` solid strokes (`2px` on active canvas bounding boxes). Connectors on the optical canvas use orthogonal 90-degree SVG polylines with circular terminal nodes.

## Components

### Buttons
- **Shape:** Sharp rectilinear (`0px` radius) with `1px` solid border.
- **Affirmative (`button-affirmative`):** Solid Statutory Veridian (`#0F766E`) background with white text (`#FFFFFF`), `4px 10px` padding, shifting to `#115E59` on hover.
- **Advisory (`button-advisory`):** Warm Amber surface (`#FFFBEB`) with `#B45309` border and text, shifting to `#FEF3C7` on hover.
- **Adverse / Destructive (`button-adverse-isolated`):** Spatially isolated at the far right of the decision dock; transparent background with `1px` solid `#B91C1C` border and `#B91C1C` text at rest, filling to solid `#B91C1C` with white text only on deliberate hover or focus.

### Chips / Status Badges
- **Style:** Rectilinear `1px` bordered inline badges set in `11px` monospace with geometric status prefixes (`● VERIFIED`, `▲ CRITICAL FLAG`, `◆ DEFICIENCY`).

### Cards / Containers
- **Corner Style:** `0px` radius.
- **Background:** `#FFFFFF` or `#F5F4F0` in the dossier ledger; `#171C24` or `#12171F` in the optical chamber.
- **Border:** Uniform `1px` solid `#D5D2C8` (paper) or `#262E3B` (chamber).
- **Internal Padding:** `12px` to `16px`.

### Inputs / Fields
- **Style:** `1px` solid `#D5D2C8` on `#F5F4F0` paper background, `0px` radius, `6px 12px` padding, `12px` sans/mono text.
- **Focus:** `2px` solid `#1D4ED8` outline with `2px` offset and border shift to `#1D4ED8`.

### Navigation
- **Workspace Tabs:** Top-and-side `1px` bordered folder-style tabs on `#ECEAE3` sunken rail; active tab matches the `#F5F4F0` content surface below it.
- **Optical Layer Switcher:** Compact dark instrument buttons (`#171C24` with `#262E3B` border) switching to solid `#2563EB` (`border-blue-500`) when active.

### Optical X-Ray Comparator Stage (Signature Component)
- **Structure:** Centered aspect-ratio-locked specimen viewport inside `#0D1117` stage bed, layering (1) base high-DPI PDF/photo raster, (2) blend-mode OpenCV ELA Inferno heatmap driven by live range sliders, (3) 8×8 Laplacian noise σ grid, (4) SVG orthogonal cross-lock tethers, and (5) clickable bounding-box evidence overlays with edge-aware callout tags.

## Do's and Don'ts

### Do:
- **Do** co-reference every checklist flag and consistency row to a concrete bounding box on the right-hand Optical Stage.
- **Do** pair every semantic color state with a geometric prefix (`●`, `▲`, `◆`, `○`) and explicit APH 2024–2027 clause or forensic metric.
- **Do** isolate adverse regulatory actions (`Confirm Deficiency / Show-Cause Flag`) with empty space and outline-until-focused styling.
- **Do** use monospace strictly for measurements, hashes, coordinates, timestamps, and certificate identifiers.

### Don't:
- **Don't** place uppercase eyebrow/kicker labels above headings (`h1`–`h4`).
- **Don't** use thick (`>1px`) colored left or right border stripes on checklist rows, alerts, or containers.
- **Don't** use decorative glassmorphism, gradient text, neon glows, or unanchored circular gauges.
- **Don't** present AI forensic findings as automated rejections; always frame them as evidence-linked advisory indicators subject to human officer disposition.
