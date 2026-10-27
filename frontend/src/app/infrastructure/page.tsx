"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { DossierPayload } from "@/types/veritas";
import { AppShell } from "@/components/AppShell";
import { Blueprint3DViewer } from "@/components/floorplan3d/Blueprint3DViewer";
import {
  Camera,
  MapPin,
  Fingerprint,
  Eye,
  Flame,
  CopyCheck,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
} from "lucide-react";

function InfrastructureContent() {
  const searchParams = useSearchParams();
  const appId = searchParams.get("app") || "AICTE-2026-EOA-8841";
  const initialMediaId = searchParams.get("media") || "MEDIA-8841-LAB";

  const [dossier, setDossier] = useState<DossierPayload | null>(null);
  const [selectedMediaId, setSelectedMediaId] = useState<string>(initialMediaId);
  const [viewMode, setViewMode] = useState<"cv_boxes" | "clone_compare" | "ela">("cv_boxes");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/applications/${encodeURIComponent(appId)}`);
        if (res.ok) {
          setDossier(await res.json());
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [appId]);

  useEffect(() => {
    if (searchParams.get("media")) {
      setSelectedMediaId(searchParams.get("media")!);
    }
  }, [searchParams]);

  const activeMedia =
    dossier?.infrastructure_media.find((m) => m.media_id === selectedMediaId) ||
    dossier?.infrastructure_media[0] ||
    null;

  const hasClone = Boolean(activeMedia?.clone_matches && activeMedia.clone_matches.length > 0);
  const isGeoViolation = activeMedia?.exif.geo_status === "OUTSIDE_CAMPUS_BOUNDARY";

  return (
    <AppShell activeAppId={appId}>
      {/* Top Page Header */}
      <div className="mb-6 rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-[#0F172A] sm:text-2xl">
              Infrastructure Computer Vision & Cross-College Clone Hunter
            </h1>
            <p className="mt-1 text-sm text-[#475569]">
              Inspects campus and laboratory photographs against AICTE APH 2024–27 norms (equipment counts, seating capacity, barrier-free ramps), verifies EXIF GPS campus boundaries, and checks for recycled photos across all institutions.
            </p>
          </div>
        </div>

        {/* Facility Photo Selector Cards */}
        {dossier && (
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {dossier.infrastructure_media.map((m) => {
              const isSelected = m.media_id === activeMedia?.media_id;
              const cloneDetected = m.clone_matches && m.clone_matches.length > 0;
              return (
                <button
                  key={m.media_id}
                  type="button"
                  onClick={() => {
                    setSelectedMediaId(m.media_id);
                    setViewMode(cloneDetected ? "clone_compare" : "cv_boxes");
                  }}
                  className={`flex flex-col justify-between rounded-xl border p-4 text-left transition-all ${
                    isSelected
                      ? "border-[#1D4ED8] bg-[#EFF6FF]/70 shadow-sm ring-1 ring-[#1D4ED8]"
                      : "border-[#E2E8F0] bg-[#F8FAFC] hover:border-[#CBD5E1] hover:bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Camera
                        className={`h-4 w-4 shrink-0 ${
                          isSelected ? "text-[#1D4ED8]" : "text-[#64748B]"
                        }`}
                      />
                      <span className="text-xs font-bold text-[#0F172A]">{m.facility_type}</span>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold ${
                        cloneDetected
                          ? "bg-[#FEF2F2] text-[#B91C1C]"
                          : m.aph_compliance.status === "COMPLIANT"
                          ? "bg-[#F0FDFA] text-[#0F766E]"
                          : "bg-[#FFFBEB] text-[#B45309]"
                      }`}
                    >
                      {cloneDetected ? "Duplicate + Off-Campus" : m.aph_compliance.status}
                    </span>
                  </div>
                  <div className="mt-1.5 text-xs font-medium text-[#334155]">{m.title}</div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {loading || !activeMedia ? (
        <div className="h-[540px] animate-pulse rounded-xl bg-white" />
      ) : (
        <div className="space-y-6">
          {/* Alert Banner if Cross-College Clone or GPS Violation is Present */}
          {hasClone && (
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-5">
              <div className="flex items-start gap-3">
                <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-[#B91C1C]" />
                <div>
                  <h2 className="text-sm font-bold text-[#991B1B]">
                    Cross-College Duplicate Photo & Off-Campus GPS Alert
                  </h2>
                  <p className="mt-1 text-xs leading-relaxed text-[#7F1D1D]">
                    Perceptual Hash (`pHash: {activeMedia.hashes.phash}`) matched this Computer Lab photo against{" "}
                    <strong>{activeMedia.clone_matches[0].matched_inst_name}</strong> (Application{" "}
                    <span className="font-mono">{activeMedia.clone_matches[0].matched_app_id}</span>) with{" "}
                    <strong>{activeMedia.clone_matches[0].similarity_percent}% visual similarity</strong>. In addition, embedded EXIF GPS coordinates place this photo in Nagpur (624.1 km from the registered Pune campus).
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewMode("clone_compare")}
                className="rounded-lg bg-[#B91C1C] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#991B1B]"
              >
                View Side-by-Side Clone Comparison
              </button>
            </div>
          )}

          {/* Main Inspection Grid */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Left 8 Columns: Visual Inspector */}
            <div className="rounded-xl border border-[#E2E8F0] bg-white shadow-sm lg:col-span-8">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E2E8F0] px-5 py-3.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setViewMode("cv_boxes")}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                      viewMode === "cv_boxes"
                        ? "border-[#1E3A8A] bg-[#1E3A8A] text-white"
                        : "border-[#CBD5E1] bg-white text-[#334155] hover:bg-[#F8FAFC]"
                    }`}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Equipment & Facility Detection ({activeMedia.cv_detections.length})
                  </button>
                  {hasClone && (
                    <button
                      type="button"
                      onClick={() => setViewMode("clone_compare")}
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                        viewMode === "clone_compare"
                          ? "border-[#B91C1C] bg-[#B91C1C] text-white"
                          : "border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C]"
                      }`}
                    >
                      <CopyCheck className="h-3.5 w-3.5" />
                      Side-by-Side Clone Comparison
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setViewMode("ela")}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                      viewMode === "ela"
                        ? "border-[#1E3A8A] bg-[#1E3A8A] text-white"
                        : "border-[#CBD5E1] bg-white text-[#334155] hover:bg-[#F8FAFC]"
                    }`}
                  >
                    <Flame className="h-3.5 w-3.5" />
                    Photo Tamper Heatmap (ELA)
                  </button>
                </div>
              </div>

              <div className="bg-[#F1F5F9] p-6">
                {viewMode === "clone_compare" && hasClone ? (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="rounded-xl border border-[#FECACA] bg-white p-3.5 shadow-sm">
                      <div className="mb-2 flex items-center justify-between text-xs">
                        <span className="font-bold text-[#B91C1C]">
                          Submitted Photo ({activeMedia.app_id})
                        </span>
                        <span className="font-mono text-[#64748B]">
                          pHash: {activeMedia.hashes.phash}
                        </span>
                      </div>
                      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-lg border border-[#E2E8F0]">
                        <img
                          src={activeMedia.specimen_data_url}
                          alt={activeMedia.title}
                          className="h-full w-full object-contain"
                        />
                        <div
                          style={{ left: "15.6%", top: "22.6%", width: "30.7%", height: "8.0%" }}
                          className="absolute border-2 border-[#DC2626] bg-[#DC2626]/20"
                        >
                          <span className="absolute -top-5 left-0 rounded bg-[#B91C1C] px-1.5 py-0.5 text-[10px] font-bold text-white">
                            Pasted College Name Banner
                          </span>
                        </div>
                      </div>
                      <p className="mt-2 text-xs text-[#475569]">
                        Submitted by: <strong>{activeMedia.inst_name}</strong>
                      </p>
                    </div>

                    <div className="rounded-xl border border-[#FDE68A] bg-white p-3.5 shadow-sm">
                      <div className="mb-2 flex items-center justify-between text-xs">
                        <span className="font-bold text-[#B45309]">
                          Matched Archive ({activeMedia.clone_matches[0].matched_app_id})
                        </span>
                        <span className="font-mono text-[#64748B]">
                          pHash: {activeMedia.clone_matches[0].matched_phash}
                        </span>
                      </div>
                      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-lg border border-[#E2E8F0]">
                        <img
                          src={activeMedia.clone_matches[0].preview_data_url}
                          alt={activeMedia.clone_matches[0].matched_facility}
                          className="h-full w-full object-contain"
                        />
                      </div>
                      <p className="mt-2 text-xs text-[#475569]">
                        Original Owner: <strong>{activeMedia.clone_matches[0].matched_inst_name}</strong>
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="relative mx-auto aspect-[16/10] w-full max-w-[740px] overflow-hidden rounded-lg border border-[#CBD5E1] bg-white shadow-md">
                    <img
                      src={
                        viewMode === "ela"
                          ? activeMedia.ela_heatmap_data_url
                          : activeMedia.specimen_data_url
                      }
                      alt={activeMedia.title}
                      className="block h-full w-full object-contain"
                    />
                    {viewMode === "cv_boxes" &&
                      activeMedia.cv_detections.map((det) => {
                        const [x, y, w, h] = det.bbox;
                        const isCrit = det.status === "CRITICAL";
                        const isWarn = det.status === "WARNING";
                        return (
                          <div
                            key={det.id}
                            style={{
                              left: `${x * 100}%`,
                              top: `${y * 100}%`,
                              width: `${w * 100}%`,
                              height: `${h * 100}%`,
                            }}
                            className={`absolute rounded-sm border-2 ${
                              isCrit
                                ? "border-[#DC2626] bg-[#DC2626]/15"
                                : isWarn
                                ? "border-[#D97706] bg-[#D97706]/15"
                                : "border-[#0F766E] bg-[#0F766E]/15"
                            }`}
                          >
                            <span
                              className={`absolute -top-6 left-0 whitespace-nowrap rounded px-2 py-0.5 text-[10px] font-semibold text-white shadow ${
                                isCrit
                                  ? "bg-[#B91C1C]"
                                  : isWarn
                                  ? "bg-[#B45309]"
                                  : "bg-[#0F766E]"
                              }`}
                            >
                              {det.label}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>

            {/* Right 4 Columns: APH Norms, EXIF GPS & Perceptual Hash Details */}
            <div className="space-y-4 lg:col-span-4">
              {/* Card 1: AICTE APH Compliance Assessment */}
              <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
                  <h2 className="text-sm font-bold text-[#0F172A]">
                    AICTE APH 2024–27 Compliance
                  </h2>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      activeMedia.aph_compliance.status === "COMPLIANT"
                        ? "bg-[#F0FDFA] text-[#0F766E]"
                        : "bg-[#FEF2F2] text-[#B91C1C]"
                    }`}
                  >
                    {activeMedia.aph_compliance.status}
                  </span>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-[#334155]">
                  {activeMedia.aph_compliance.summary}
                </p>
                <div className="mt-3 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3 font-mono text-xs text-[#475569]">
                  Rule Reference: {activeMedia.aph_compliance.aph_clause}
                </div>
              </div>

              {/* Card 2: EXIF Geo-Temporal Verification */}
              <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-[#1D4ED8]" />
                    <h2 className="text-sm font-bold text-[#0F172A]">
                      EXIF GPS & Timestamp Check
                    </h2>
                  </div>
                  {isGeoViolation ? (
                    <span className="rounded-full bg-[#FEF2F2] px-2.5 py-0.5 text-xs font-semibold text-[#B91C1C]">
                      Off-Campus
                    </span>
                  ) : (
                    <span className="rounded-full bg-[#F0FDFA] px-2.5 py-0.5 text-xs font-semibold text-[#0F766E]">
                      On-Campus Verified
                    </span>
                  )}
                </div>

                <div className="mt-3 space-y-2 text-xs">
                  <div className="flex justify-between border-b border-[#E2E8F0] pb-1.5">
                    <span className="text-[#64748B]">Photo GPS Coordinates:</span>
                    <span className="font-mono font-semibold text-[#0F172A]">
                      {activeMedia.exif.lat?.toFixed(4)}° N, {activeMedia.exif.lng?.toFixed(4)}° E
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-[#E2E8F0] pb-1.5">
                    <span className="text-[#64748B]">Registered Campus Center:</span>
                    <span className="font-mono text-[#334155]">
                      {activeMedia.exif.campus_lat.toFixed(4)}° N, {activeMedia.exif.campus_lng.toFixed(4)}° E
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-[#E2E8F0] pb-1.5">
                    <span className="text-[#64748B]">Distance from Campus:</span>
                    <span
                      className={`font-mono font-bold ${
                        isGeoViolation ? "text-[#B91C1C]" : "text-[#0F766E]"
                      }`}
                    >
                      {activeMedia.exif.distance_m !== null
                        ? activeMedia.exif.distance_m >= 1000
                          ? `${(activeMedia.exif.distance_m / 1000).toFixed(1)} km away (Limit: 500m)`
                          : `${activeMedia.exif.distance_m.toFixed(1)} meters (Within 500m)`
                        : "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Camera & Software:</span>
                    <span className="font-mono text-[#334155]">{activeMedia.exif.software}</span>
                  </div>
                </div>
              </div>

              {/* Card 3: Perceptual Hash & Vector Fingerprint */}
              <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2 border-b border-[#E2E8F0] pb-3">
                  <Fingerprint className="h-4 w-4 text-[#B45309]" />
                  <h2 className="text-sm font-bold text-[#0F172A]">
                    Clone Hunter Fingerprints (`imagehash`)
                  </h2>
                </div>
                <div className="mt-3 space-y-1.5 font-mono text-xs text-[#334155]">
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Perceptual Hash (pHash):</span>
                    <span className="font-semibold">{activeMedia.hashes.phash}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Difference Hash (dHash):</span>
                    <span>{activeMedia.hashes.dhash}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Wavelet Hash (wHash):</span>
                    <span>{activeMedia.hashes.whash}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stage 4: Interactive 2D-to-3D Blueprint Room Norm Extruder */}
          <Blueprint3DViewer />
        </div>
      )}
    </AppShell>
  );
}

export default function InfrastructurePage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-[#475569]">Loading Infrastructure Inspector...</div>}>
      <InfrastructureContent />
    </Suspense>
  );
}
