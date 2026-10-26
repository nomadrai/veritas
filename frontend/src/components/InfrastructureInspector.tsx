"use client";

import React, { useState } from "react";
import { InfrastructureMedia } from "@/types/veritas";
import {
  Camera,
  MapPin,
  Fingerprint,
  Flame,
  Eye,
  AlertTriangle,
  CheckCircle2,
  CopyCheck,
} from "lucide-react";

interface InfrastructureInspectorProps {
  media: InfrastructureMedia;
}

export function InfrastructureInspector({ media }: InfrastructureInspectorProps) {
  const [viewMode, setViewMode] = useState<"cv_boxes" | "ela_heatmap" | "clone_diff">("cv_boxes");
  const hasClone = media.clone_matches && media.clone_matches.length > 0;
  const isGeoViolation = media.exif.geo_status === "OUTSIDE_CAMPUS_BOUNDARY";

  return (
    <div className="flex h-full flex-col bg-chamber text-slate-100">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-chamber-border bg-chamber-panel px-4 py-2.5">
        <div className="flex items-center gap-3">
          <span className="border border-slate-600 bg-slate-800 px-2 py-0.5 font-mono text-xs font-semibold text-slate-200">
            INFRASTRUCTURE CV · {media.media_id}
          </span>
          <h2 className="text-sm font-semibold text-white">
            {media.title} ({media.facility_type})
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {hasClone ? (
            <span className="inline-flex items-center gap-1.5 border border-red-500/50 bg-red-950/80 px-2.5 py-0.5 font-mono text-xs font-semibold text-red-200">
              <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
              ▲ CROSS-COLLEGE CLONE ({media.clone_matches[0].similarity_percent}% SIMILARITY)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 border border-teal-500/40 bg-teal-950/70 px-2.5 py-0.5 font-mono text-xs font-semibold text-teal-200">
              <CheckCircle2 className="h-3.5 w-3.5 text-teal-400" />
              ● UNIQUE PERCEPTUAL HASH
            </span>
          )}

          <span
            className={`inline-flex items-center gap-1.5 border px-2.5 py-0.5 font-mono text-xs font-semibold tabular-nums ${
              isGeoViolation
                ? "border-red-500/50 bg-red-950/80 text-red-200"
                : "border-teal-500/40 bg-teal-950/70 text-teal-200"
            }`}
          >
            <MapPin className="h-3.5 w-3.5" />
            {isGeoViolation
              ? `▲ OFF-CAMPUS GPS (${((media.exif.distance_m || 0) / 1000).toFixed(1)} KM AWAY)`
              : `● ON-CAMPUS GPS (${media.exif.distance_m?.toFixed(1)}M)`}
          </span>
        </div>
      </div>

      {/* Mode Switcher Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-chamber-border bg-[#131820] px-4 py-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setViewMode("cv_boxes")}
            className={`inline-flex items-center gap-1.5 border px-2.5 py-1 text-xs font-medium ${
              viewMode === "cv_boxes"
                ? "border-blue-500 bg-blue-600 text-white"
                : "border-chamber-border bg-chamber-panel text-slate-300 hover:text-white"
            }`}
          >
            <Eye className="h-3.5 w-3.5" />
            APH Computer Vision Detections ({media.cv_detections.length})
          </button>
          <button
            type="button"
            onClick={() => setViewMode("ela_heatmap")}
            className={`inline-flex items-center gap-1.5 border px-2.5 py-1 text-xs font-medium ${
              viewMode === "ela_heatmap"
                ? "border-blue-500 bg-blue-600 text-white"
                : "border-chamber-border bg-chamber-panel text-slate-300 hover:text-white"
            }`}
          >
            <Flame className="h-3.5 w-3.5" />
            Photo ELA Tamper Heatmap
          </button>
          {hasClone && (
            <button
              type="button"
              onClick={() => setViewMode("clone_diff")}
              className={`inline-flex items-center gap-1.5 border px-2.5 py-1 text-xs font-medium ${
                viewMode === "clone_diff"
                  ? "border-red-500 bg-red-700 text-white"
                  : "border-red-500/40 bg-red-950/40 text-red-200 hover:bg-red-900/50"
              }`}
            >
              <CopyCheck className="h-3.5 w-3.5" />
              Side-by-Side Cross-College Clone Comparator
            </button>
          )}
        </div>

        <div className="font-mono text-xs tabular-nums text-slate-300">
          pHash (64-bit DCT): <span className="text-amber-300">{media.hashes.phash}</span> · dHash:{" "}
          <span className="text-blue-300">{media.hashes.dhash}</span>
        </div>
      </div>

      {/* Main Inspection Viewport */}
      <div className="chamber-scroll optical-grid-bg flex flex-1 flex-col items-center justify-center overflow-auto p-6">
        {viewMode === "clone_diff" && hasClone ? (
          <div className="grid w-full max-w-5xl grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Current Uploaded Photo */}
            <div className="border border-red-500/60 bg-chamber-panel p-3">
              <div className="mb-2 flex items-center justify-between border-b border-chamber-border pb-1.5 font-mono text-xs">
                <span className="font-bold text-red-300">
                  SUBMITTED SPECIMEN · {media.app_id}
                </span>
                <span className="text-slate-300">pHash: {media.hashes.phash}</span>
              </div>
              <div className="relative aspect-[16/10] w-full overflow-hidden border border-slate-700 bg-black">
                <img
                  src={media.specimen_data_url}
                  alt={media.title}
                  className="h-full w-full object-contain"
                />
                {/* Highlight spliced banner on cloned lab photo */}
                <div
                  style={{ left: "15.6%", top: "22.6%", width: "30.7%", height: "8.0%" }}
                  className="absolute border-2 border-red-500 bg-red-500/25"
                >
                  <span className="absolute -top-5 left-0 bg-red-700 px-1.5 py-0.5 font-mono text-[10px] font-bold text-white">
                    SPLICED BANNER OVERLAY (ELA z=6.1)
                  </span>
                </div>
              </div>
              <div className="mt-2 font-mono text-xs text-slate-300">
                <div>Institution: {media.inst_name}</div>
                <div className="text-red-300">
                  EXIF GPS: {media.exif.lat}° N, {media.exif.lng}° E (Nagpur — 624.1 km from Pune!)
                </div>
              </div>
            </div>

            {/* Historical Matched Photo from Another College */}
            <div className="border border-amber-500/60 bg-chamber-panel p-3">
              <div className="mb-2 flex items-center justify-between border-b border-chamber-border pb-1.5 font-mono text-xs">
                <span className="font-bold text-amber-300">
                  HISTORICAL MATCH · {media.clone_matches[0].matched_app_id}
                </span>
                <span className="text-slate-300">
                  pHash: {media.clone_matches[0].matched_phash}
                </span>
              </div>
              <div className="relative aspect-[16/10] w-full overflow-hidden border border-slate-700 bg-black">
                <img
                  src={media.clone_matches[0].preview_data_url}
                  alt={media.clone_matches[0].matched_facility}
                  className="h-full w-full object-contain"
                />
              </div>
              <div className="mt-2 font-mono text-xs text-slate-300">
                <div>Original Owner: {media.clone_matches[0].matched_inst_name}</div>
                <div className="text-amber-300">
                  Hamming Dist: {media.clone_matches[0].phash_hamming_distance} bits · pgvector Cosine Sim:{" "}
                  {(media.clone_matches[0].vector_cosine_similarity * 100).toFixed(1)}%
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="relative mx-auto aspect-[16/10] w-full max-w-[780px] border border-slate-700 bg-black shadow-lg">
            <img
              src={
                viewMode === "ela_heatmap"
                  ? media.ela_heatmap_data_url
                  : media.specimen_data_url
              }
              alt={media.title}
              className="block h-full w-full object-contain"
            />

            {viewMode === "cv_boxes" &&
              media.cv_detections.map((det) => {
                const [x, y, w, h] = det.bbox;
                const colorClass =
                  det.status === "CRITICAL"
                    ? "border-red-500 bg-red-500/20"
                    : det.status === "WARNING"
                    ? "border-amber-400 bg-amber-500/20"
                    : "border-teal-400 bg-teal-500/15";
                const badgeClass =
                  det.status === "CRITICAL"
                    ? "bg-red-700 text-white"
                    : det.status === "WARNING"
                    ? "bg-amber-700 text-white"
                    : "bg-teal-800 text-white";

                return (
                  <div
                    key={det.id}
                    style={{
                      left: `${x * 100}%`,
                      top: `${y * 100}%`,
                      width: `${w * 100}%`,
                      height: `${h * 100}%`,
                    }}
                    className={`absolute border-2 ${colorClass}`}
                  >
                    <span
                      className={`absolute -top-6 left-0 whitespace-nowrap px-1.5 py-0.5 font-mono text-[10px] font-semibold shadow ${badgeClass}`}
                    >
                      {det.label} ({(det.confidence * 100).toFixed(0)}%)
                    </span>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* Bottom Telemetry Strip: EXIF Geo-Temporal + Clone Hunter + APH Norms */}
      <div className="grid grid-cols-1 gap-3 border-t border-chamber-border bg-chamber-panel p-4 md:grid-cols-3">
        {/* Column 1: EXIF Geo-Temporal Verification */}
        <div className="border border-chamber-border bg-[#12171F] p-3 font-mono text-xs">
          <div className="flex items-center justify-between border-b border-chamber-border pb-1.5">
            <span className="font-semibold text-white">EXIF GEO-TEMPORAL VERIFIER</span>
            <Camera className="h-3.5 w-3.5 text-blue-400" />
          </div>
          <div className="mt-2 space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-400">Photo GPS:</span>
              <span className={isGeoViolation ? "font-bold text-red-400" : "text-teal-300"}>
                {media.exif.lat?.toFixed(4)}° N, {media.exif.lng?.toFixed(4)}° E
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Campus Target:</span>
              <span className="text-slate-200">
                {media.exif.campus_lat.toFixed(4)}° N, {media.exif.campus_lng.toFixed(4)}° E
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Haversine Delta:</span>
              <span className={isGeoViolation ? "font-bold text-red-400" : "text-teal-300"}>
                {media.exif.distance_m !== null
                  ? media.exif.distance_m >= 1000
                    ? `${(media.exif.distance_m / 1000).toFixed(1)} km (Max 0.5 km)`
                    : `${media.exif.distance_m.toFixed(1)} m (Max 500 m)`
                  : "N/A"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Software Tag:</span>
              <span
                className={
                  media.exif.software.toLowerCase().includes("photoshop")
                    ? "font-bold text-red-400"
                    : "text-slate-200"
                }
              >
                {media.exif.software}
              </span>
            </div>
          </div>
        </div>

        {/* Column 2: Perceptual Hash & pgvector Clone Hunter */}
        <div className="border border-chamber-border bg-[#12171F] p-3 font-mono text-xs">
          <div className="flex items-center justify-between border-b border-chamber-border pb-1.5">
            <span className="font-semibold text-white">CLONE HUNTER (pHash + pgvector)</span>
            <Fingerprint className="h-3.5 w-3.5 text-amber-400" />
          </div>
          <div className="mt-2 space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-400">pHash / dHash:</span>
              <span className="text-slate-200">
                {media.hashes.phash} / {media.hashes.dhash}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Wavelet wHash:</span>
              <span className="text-slate-200">{media.hashes.whash}</span>
            </div>
            {hasClone ? (
              <div className="mt-1.5 border border-red-500/40 bg-red-950/50 p-1.5 text-red-200">
                ▲ Matched: <strong>{media.clone_matches[0].matched_inst_name}</strong> (Hamming
                dist={media.clone_matches[0].phash_hamming_distance}, Cosine=
                {(media.clone_matches[0].vector_cosine_similarity * 100).toFixed(1)}%)
              </div>
            ) : (
              <div className="mt-1.5 border border-teal-500/30 bg-teal-950/30 p-1.5 text-teal-200">
                ● 0 duplicate matches across national AICTE pgvector repository.
              </div>
            )}
          </div>
        </div>

        {/* Column 3: AICTE APH 2024-27 Compliance Verdict */}
        <div className="border border-chamber-border bg-[#12171F] p-3 font-mono text-xs">
          <div className="flex items-center justify-between border-b border-chamber-border pb-1.5">
            <span className="font-semibold text-white">AICTE APH 2024-27 CV ASSESSMENT</span>
            <span
              className={`px-1.5 py-0.5 text-[10px] font-bold ${
                media.aph_compliance.status === "COMPLIANT"
                  ? "bg-teal-800 text-white"
                  : "bg-red-700 text-white"
              }`}
            >
              {media.aph_compliance.status}
            </span>
          </div>
          <p className="mt-2 font-sans text-xs leading-relaxed text-slate-300">
            {media.aph_compliance.summary}
          </p>
        </div>
      </div>
    </div>
  );
}
