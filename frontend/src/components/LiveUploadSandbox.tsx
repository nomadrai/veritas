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
  const [showEla, setShowEla] = useState(false);

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
    <div className="space-y-5 p-6">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E2E8F0] pb-4">
        <div>
          <h2 className="text-lg font-bold text-[#0F172A]">
            Upload Document or Campus Photo for Instant Pre-Scrutiny
          </h2>
          <p className="mt-0.5 text-xs text-[#475569]">
            Upload any PDF certificate or JPEG/PNG campus photo from your computer—or click a sample file below—to run live OCR, QR verification, tamper heatmap (ELA), and duplicate photo detection.
          </p>
        </div>
        <span className="rounded-full border border-[#BFDBFE] bg-[#EFF6FF] px-3 py-1 text-xs font-semibold text-[#1D4ED8]">
          Live Python Verification Engine
        </span>
      </div>

      {/* Upload Dropzone & Sample Test Buttons */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-6 text-center transition-colors hover:border-[#1D4ED8] hover:bg-[#EFF6FF]/40">
          <Upload className="h-6 w-6 text-[#1D4ED8]" />
          <span className="mt-2 text-sm font-semibold text-[#0F172A]">
            Click to Upload PDF, JPEG, or PNG
          </span>
          <span className="mt-1 text-xs text-[#64748B]">
            Checks QR vs. OCR text, PDF edits, ELA tamper heatmap, EXIF GPS & duplicate hashes
          </span>
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp"
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>

        <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
          <div className="text-xs font-semibold text-[#334155]">
            Or test with a pre-loaded sample file:
          </div>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {[
              { id: "tampered_noc", label: "Altered State NOC (QR != Text)", icon: FileText },
              { id: "expired_fire_seal_clone", label: "Expired Fire NOC (Cloned Seal)", icon: FileText },
              { id: "cloned_nagpur_lab", label: "Duplicate Lab Photo (Nagpur GPS)", icon: ImageIcon },
              { id: "clean_affidavit", label: "Authentic e-Stamp Affidavit", icon: FileText },
            ].map((btn) => {
              const Icon = btn.icon;
              return (
                <button
                  key={btn.id}
                  type="button"
                  disabled={loading}
                  onClick={() => runPresetTest(btn.id)}
                  className="inline-flex items-center gap-2 rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-left text-xs font-medium text-[#1E293B] shadow-sm transition-colors hover:border-[#1D4ED8] hover:bg-[#EFF6FF]/50 disabled:opacity-50"
                >
                  <Icon className="h-4 w-4 shrink-0 text-[#1D4ED8]" />
                  <span>{btn.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-2.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-8 text-xs font-medium text-[#334155]">
          <RefreshCw className="h-4 w-4 animate-spin text-[#1D4ED8]" />
          Running OCR extraction, QR cross-lock, Error Level Analysis (ELA), and Perceptual Hash check...
        </div>
      )}

      {result && !loading && (
        <div className="rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E2E8F0] pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#1D4ED8]" />
              <h3 className="text-sm font-bold text-[#0F172A]">
                Verification Report: <span className="font-mono">{result.filename}</span>
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setShowEla(!showEla)}
              className="rounded-lg border border-[#CBD5E1] bg-white px-3 py-1.5 text-xs font-semibold text-[#1E293B] shadow-sm hover:bg-[#F1F5F9]"
            >
              {showEla ? "Switch to Original Document View" : "Switch to Tamper Heatmap (ELA)"}
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="flex items-center justify-center rounded-xl border border-[#CBD5E1] bg-white p-4">
              <img
                src={
                  showEla
                    ? result.xray.ela.ela_heatmap_data_url
                    : result.xray.specimen_data_url
                }
                alt="Inspected File Preview"
                className="max-h-80 rounded object-contain"
              />
            </div>

            <div className="space-y-3 text-xs">
              <div className="rounded-lg border border-[#E2E8F0] bg-white p-3.5">
                <div className="font-bold text-[#0F172A]">1. QR Code vs. Printed Text Check</div>
                <div className="mt-1 text-[#475569]">
                  QR Codes Found: <strong>{result.xray.qr_codes.length}</strong> · Discrepancies:{" "}
                  <strong
                    className={
                      result.xray.qr_ocr_discrepancies.length > 0
                        ? "text-[#B91C1C]"
                        : "text-[#0F766E]"
                    }
                  >
                    {result.xray.qr_ocr_discrepancies.length}
                  </strong>
                </div>
                {result.xray.qr_ocr_discrepancies.map((d, i) => (
                  <div
                    key={i}
                    className="mt-2 rounded-md border border-[#FECACA] bg-[#FEF2F2] p-2 text-[#B91C1C]"
                  >
                    ▲ {d.explanation}
                  </div>
                ))}
              </div>

              <div className="rounded-lg border border-[#E2E8F0] bg-white p-3.5">
                <div className="font-bold text-[#0F172A]">
                  2. Visual Tamper (ELA) & Seal Duplication
                </div>
                <div className="mt-1 text-[#475569]">
                  Tamper Regions Flagged:{" "}
                  <strong className="text-[#B91C1C]">{result.xray.ela.hotspots.length}</strong> ·
                  Duplicated Stamps:{" "}
                  <strong className="text-[#B91C1C]">
                    {result.xray.copy_move_regions.length}
                  </strong>
                </div>
              </div>

              {result.is_pdf && (
                <div className="rounded-lg border border-[#E2E8F0] bg-white p-3.5">
                  <div className="font-bold text-[#0F172A]">3. PDF Editing & Font Check</div>
                  <div className="mt-1 text-[#475569]">
                    Software: <strong>{result.xray.pdf_forensics.producer}</strong> · Revisions:{" "}
                    <strong>{result.xray.pdf_forensics.eof_markers}</strong> · Font Mismatches:{" "}
                    <strong className="text-[#B91C1C]">
                      {result.xray.pdf_forensics.font_anomalies.length}
                    </strong>
                  </div>
                </div>
              )}

              {result.cv_analysis && (
                <div className="rounded-lg border border-[#E2E8F0] bg-white p-3.5">
                  <div className="font-bold text-[#0F172A]">
                    3. Duplicate Photo & GPS Location Check
                  </div>
                  <div className="mt-1 text-[#475569]">
                    {result.cv_analysis.exif.explanation}
                  </div>
                  {result.cv_analysis.clone_matches.length > 0 ? (
                    <div className="mt-2 flex items-center gap-1.5 rounded-md border border-[#FECACA] bg-[#FEF2F2] p-2 font-semibold text-[#B91C1C]">
                      <ShieldAlert className="h-4 w-4 shrink-0" />
                      Duplicate Match: {result.cv_analysis.clone_matches[0].matched_inst_name} (
                      {result.cv_analysis.clone_matches[0].similarity_percent}% match)
                    </div>
                  ) : (
                    <div className="mt-2 flex items-center gap-1.5 rounded-md border border-[#99F6E4] bg-[#F0FDFA] p-2 text-[#0F766E]">
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      Unique campus photo — no cross-college duplicates found.
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
