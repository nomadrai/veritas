"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { DossierPayload, DocumentXRay } from "@/types/veritas";
import { AppShell } from "@/components/AppShell";
import {
  FileText,
  QrCode,
  Flame,
  Copy,
  Eye,
  CheckCircle2,
  FileWarning,
  RefreshCw,
  Layers,
  Search,
} from "lucide-react";

function ForensicsStudioContent() {
  const searchParams = useSearchParams();
  const appId = searchParams.get("app") || "AICTE-2026-EOA-8841";
  const initialDocId = searchParams.get("doc") || "DOC-8841-NOC";

  const [dossier, setDossier] = useState<DossierPayload | null>(null);
  const [selectedDocId, setSelectedDocId] = useState<string>(initialDocId);
  const [viewLayer, setViewLayer] = useState<
    "standard" | "qr_lock" | "ela" | "jpeg_ghost" | "copymove"
  >("standard");
  const [loupeEnabled, setLoupeEnabled] = useState<boolean>(false);
  const [loupePos, setLoupePos] = useState<{ x: number; y: number }>({ x: 50, y: 50 });
  const [loupeHover, setLoupeHover] = useState<boolean>(false);
  const [elaQuality, setElaQuality] = useState<number>(90);
  const [elaScale, setElaScale] = useState<number>(18);
  const [liveXray, setLiveXray] = useState<DocumentXRay | null>(null);
  const [recomputing, setRecomputing] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/applications/${encodeURIComponent(appId)}`);
        if (res.ok) {
          const data: DossierPayload = await res.json();
          setDossier(data);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [appId]);

  useEffect(() => {
    if (searchParams.get("doc")) {
      setSelectedDocId(searchParams.get("doc")!);
    }
  }, [searchParams]);

  const activeDoc =
    dossier?.documents.find((d) => d.doc_id === selectedDocId) ||
    dossier?.documents[0] ||
    null;

  useEffect(() => {
    setLiveXray(null);
    if (activeDoc) {
      setElaQuality(activeDoc.xray.ela.quality || 90);
      setElaScale(activeDoc.xray.ela.scale || 18);
    }
  }, [selectedDocId, activeDoc]);

  const handleUpdateEla = async (q: number, s: number) => {
    if (!activeDoc) return;
    setElaQuality(q);
    setElaScale(s);
    setRecomputing(true);
    try {
      const res = await fetch(
        `/api/documents/${encodeURIComponent(activeDoc.doc_id)}/xray?quality=${q}&scale=${s}`
      );
      if (res.ok) {
        setLiveXray(await res.json());
      }
    } finally {
      setRecomputing(false);
    }
  };

  const currentXray = liveXray || activeDoc?.xray;

  return (
    <AppShell activeAppId={appId}>
      {/* Page Header */}
      <div className="mb-6 rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-[#0F172A] sm:text-2xl">
              3-Layer Document Forensics & Authenticity Studio
            </h1>
            <p className="mt-1 text-sm text-[#475569]">
              Select any uploaded certificate below to inspect (1) QR Code vs. Printed OCR Text cross-lock, (2) PDF modification & font consistency, and (3) Error Level Analysis (ELA) & seal duplication.
            </p>
          </div>
          {dossier && (
            <span className="rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] px-3 py-1.5 font-mono text-xs font-semibold text-[#1E293B]">
              Institution: {dossier.institution.name}
            </span>
          )}
        </div>

        {/* Document Selector Pills */}
        {dossier && (
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {dossier.documents.map((doc) => {
              const isSelected = doc.doc_id === activeDoc?.doc_id;
              const isFlagged = doc.authority_status !== "Verified";
              return (
                <button
                  key={doc.doc_id}
                  type="button"
                  onClick={() => setSelectedDocId(doc.doc_id)}
                  className={`flex flex-col justify-between rounded-xl border p-3.5 text-left transition-all ${
                    isSelected
                      ? "border-[#1D4ED8] bg-[#EFF6FF]/70 shadow-sm ring-1 ring-[#1D4ED8]"
                      : "border-[#E2E8F0] bg-[#F8FAFC] hover:border-[#CBD5E1] hover:bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <FileText
                        className={`h-4 w-4 shrink-0 ${
                          isSelected ? "text-[#1D4ED8]" : "text-[#64748B]"
                        }`}
                      />
                      <span className="text-xs font-bold text-[#0F172A]">{doc.doc_type}</span>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold ${
                        isFlagged
                          ? "bg-[#FEF2F2] text-[#B91C1C]"
                          : "bg-[#F0FDFA] text-[#0F766E]"
                      }`}
                    >
                      {doc.authority_status}
                    </span>
                  </div>
                  <div className="mt-2 font-mono text-[11px] text-[#475569]">
                    {doc.cert_number} · Score: {doc.forensic_score}/100
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {loading || !activeDoc || !currentXray ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="h-[640px] animate-pulse rounded-xl bg-white lg:col-span-7" />
          <div className="h-[640px] animate-pulse rounded-xl bg-white lg:col-span-5" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* LEFT 7 COLUMNS: Clean Daylight Document & Evidence Overlay Viewer */}
          <div className="flex flex-col rounded-xl border border-[#E2E8F0] bg-white shadow-sm lg:col-span-7">
            {/* Viewer Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2E8F0] px-5 py-3.5">
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { id: "standard", label: "Annotated Certificate", icon: Eye },
                  { id: "qr_lock", label: "QR vs. Text Cross-Lock", icon: QrCode },
                  { id: "ela", label: "Tamper Heatmap (ELA)", icon: Flame },
                  { id: "jpeg_ghost", label: "Sherloq JPEG Ghost", icon: Layers },
                  { id: "copymove", label: "Seal Duplication Check", icon: Copy },
                ].map((mode) => {
                  const Icon = mode.icon;
                  const active = viewLayer === mode.id;
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setViewLayer(mode.id as typeof viewLayer)}
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                        active
                          ? "border-[#1E3A8A] bg-[#1E3A8A] text-white"
                          : "border-[#CBD5E1] bg-white text-[#334155] hover:bg-[#F8FAFC]"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {mode.label}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setLoupeEnabled(!loupeEnabled)}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                    loupeEnabled
                      ? "border-[#0F766E] bg-[#F0FDFA] text-[#0F766E]"
                      : "border-[#CBD5E1] bg-white text-[#475569] hover:bg-[#F8FAFC]"
                  }`}
                >
                  <Search className="h-3.5 w-3.5" />
                  {loupeEnabled ? "2.8× Loupe ON" : "Optical Loupe"}
                </button>
              </div>

              {/* Friendly Sensitivity Controls when ELA Heatmap is active */}
              {viewLayer === "ela" && (
                <div className="flex flex-wrap items-center gap-3 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-1 text-xs">
                  <label className="flex items-center gap-1.5 font-medium text-[#334155]">
                    <span>JPEG Quality:</span>
                    <input
                      type="range"
                      min={50}
                      max={98}
                      step={2}
                      value={elaQuality}
                      onChange={(e) => handleUpdateEla(Number(e.target.value), elaScale)}
                      className="h-1.5 w-20 accent-[#1E3A8A]"
                    />
                    <span className="font-mono font-semibold tabular-nums">{elaQuality}%</span>
                  </label>
                  <label className="flex items-center gap-1.5 font-medium text-[#334155]">
                    <span>Contrast:</span>
                    <input
                      type="range"
                      min={6}
                      max={36}
                      step={2}
                      value={elaScale}
                      onChange={(e) => handleUpdateEla(elaQuality, Number(e.target.value))}
                      className="h-1.5 w-20 accent-[#1E3A8A]"
                    />
                    <span className="font-mono font-semibold tabular-nums">{elaScale}×</span>
                  </label>
                  {recomputing && <RefreshCw className="h-3.5 w-3.5 animate-spin text-[#1D4ED8]" />}
                </div>
              )}
            </div>

            {/* Clean Light Slate Document Inspection Stage */}
            <div className="flex flex-1 items-start justify-center bg-[#F1F5F9] p-5">
              <div
                onMouseEnter={() => setLoupeHover(true)}
                onMouseLeave={() => setLoupeHover(false)}
                onMouseMove={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = ((e.clientX - rect.left) / rect.width) * 100;
                  const y = ((e.clientY - rect.top) / rect.height) * 100;
                  setLoupePos({
                    x: Math.max(0, Math.min(100, x)),
                    y: Math.max(0, Math.min(100, y)),
                  });
                }}
                className="relative mx-auto w-full max-w-[430px] rounded-md border border-[#CBD5E1] bg-white shadow-md"
                style={{
                  aspectRatio: `${currentXray.dimensions.width} / ${currentXray.dimensions.height}`,
                }}
              >
                <img
                  src={
                    viewLayer === "ela"
                      ? currentXray.ela.ela_heatmap_data_url
                      : viewLayer === "jpeg_ghost" &&
                        currentXray.jpeg_ghost?.primary_ghost_heatmap_url
                      ? currentXray.jpeg_ghost.primary_ghost_heatmap_url
                      : currentXray.specimen_data_url
                  }
                  alt={activeDoc.title}
                  className="block h-full w-full rounded-md object-contain"
                />

                {/* Stage 4: Optical Forensic Magnifier Loupe Overlay */}
                {loupeEnabled && loupeHover && (
                  <div
                    style={{
                      left: `calc(${loupePos.x}% - 75px)`,
                      top: `calc(${loupePos.y}% - 75px)`,
                      width: "150px",
                      height: "150px",
                      backgroundImage: `url(${
                        viewLayer === "ela"
                          ? currentXray.ela.ela_heatmap_data_url
                          : viewLayer === "jpeg_ghost" &&
                            currentXray.jpeg_ghost?.primary_ghost_heatmap_url
                          ? currentXray.jpeg_ghost.primary_ghost_heatmap_url
                          : currentXray.specimen_data_url
                      })`,
                      backgroundRepeat: "no-repeat",
                      backgroundSize: "280%",
                      backgroundPosition: `${loupePos.x}% ${loupePos.y}%`,
                    }}
                    className="pointer-events-none absolute z-30 rounded-full border-2 border-[#1E3A8A] shadow-xl ring-2 ring-white"
                  />
                )}

                {/* SVG Connector Lines for QR-vs-OCR Cross-Lock & Cloned Seals */}
                <svg
                  viewBox="0 0 1000 1000"
                  preserveAspectRatio="none"
                  className="pointer-events-none absolute inset-0 h-full w-full"
                >
                  {activeDoc.annotations
                    .filter((ann) => ann.target_bbox)
                    .map((ann) => {
                      if (viewLayer === "copymove" && ann.layer !== "copymove") return null;
                      if (viewLayer === "qr_lock" && ann.layer !== "qr") return null;
                      const [sx, sy, sw, sh] = ann.bbox;
                      const [tx, ty, tw, th] = ann.target_bbox!;
                      const x1 = (sx + sw / 2) * 1000;
                      const y1 = (sy + sh / 2) * 1000;
                      const x2 = (tx + tw / 2) * 1000;
                      const y2 = (ty + th / 2) * 1000;
                      const midX = x1 + (x2 - x1) * 0.5;
                      return (
                        <g key={ann.id}>
                          <polyline
                            points={`${x1},${y1} ${midX},${y1} ${midX},${y2} ${x2},${y2}`}
                            fill="none"
                            stroke="#DC2626"
                            strokeWidth="3.5"
                            strokeDasharray={ann.layer === "copymove" ? "10,6" : "none"}
                          />
                          <circle cx={x1} cy={y1} r="7" fill="#1D4ED8" stroke="#FFFFFF" strokeWidth="2" />
                          <circle cx={x2} cy={y2} r="7" fill="#DC2626" stroke="#FFFFFF" strokeWidth="2" />
                        </g>
                      );
                    })}
                </svg>

                {/* Evidence Callout Boxes */}
                {activeDoc.annotations.map((ann) => {
                  if (viewLayer === "qr_lock" && ann.layer !== "qr" && !ann.label.includes("OCR")) {
                    return null;
                  }
                  if (viewLayer === "copymove" && ann.layer !== "copymove") {
                    return null;
                  }
                  const [x, y, w, h] = ann.bbox;
                  const isCritical = ann.severity === "CRITICAL" || ann.severity === "HIGH";
                  const isVerified = ann.severity === "VERIFIED";

                  return (
                    <div
                      key={ann.id}
                      style={{
                        left: `${x * 100}%`,
                        top: `${y * 100}%`,
                        width: `${w * 100}%`,
                        height: `${h * 100}%`,
                      }}
                      className={`absolute rounded-sm border-2 ${
                        isCritical
                          ? "border-[#DC2626] bg-[#DC2626]/15"
                          : isVerified
                          ? "border-[#0F766E] bg-[#0F766E]/10"
                          : "border-[#1D4ED8] bg-[#1D4ED8]/10"
                      }`}
                    >
                      <span
                        className={`absolute ${
                          y > 0.6 && x > 0.45 ? "-bottom-6 right-0" : "-top-6 left-0"
                        } z-10 max-w-[250px] truncate whitespace-nowrap rounded px-2 py-0.5 text-[10px] font-semibold text-white shadow ${
                          isCritical
                            ? "bg-[#B91C1C]"
                            : isVerified
                            ? "bg-[#0F766E]"
                            : "bg-[#1E3A8A]"
                        }`}
                      >
                        {ann.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* RIGHT 5 COLUMNS: Plain-English 3-Layer Verification Breakdown */}
          <div className="space-y-4 lg:col-span-5">
            {/* Layer 1 Card: QR Code vs Printed Text Cross-Lock */}
            <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
                <div className="flex items-center gap-2">
                  <QrCode className="h-4 w-4 text-[#1D4ED8]" />
                  <h2 className="text-sm font-bold text-[#0F172A]">
                    Layer 1 · QR Code vs. Printed Text Cross-Lock
                  </h2>
                </div>
                {currentXray.qr_ocr_discrepancies.length > 0 ? (
                  <span className="rounded-full bg-[#FEF2F2] px-2.5 py-0.5 text-xs font-semibold text-[#B91C1C]">
                    Mismatch Found
                  </span>
                ) : (
                  <span className="rounded-full bg-[#F0FDFA] px-2.5 py-0.5 text-xs font-semibold text-[#0F766E]">
                    100% Match
                  </span>
                )}
              </div>

              <div className="mt-3 space-y-2.5 text-xs">
                <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                  <div className="font-semibold text-[#334155]">Decoded QR Code Data:</div>
                  <pre className="mt-1.5 overflow-x-auto font-mono text-[11px] text-[#0F172A]">
                    {JSON.stringify(activeDoc.qr_payload, null, 2)}
                  </pre>
                </div>

                <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                  <div className="font-semibold text-[#334155]">Extracted Printed Text (OCR):</div>
                  <dl className="mt-1.5 space-y-1">
                    {Object.entries(activeDoc.extracted_fields).map(([k, v]) => {
                      const isBad =
                        v.includes("180") || v.includes("2026-12-31") || v.includes("SHORTFALL");
                      return (
                        <div key={k} className="flex justify-between gap-2 border-b border-[#E2E8F0] pb-1 last:border-0">
                          <dt className="text-[#64748B]">{k}:</dt>
                          <dd
                            className={`font-mono font-semibold ${
                              isBad ? "text-[#B91C1C]" : "text-[#0F172A]"
                            }`}
                          >
                            {v}
                          </dd>
                        </div>
                      );
                    })}
                  </dl>
                </div>
              </div>
            </div>

            {/* Layer 2 Card: PDF Metadata, Incremental Edits & Font Consistency */}
            <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
                <div className="flex items-center gap-2">
                  <FileWarning className="h-4 w-4 text-[#B45309]" />
                  <h2 className="text-sm font-bold text-[#0F172A]">
                    Layer 2 · PDF Revision History, Fonts & Digital Signature
                  </h2>
                </div>
                <span className="font-mono text-xs text-[#475569]">
                  {activeDoc.pdf_metadata.eof_markers} Revision(s)
                </span>
              </div>

              <div className="mt-3 space-y-2 text-xs">
                <div className="flex justify-between border-b border-[#E2E8F0] pb-1.5">
                  <span className="text-[#64748B]">PDF Editing Software:</span>
                  <span
                    className={`font-mono font-semibold ${
                      activeDoc.pdf_metadata.producer.toLowerCase().includes("photoshop") ||
                      activeDoc.pdf_metadata.producer.toLowerCase().includes("tampered")
                        ? "text-[#B91C1C]"
                        : "text-[#0F172A]"
                    }`}
                  >
                    {activeDoc.pdf_metadata.producer}
                  </span>
                </div>
                <div className="flex justify-between border-b border-[#E2E8F0] pb-1.5">
                  <span className="text-[#64748B]">Post-Issuance Modifications:</span>
                  <span
                    className={`font-mono font-semibold ${
                      activeDoc.pdf_metadata.incremental_updates > 0
                        ? "text-[#B91C1C]"
                        : "text-[#0F766E]"
                    }`}
                  >
                    {activeDoc.pdf_metadata.incremental_updates > 0
                      ? `${activeDoc.pdf_metadata.incremental_updates} Incremental Save(s) After Issue Date`
                      : "None (Original Unmodified File)"}
                  </span>
                </div>
                <div className="flex justify-between border-b border-[#E2E8F0] pb-1.5">
                  <span className="text-[#64748B]">Digital Signature (DSC):</span>
                  <span
                    className={`font-semibold ${
                      activeDoc.pdf_metadata.has_digital_signature
                        ? "text-[#0F766E]"
                        : "text-[#B45309]"
                    }`}
                  >
                    {activeDoc.pdf_metadata.has_digital_signature
                      ? "● Valid Class-III Digital Signature"
                      : "▲ Missing / Broken Signature"}
                  </span>
                </div>

                {activeDoc.pdf_metadata.font_anomalies.length > 0 ? (
                  <div className="mt-2 rounded-lg border border-[#FECACA] bg-[#FEF2F2] p-3 text-xs text-[#B91C1C]">
                    <strong>Font Mismatch Detected: </strong>
                    {activeDoc.pdf_metadata.font_anomalies[0].reason}
                  </div>
                ) : (
                  <div className="mt-2 rounded-lg border border-[#99F6E4] bg-[#F0FDFA] p-2.5 text-xs text-[#0F766E]">
                    ● Typography is uniform ({activeDoc.pdf_metadata.dominant_font}) across all text fields.
                  </div>
                )}

                {/* Stage 4: pyHanko / pikepdf Incremental Revision Tree */}
                {currentXray.revision_tree && (
                  <div className="mt-3 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                    <div className="font-semibold text-[#0F172A]">
                      pyHanko Incremental Revision Diff Tree:
                    </div>
                    <div className="mt-1.5 space-y-1.5">
                      {currentXray.revision_tree.revisions.map((rev) => (
                        <div
                          key={rev.revision_number}
                          className="flex items-center justify-between rounded border border-[#CBD5E1] bg-white px-2.5 py-1.5 font-mono text-[11px]"
                        >
                          <span>
                            Rev #{rev.revision_number} ({rev.byte_length.toLocaleString()} B)
                          </span>
                          <span
                            className={`font-semibold ${
                              rev.status.includes("TAMPERED")
                                ? "text-[#B91C1C]"
                                : "text-[#0F766E]"
                            }`}
                          >
                            {rev.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Stage 4: Sherloq JPEG Ghost & 2D Resampling Telemetry */}
                {currentXray.jpeg_ghost && (
                  <div className="mt-2 flex items-center justify-between rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 font-mono text-[11px] text-[#334155]">
                    <span>
                      JPEG Ghost Peak Q={currentXray.jpeg_ghost.dominant_splice_quality}% (Contrast:{" "}
                      {currentXray.jpeg_ghost.peak_ghost_contrast}×)
                    </span>
                    <span>
                      2D FFT Resampled Patches:{" "}
                      {currentXray.resampling?.resampled_patches.length || 0}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Layer 3 Card: Visual Tamper & Seal Analysis */}
            <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
                <div className="flex items-center gap-2">
                  <Flame className="h-4 w-4 text-[#B91C1C]" />
                  <h2 className="text-sm font-bold text-[#0F172A]">
                    Layer 3 · Visual Tamper (ELA) & Seal Duplication Summary
                  </h2>
                </div>
              </div>

              <div className="mt-3 space-y-2.5">
                {activeDoc.forensic_findings.length === 0 ? (
                  <div className="flex items-center gap-2 rounded-lg border border-[#99F6E4] bg-[#F0FDFA] p-3 text-xs text-[#0F766E]">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    No pasted signatures, overwritten numbers, or cloned stamps detected on this certificate.
                  </div>
                ) : (
                  activeDoc.forensic_findings.map((finding) => (
                    <div
                      key={finding.id}
                      className="rounded-lg border border-[#FECACA] bg-[#FEF2F2]/60 p-3 text-xs"
                    >
                      <div className="flex items-center justify-between font-semibold text-[#B91C1C]">
                        <span>{finding.title}</span>
                        <span className="font-mono">{(finding.confidence * 100).toFixed(0)}% Conf.</span>
                      </div>
                      <p className="mt-1 leading-relaxed text-[#334155]">{finding.evidence}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

export default function ForensicsStudioPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-[#475569]">Loading Forensics Studio...</div>}>
      <ForensicsStudioContent />
    </Suspense>
  );
}
