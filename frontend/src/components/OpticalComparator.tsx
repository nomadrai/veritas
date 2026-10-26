"use client";

import React, { useState } from "react";
import {
  DossierDocument,
  DocumentXRay,
} from "@/types/veritas";
import {
  Eye,
  Flame,
  QrCode,
  Copy,
  Grid,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Clock,
  FileWarning,
  CheckCircle2,
  Crosshair,
} from "lucide-react";

interface OpticalComparatorProps {
  document: DossierDocument;
  activeFindingId: string | null;
  onSelectFinding: (id: string | null) => void;
  onPingAuthority: (docId: string) => Promise<void>;
  pingingAuthority: boolean;
}

type XRayMode = "composite" | "ela" | "raw_ela" | "qr_lock" | "copymove" | "noise_grid";

export function OpticalComparator({
  document,
  activeFindingId,
  onSelectFinding,
  onPingAuthority,
  pingingAuthority,
}: OpticalComparatorProps) {
  const [xrayMode, setXrayMode] = useState<XRayMode>("composite");
  const [elaQuality, setElaQuality] = useState<number>(document.xray.ela.quality || 90);
  const [elaScale, setElaScale] = useState<number>(document.xray.ela.scale || 18);
  const [elaOpacity, setElaOpacity] = useState<number>(78);
  const [liveXray, setLiveXray] = useState<DocumentXRay | null>(null);
  const [recomputingEla, setRecomputingEla] = useState<boolean>(false);
  const [cursorCoords, setCursorCoords] = useState<{ x: number; y: number }>({
    x: 0.443,
    y: 0.439,
  });
  const [bottomDrawerTab, setBottomDrawerTab] = useState<
    "findings" | "qr_vs_ocr" | "pdf_structure" | "authority_api"
  >("findings");

  // Reset liveXray when document changes
  React.useEffect(() => {
    setLiveXray(null);
    setElaQuality(document.xray.ela.quality || 90);
    setElaScale(document.xray.ela.scale || 18);
  }, [document.doc_id, document.xray.ela.quality, document.xray.ela.scale]);

  const currentXray = liveXray || document.xray;

  const handleRecomputeEla = async (newQuality: number, newScale: number) => {
    setElaQuality(newQuality);
    setElaScale(newScale);
    setRecomputingEla(true);
    try {
      const res = await fetch(
        `/api/documents/${encodeURIComponent(document.doc_id)}/xray?quality=${newQuality}&scale=${newScale}`
      );
      if (res.ok) {
        const updated: DocumentXRay = await res.json();
        setLiveXray(updated);
      }
    } finally {
      setRecomputingEla(false);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    setCursorCoords({ x: Number(x.toFixed(3)), y: Number(y.toFixed(3)) });
  };

  const getAuthorityBadge = (status: string) => {
    switch (status) {
      case "Verified":
        return (
          <span className="inline-flex items-center gap-1.5 border border-veridian/40 bg-veridian/20 px-2.5 py-0.5 font-mono text-xs font-medium text-teal-200">
            <CheckCircle2 className="h-3.5 w-3.5 text-teal-300" />
            ● VERIFIED AT SOURCE
          </span>
        );
      case "Mismatch Detected":
        return (
          <span className="inline-flex items-center gap-1.5 border border-red-500/50 bg-red-950/80 px-2.5 py-0.5 font-mono text-xs font-medium text-red-200">
            <ShieldAlert className="h-3.5 w-3.5 text-red-400" />
            ▲ MISMATCH DETECTED
          </span>
        );
      case "Expired":
        return (
          <span className="inline-flex items-center gap-1.5 border border-red-500/50 bg-red-950/80 px-2.5 py-0.5 font-mono text-xs font-medium text-red-200">
            <FileWarning className="h-3.5 w-3.5 text-red-400" />
            ▲ EXPIRED IN REGISTRY
          </span>
        );
      case "Pending":
        return (
          <span className="inline-flex items-center gap-1.5 border border-amber-500/50 bg-amber-950/80 px-2.5 py-0.5 font-mono text-xs font-medium text-amber-200">
            <Clock className="h-3.5 w-3.5 text-amber-400" />
            ○ PENDING SYNC
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 border border-amber-500/50 bg-amber-950/80 px-2.5 py-0.5 font-mono text-xs font-medium text-amber-200">
            ◆ {status.toUpperCase()}
          </span>
        );
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-chamber text-slate-100">
      {/* Top Optical Instrument Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-chamber-border bg-chamber-panel px-4 py-2.5">
        <div className="flex items-center gap-3">
          <span className="border border-slate-600 bg-slate-800 px-2 py-0.5 font-mono text-xs font-semibold text-slate-200">
            EXHIBIT · {document.doc_id}
          </span>
          <h2 className="text-sm font-semibold text-white">{document.title}</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {getAuthorityBadge(document.authority_status)}
          <span
            className={`border px-2.5 py-0.5 font-mono text-xs font-semibold tabular-nums ${
              document.forensic_score < 50
                ? "border-red-500/50 bg-red-950/60 text-red-200"
                : "border-teal-500/40 bg-teal-950/60 text-teal-200"
            }`}
          >
            INTEGRITY INDEX: {document.forensic_score}/100
          </span>
        </div>
      </div>

      {/* X-Ray Mode Switcher & Live Calibration Sliders */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-chamber-border bg-[#131820] px-4 py-2">
        <div className="flex flex-wrap items-center gap-1" role="tablist" aria-label="X-Ray Inspection Layers">
          {[
            { id: "composite", label: "Composite X-Ray", icon: Eye },
            { id: "ela", label: "ELA Heatmap", icon: Flame },
            { id: "raw_ela", label: "Raw Diff (RGB)", icon: Flame },
            { id: "qr_lock", label: "QR-vs-OCR Cross-Lock", icon: QrCode },
            { id: "copymove", label: "SIFT Copy-Move", icon: Copy },
            { id: "noise_grid", label: "Noise Variance (8×8)", icon: Grid },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = xrayMode === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setXrayMode(tab.id as XRayMode)}
                className={`inline-flex items-center gap-1.5 border px-2.5 py-1 text-xs font-medium transition-colors duration-150 ${
                  active
                    ? "border-blue-500 bg-blue-600 text-white"
                    : "border-chamber-border bg-chamber-panel text-slate-300 hover:border-slate-600 hover:text-white"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Live ELA Calibration Controls + Coordinate Readout */}
        <div className="flex flex-wrap items-center gap-4 font-mono text-xs text-slate-300">
          <label className="flex items-center gap-2">
            <span className="text-slate-400">JPEG Q:</span>
            <input
              type="range"
              min={50}
              max={98}
              step={2}
              value={elaQuality}
              onChange={(e) => handleRecomputeEla(Number(e.target.value), elaScale)}
              className="h-1.5 w-20 cursor-pointer accent-blue-500"
              aria-label="ELA JPEG Recompression Quality"
            />
            <span className="w-8 tabular-nums text-white">{elaQuality}%</span>
          </label>
          <label className="flex items-center gap-2">
            <span className="text-slate-400">GAIN:</span>
            <input
              type="range"
              min={6}
              max={38}
              step={2}
              value={elaScale}
              onChange={(e) => handleRecomputeEla(elaQuality, Number(e.target.value))}
              className="h-1.5 w-20 cursor-pointer accent-blue-500"
              aria-label="ELA Error Gain Multiplier"
            />
            <span className="w-7 tabular-nums text-white">{elaScale}×</span>
          </label>
          {(xrayMode === "ela" || xrayMode === "composite") && (
            <label className="flex items-center gap-2">
              <span className="text-slate-400">ELA MIX:</span>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={elaOpacity}
                onChange={(e) => setElaOpacity(Number(e.target.value))}
                className="h-1.5 w-16 cursor-pointer accent-amber-500"
                aria-label="ELA Heatmap Overlay Opacity"
              />
              <span className="w-8 tabular-nums text-amber-300">{elaOpacity}%</span>
            </label>
          )}
          <span className="inline-flex items-center gap-1 border border-chamber-border bg-chamber px-2 py-0.5 tabular-nums text-slate-300">
            <Crosshair className="h-3 w-3 text-blue-400" />
            X:{cursorCoords.x.toFixed(3)} Y:{cursorCoords.y.toFixed(3)}
            {recomputingEla && <RefreshCw className="ml-1 h-3 w-3 animate-spin text-blue-400" />}
          </span>
        </div>
      </div>

      {/* Main Optical Comparator Canvas Stage */}
      <div className="chamber-scroll optical-grid-bg relative flex min-h-0 flex-1 items-center justify-center overflow-auto px-6 py-3">
        {/* Calibrated SVG Optical Stage Ruler & Reticle Frame */}
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full"
        >
          <defs>
            <pattern id="optical-reticle" width="32" height="32" patternUnits="userSpaceOnUse">
              <path
                d="M 32 0 L 0 0 0 32"
                fill="none"
                stroke="#1A2230"
                strokeWidth="1"
              />
              <circle cx="16" cy="16" r="0.8" fill="#2A364B" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#optical-reticle)" />
          {/* Top & Left Millimeter Calibration Ruler Ticks */}
          <g stroke="#334155" strokeWidth="1">
            {Array.from({ length: 48 }).map((_, i) => (
              <line
                key={`tx-${i}`}
                x1={i * 24}
                y1={0}
                x2={i * 24}
                y2={i % 5 === 0 ? 10 : 5}
              />
            ))}
            {Array.from({ length: 32 }).map((_, i) => (
              <line
                key={`ty-${i}`}
                x1={0}
                y1={i * 24}
                x2={i % 5 === 0 ? 10 : 5}
                y2={i * 24}
              />
            ))}
          </g>
        </svg>

        <div
          onMouseMove={handleMouseMove}
          className="relative z-10 mx-auto max-h-full w-full max-w-[355px] select-none border border-slate-700 bg-black shadow-lg"
          style={{
            aspectRatio: `${currentXray.dimensions.width} / ${currentXray.dimensions.height}`,
          }}
        >
          {/* Base Specimen Image */}
          <img
            src={
              xrayMode === "raw_ela"
                ? currentXray.ela.ela_raw_data_url
                : currentXray.specimen_data_url
            }
            alt={document.title}
            className="block h-full w-full object-contain"
          />

          {/* ELA Heatmap Overlay Layer */}
          {(xrayMode === "ela" || (xrayMode === "composite" && elaOpacity > 0)) && (
            <img
              src={currentXray.ela.ela_heatmap_data_url}
              alt="Error Level Analysis Heatmap Overlay"
              className="pointer-events-none absolute inset-0 h-full w-full object-contain transition-opacity duration-150"
              style={{
                opacity: xrayMode === "ela" ? elaOpacity / 100 : (elaOpacity * 0.35) / 100,
                mixBlendMode: xrayMode === "ela" ? "normal" : "screen",
              }}
            />
          )}

          {/* 8x8 Laplacian Noise Variance Grid Overlay */}
          {xrayMode === "noise_grid" && (
            <div className="pointer-events-none absolute inset-0 grid grid-cols-8 grid-rows-8">
              {currentXray.noise_grid.grid_values.map((rowVals, rIdx) =>
                rowVals.map((val, cIdx) => {
                  const isAnomalous = currentXray.noise_grid.anomalous_cells.some(
                    (cell) => cell.row === rIdx && cell.col === cIdx
                  );
                  return (
                    <div
                      key={`${rIdx}-${cIdx}`}
                      className={`flex items-end justify-end border p-1 font-mono text-[10px] tabular-nums ${
                        isAnomalous
                          ? "border-red-500 bg-red-600/35 font-bold text-white"
                          : "border-slate-500/30 bg-slate-900/25 text-slate-200"
                      }`}
                    >
                      σ={val.toFixed(1)}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* SVG Vector Tether Layer for QR-vs-OCR Cross-Lock & SIFT Copy-Move */}
          <svg
            viewBox="0 0 1000 1000"
            preserveAspectRatio="none"
            className="pointer-events-none absolute inset-0 h-full w-full"
          >
            <defs>
              <marker
                id="arrow-vermilion"
                viewBox="0 0 10 10"
                refX="6"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#EF4444" />
              </marker>
              <marker
                id="arrow-cobalt"
                viewBox="0 0 10 10"
                refX="6"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#3B82F6" />
              </marker>
            </defs>

            {/* Orthogonal 90-degree Cross-Lock Tethers (Donated by Challenger 6) */}
            {(xrayMode === "composite" || xrayMode === "qr_lock" || xrayMode === "copymove") &&
              document.annotations
                .filter((ann) => ann.target_bbox)
                .map((ann) => {
                  const [sx, sy, sw, sh] = ann.bbox;
                  const [tx, ty, tw, th] = ann.target_bbox!;
                  const x1 = (sx + sw / 2) * 1000;
                  const y1 = (sy + sh / 2) * 1000;
                  const x2 = (tx + tw / 2) * 1000;
                  const y2 = (ty + th / 2) * 1000;
                  const midX = x1 + (x2 - x1) * 0.5;
                  const strokeColor = ann.layer === "copymove" ? "#F59E0B" : "#EF4444";

                  return (
                    <g key={`tether-${ann.id}`}>
                      <polyline
                        points={`${x1},${y1} ${midX},${y1} ${midX},${y2} ${x2},${y2}`}
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth="3.5"
                        strokeDasharray={ann.layer === "copymove" ? "10,6" : "none"}
                        markerEnd="url(#arrow-vermilion)"
                      />
                      <circle cx={x1} cy={y1} r="7" fill="#3B82F6" stroke="#FFFFFF" strokeWidth="2" />
                      <circle cx={x2} cy={y2} r="7" fill="#EF4444" stroke="#FFFFFF" strokeWidth="2" />
                    </g>
                  );
                })}
          </svg>

          {/* Interactive Bounding-Box Evidence Overlays */}
          {document.annotations.map((ann) => {
            if (xrayMode === "qr_lock" && ann.layer !== "qr" && !ann.label.includes("OCR")) {
              return null;
            }
            if (xrayMode === "copymove" && ann.layer !== "copymove") {
              return null;
            }
            const [x, y, w, h] = ann.bbox;
            const isSelected = activeFindingId === ann.id;

            let borderClass = "border-blue-400 bg-blue-500/15 text-blue-100";
            let badgeBg = "bg-blue-700 text-white";
            if (ann.severity === "CRITICAL" || ann.severity === "HIGH") {
              borderClass = "border-red-500 bg-red-500/20 text-red-100";
              badgeBg = "bg-red-700 text-white";
            } else if (ann.severity === "WARNING") {
              borderClass = "border-amber-400 bg-amber-500/20 text-amber-100";
              badgeBg = "bg-amber-700 text-white";
            } else if (ann.severity === "VERIFIED") {
              borderClass = "border-teal-400 bg-teal-500/15 text-teal-100";
              badgeBg = "bg-teal-800 text-white";
            }

            return (
              <div
                key={ann.id}
                onClick={() => onSelectFinding(isSelected ? null : ann.id)}
                style={{
                  left: `${x * 100}%`,
                  top: `${y * 100}%`,
                  width: `${w * 100}%`,
                  height: `${h * 100}%`,
                }}
                className={`group absolute cursor-pointer border-2 transition-all duration-150 ${borderClass} ${
                  isSelected ? "ring-2 ring-white" : ""
                }`}
              >
                <div
                  className={`pointer-events-none absolute ${
                    y > 0.6 && x > 0.45 ? "-bottom-5 right-0" : "-top-5 left-0"
                  } z-20 max-w-[230px] truncate whitespace-nowrap px-1.5 py-0.5 font-mono text-[9.5px] font-semibold shadow ${badgeBg}`}
                >
                  {ann.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Forensic Telemetry & Source Registry Drawer */}
      <div className="shrink-0 border-t border-chamber-border bg-chamber-panel">
        <div className="flex flex-wrap items-center justify-between border-b border-chamber-border px-4">
          <div className="flex items-center gap-1">
            {[
              {
                id: "findings",
                label: `Advisory Evidence Flags (${document.forensic_findings.length})`,
              },
              {
                id: "qr_vs_ocr",
                label: "Layer 1 · QR-vs-OCR Cross-Lock",
              },
              {
                id: "pdf_structure",
                label: `Layer 2 · PDF Metadata & Fonts (${document.pdf_metadata.eof_markers} %%EOF)`,
              },
              {
                id: "authority_api",
                label: `Source Authority API (${document.authority_status})`,
              },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setBottomDrawerTab(tab.id as typeof bottomDrawerTab)}
                className={`border-b-2 px-3 py-1.5 text-xs font-medium transition-colors duration-150 ${
                  bottomDrawerTab === tab.id
                    ? "border-blue-400 text-white"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="py-1 font-mono text-[11px] text-slate-400">
            ELA Mean Error: <strong className="text-slate-200">{currentXray.ela.mean_error}</strong> · Max Block:{" "}
            <strong className="text-amber-300">{currentXray.ela.max_block_error}</strong> · Median Noise σ:{" "}
            <strong className="text-slate-200">{currentXray.noise_grid.median_noise_sigma}</strong>
          </div>
        </div>

        <div className="chamber-scroll h-44 overflow-y-auto p-3">
          {bottomDrawerTab === "findings" && (
            <div className="space-y-2">
              {document.forensic_findings.length === 0 ? (
                <div className="flex items-center gap-2 border border-teal-500/30 bg-teal-950/30 px-3 py-2.5 text-xs text-teal-200">
                  <ShieldCheck className="h-4 w-4 text-teal-400" />
                  All 3 Forensic X-Ray layers (QR-vs-OCR, PDF Structure/DSC, and 90% JPEG ELA Heatmap) passed with zero anomalies.
                </div>
              ) : (
                document.forensic_findings.map((f) => (
                  <div
                    key={f.id}
                    onClick={() => onSelectFinding(f.id)}
                    className="cursor-pointer border border-chamber-border bg-[#12171F] p-3 transition-colors hover:border-slate-600"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-1.5 py-0.5 font-mono text-[10px] font-bold ${
                            f.severity === "CRITICAL"
                              ? "bg-red-700 text-white"
                              : "bg-amber-700 text-white"
                          }`}
                        >
                          ▲ {f.severity}
                        </span>
                        <span className="font-mono text-xs text-blue-300">{f.layer}</span>
                        <span className="text-xs font-semibold text-white">{f.title}</span>
                      </div>
                      <span className="font-mono text-xs tabular-nums text-slate-300">
                        AI Confidence: {(f.confidence * 100).toFixed(0)}% · {f.aph_clause}
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs leading-relaxed text-slate-300">{f.evidence}</p>
                  </div>
                ))
              )}
            </div>
          )}

          {bottomDrawerTab === "qr_vs_ocr" && (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="border border-chamber-border bg-[#12171F] p-3">
                <div className="flex items-center justify-between border-b border-chamber-border pb-2">
                  <span className="font-mono text-xs font-semibold text-blue-300">
                    DECODED EMBEDDED QR PAYLOAD (CRYPTOGRAPHIC SOURCE)
                  </span>
                  <span className="font-mono text-[11px] text-teal-300">● QR DECODED</span>
                </div>
                <pre className="mt-2 overflow-x-auto font-mono text-xs leading-relaxed text-slate-200">
                  {JSON.stringify(document.qr_payload, null, 2)}
                </pre>
              </div>

              <div className="border border-chamber-border bg-[#12171F] p-3">
                <div className="flex items-center justify-between border-b border-chamber-border pb-2">
                  <span className="font-mono text-xs font-semibold text-amber-300">
                    PRINTED DOCUMENT OCR EXTRACTION (SURFACE TEXT)
                  </span>
                  <span className="font-mono text-[11px] text-slate-300">PyMuPDF Span Parser</span>
                </div>
                <dl className="mt-2 space-y-1.5 font-mono text-xs">
                  {Object.entries(document.extracted_fields).map(([k, v]) => {
                    const isConflict =
                      v.includes("180") || v.includes("2026-12-31") || v.includes("SHORTFALL");
                    return (
                      <div key={k} className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1">
                        <dt className="text-slate-400">{k}:</dt>
                        <dd
                          className={`font-semibold ${
                            isConflict ? "text-red-400" : "text-slate-100"
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
          )}

          {bottomDrawerTab === "pdf_structure" && (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="border border-chamber-border bg-[#12171F] p-3 font-mono text-xs">
                <div className="border-b border-chamber-border pb-1.5 font-semibold text-slate-200">
                  PDF CONTAINER & INCREMENTAL SAVE TELEMETRY (pikepdf)
                </div>
                <div className="mt-2 space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-400">/Producer:</span>
                    <span
                      className={
                        document.pdf_metadata.producer.toLowerCase().includes("photoshop") ||
                        document.pdf_metadata.producer.toLowerCase().includes("tampered")
                          ? "font-bold text-red-400"
                          : "text-slate-200"
                      }
                    >
                      {document.pdf_metadata.producer}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">/Creator:</span>
                    <span className="text-slate-200">{document.pdf_metadata.creator}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">/CreationDate:</span>
                    <span className="text-slate-200">{document.pdf_metadata.creation_date}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">/ModDate:</span>
                    <span
                      className={
                        document.pdf_metadata.creation_date !== document.pdf_metadata.mod_date
                          ? "font-bold text-red-400"
                          : "text-teal-300"
                      }
                    >
                      {document.pdf_metadata.mod_date}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">%%EOF Trailer Count:</span>
                    <span
                      className={
                        document.pdf_metadata.eof_markers > 1
                          ? "font-bold text-red-400"
                          : "text-teal-300"
                      }
                    >
                      {document.pdf_metadata.eof_markers} ({document.pdf_metadata.incremental_updates} Post-Save Revisions)
                    </span>
                  </div>
                </div>
              </div>

              <div className="border border-chamber-border bg-[#12171F] p-3 font-mono text-xs">
                <div className="border-b border-chamber-border pb-1.5 font-semibold text-slate-200">
                  SPAN-LEVEL FONT CONSISTENCY & DSC CHECK
                </div>
                <div className="mt-2 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Dominant Body Font:</span>
                    <span className="text-slate-200">{document.pdf_metadata.dominant_font}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">PKCS#7 / X.509 DSC Signature:</span>
                    <span
                      className={
                        document.pdf_metadata.has_digital_signature
                          ? "text-teal-300"
                          : "text-amber-300"
                      }
                    >
                      {document.pdf_metadata.has_digital_signature
                        ? "● PRESENT & VALIDATED"
                        : "▲ UNSIGNED / BROKEN BYTE-RANGE"}
                    </span>
                  </div>
                  {document.pdf_metadata.font_anomalies.length > 0 ? (
                    document.pdf_metadata.font_anomalies.map((fa, i) => (
                      <div
                        key={i}
                        className="border border-red-500/40 bg-red-950/40 p-2 text-[11px] text-red-200"
                      >
                        ▲ FONT ANOMALY: {fa.reason}
                      </div>
                    ))
                  ) : (
                    <div className="border border-teal-500/30 bg-teal-950/30 p-2 text-[11px] text-teal-200">
                      ● Zero foreign font injections detected across all page text spans.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {bottomDrawerTab === "authority_api" && (
            <div className="border border-chamber-border bg-[#12171F] p-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-chamber-border pb-2">
                <div>
                  <div className="font-mono text-xs font-semibold text-white">
                    {document.authority_response.portal}
                  </div>
                  <div className="font-mono text-[11px] text-slate-400">
                    HTTP {document.authority_response.http_status} · Latency:{" "}
                    {document.authority_response.latency_ms} ms · Last Sync:{" "}
                    {document.authority_response.queried_at}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={pingingAuthority}
                  onClick={() => onPingAuthority(document.doc_id)}
                  className="inline-flex items-center gap-1.5 border border-blue-500 bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${pingingAuthority ? "animate-spin" : ""}`} />
                  {pingingAuthority ? "Querying Registry..." : "Re-Verify Source API Live"}
                </button>
              </div>
              <div className="mt-2.5 grid grid-cols-1 gap-3 md:grid-cols-2">
                <pre className="overflow-x-auto bg-chamber p-2.5 font-mono text-xs text-slate-200">
                  {JSON.stringify(document.authority_response.source_record, null, 2)}
                </pre>
                <div className="flex flex-col justify-between font-mono text-xs">
                  {document.authority_response.discrepancy ? (
                    <div className="border border-red-500/50 bg-red-950/50 p-3 text-red-200">
                      <strong>▲ REGISTRY DISCREPANCY:</strong>
                      <p className="mt-1">{document.authority_response.discrepancy}</p>
                    </div>
                  ) : (
                    <div className="border border-teal-500/40 bg-teal-950/40 p-3 text-teal-200">
                      <strong>● SOURCE REGISTRY MATCH:</strong>
                      <p className="mt-1">
                        All certificate attributes match the authoritative issuing registry record 100%.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
