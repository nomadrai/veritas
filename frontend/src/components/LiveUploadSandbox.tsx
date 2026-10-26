"use client";

import React, { useState } from "react";
import { DocumentXRay } from "@/types/veritas";
import {
  Upload,
  Sparkles,
  FileText,
  Image as ImageIcon,
  ShieldAlert,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";

interface LiveAnalysisResult {
  filename: string;
  is_pdf: boolean;
  xray: DocumentXRay;
  cv_analysis: {
    hashes: { phash: string; dhash: string; ahash: string; whash: string };
    exif: {
      lat: number | null;
      lng: number | null;
      distance_m: number | null;
      geo_status: string;
      software: string;
      explanation: string;
    };
    clone_matches: Array<{
      matched_inst_name: string;
      matched_app_id: string;
      phash_hamming_distance: number;
      similarity_percent: number;
    }>;
  } | null;
}

export function LiveUploadSandbox({ onAuditCreated }: { onAuditCreated: () => void }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LiveAnalysisResult | null>(null);
  const [showEla, setShowEla] = useState(true);

  const runPresetTest = async (presetKey: string) => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("preset_specimen", presetKey);
      const res = await fetch("/api/live-analyze", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        setResult(data);
        onAuditCreated();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/live-analyze", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        setResult(data);
        onAuditCreated();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 p-4">
      <div className="border border-paper-border bg-paper-elevated p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-paper-border pb-3">
          <h3 className="text-base font-semibold text-ink">
            Live Pre-Scrutiny Forensic & CV Diagnostic Lab
          </h3>
          <span className="border border-cobalt/30 bg-cobalt-surface px-2.5 py-0.5 font-mono text-xs font-medium text-cobalt">
            REAL-TIME PYTHON OPEN-CV + PyMuPDF ENGINE
          </span>
        </div>

        <p className="mt-2.5 text-xs leading-relaxed text-ink-secondary">
          Upload any supporting PDF certificate or geotagged campus photograph from your machine—or
          trigger one of the synthetic benchmark specimens below—to execute live Error Level Analysis
          (ELA), QR-vs-OCR Cross-Lock, SIFT Copy-Move detection, EXIF Haversine GPS verification, and
          64-bit Perceptual Hash (`pHash`) Clone Hunting.
        </p>

        {/* Upload Dropzone & Instant Test Specimen Triggers */}
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="flex cursor-pointer flex-col items-center justify-center border border-dashed border-ink-muted bg-paper p-4 text-center transition-colors hover:border-cobalt hover:bg-cobalt-surface/30">
            <Upload className="h-5 w-5 text-cobalt" />
            <span className="mt-1.5 text-xs font-semibold text-ink">
              Upload Custom PDF or JPEG/PNG Specimen
            </span>
            <span className="mt-0.5 font-mono text-[11px] text-ink-muted">
              Runs PyMuPDF, pikepdf, OpenCV ELA, QRCodeDetector & imagehash live
            </span>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          <div className="space-y-1.5">
            <div className="font-mono text-[11px] font-semibold text-ink-secondary">
              OR RUN 1-CLICK BENCHMARK SPECIMEN THROUGH PYTHON PIPELINE:
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: "tampered_noc", label: "Tampered State NOC (QR!=OCR + ELA)", icon: FileText },
                { id: "expired_fire_seal_clone", label: "Fire NOC (Cloned Seal SIFT)", icon: FileText },
                { id: "cloned_nagpur_lab", label: "Cloned Lab Photo (pHash + Nagpur GPS)", icon: ImageIcon },
                { id: "clean_affidavit", label: "Clean e-Stamp Affidavit (Valid DSC)", icon: FileText },
              ].map((btn) => {
                const Icon = btn.icon;
                return (
                  <button
                    key={btn.id}
                    type="button"
                    disabled={loading}
                    onClick={() => runPresetTest(btn.id)}
                    className="inline-flex items-center gap-1.5 border border-paper-border bg-paper px-2.5 py-1.5 text-xs font-medium text-ink transition-colors hover:border-cobalt hover:bg-cobalt-surface disabled:opacity-50"
                  >
                    <Icon className="h-3.5 w-3.5 text-cobalt" />
                    {btn.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-2 border border-paper-border bg-paper-elevated p-8 font-mono text-xs text-ink">
          <RefreshCw className="h-4 w-4 animate-spin text-cobalt" />
          Executing OpenCV Error Level Analysis, SIFT Keypoint Matching, QR Decode & pHash Vector Search...
        </div>
      )}

      {result && !loading && (
        <div className="border border-paper-border bg-paper-elevated p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-paper-border pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-cobalt" />
              <h4 className="text-sm font-semibold text-ink">
                Live Diagnostic Output: <span className="font-mono">{result.filename}</span>
              </h4>
            </div>
            <button
              type="button"
              onClick={() => setShowEla(!showEla)}
              className="border border-ink bg-ink px-2.5 py-1 font-mono text-xs text-white"
            >
              {showEla ? "Showing: ELA Heatmap Overlay" : "Showing: Original Specimen"}
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="border border-chamber-border bg-chamber p-2">
              <img
                src={
                  showEla
                    ? result.xray.ela.ela_heatmap_data_url
                    : result.xray.specimen_data_url
                }
                alt="Live Analyzed Specimen"
                className="mx-auto max-h-80 object-contain"
              />
            </div>

            <div className="space-y-2.5 font-mono text-xs">
              <div className="border border-paper-border bg-paper p-2.5">
                <div className="font-semibold text-ink">1. OpenCV Error Level Analysis (ELA)</div>
                <div className="mt-1 text-ink-secondary">
                  Mean Error: <strong>{result.xray.ela.mean_error}</strong> · Max Block Error:{" "}
                  <strong>{result.xray.ela.max_block_error}</strong> · High-Z Tamper Hotspots:{" "}
                  <strong className="text-vermilion">{result.xray.ela.hotspots.length}</strong>
                </div>
              </div>

              <div className="border border-paper-border bg-paper p-2.5">
                <div className="font-semibold text-ink">2. QR-vs-OCR Cross-Lock & SIFT Copy-Move</div>
                <div className="mt-1 text-ink-secondary">
                  Decoded QR Codes: <strong>{result.xray.qr_codes.length}</strong> · QR-OCR Conflicts:{" "}
                  <strong
                    className={
                      result.xray.qr_ocr_discrepancies.length > 0
                        ? "text-vermilion"
                        : "text-veridian"
                    }
                  >
                    {result.xray.qr_ocr_discrepancies.length}
                  </strong>{" "}
                  · SIFT Cloned Regions:{" "}
                  <strong
                    className={
                      result.xray.copy_move_regions.length > 0
                        ? "text-vermilion"
                        : "text-veridian"
                    }
                  >
                    {result.xray.copy_move_regions.length}
                  </strong>
                </div>
                {result.xray.qr_ocr_discrepancies.map((d, i) => (
                  <div
                    key={i}
                    className="mt-1.5 border border-vermilion-border bg-vermilion-surface p-1.5 text-[11px] text-vermilion"
                  >
                    ▲ {d.explanation}
                  </div>
                ))}
              </div>

              {result.is_pdf && (
                <div className="border border-paper-border bg-paper p-2.5">
                  <div className="font-semibold text-ink">3. PDF Container & Font Forensics</div>
                  <div className="mt-1 text-ink-secondary">
                    Producer: <strong>{result.xray.pdf_forensics.producer}</strong> · %%EOF Trailers:{" "}
                    <strong>{result.xray.pdf_forensics.eof_markers}</strong> · Font Anomalies:{" "}
                    <strong className="text-vermilion">
                      {result.xray.pdf_forensics.font_anomalies.length}
                    </strong>
                  </div>
                </div>
              )}

              {result.cv_analysis && (
                <div className="border border-paper-border bg-paper p-2.5">
                  <div className="font-semibold text-ink">
                    3. Clone Hunter (pHash) & EXIF Geo-Boundary
                  </div>
                  <div className="mt-1 text-ink-secondary">
                    pHash: <strong>{result.cv_analysis.hashes.phash}</strong> · GPS Status:{" "}
                    <strong
                      className={
                        result.cv_analysis.exif.geo_status === "VERIFIED_ON_CAMPUS"
                          ? "text-veridian"
                          : "text-vermilion"
                      }
                    >
                      {result.cv_analysis.exif.geo_status}
                    </strong>
                  </div>
                  <div className="mt-1 text-[11px] text-ink-secondary">
                    {result.cv_analysis.exif.explanation}
                  </div>
                  {result.cv_analysis.clone_matches.length > 0 ? (
                    <div className="mt-1.5 flex items-center gap-1.5 border border-vermilion-border bg-vermilion-surface p-1.5 text-[11px] font-semibold text-vermilion">
                      <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
                      CLONE HIT: Matches {result.cv_analysis.clone_matches[0].matched_inst_name} (
                      {result.cv_analysis.clone_matches[0].similarity_percent}% similarity, pHash
                      dist={result.cv_analysis.clone_matches[0].phash_hamming_distance})
                    </div>
                  ) : (
                    <div className="mt-1.5 flex items-center gap-1.5 border border-veridian-border bg-veridian-surface p-1.5 text-[11px] text-veridian">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                      Zero cross-college duplicate photos found in repository.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
