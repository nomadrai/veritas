"use client";

import React, { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { DossierPayload } from "@/types/veritas";
import { AppShell } from "@/components/AppShell";
import { LiveUploadSandbox } from "@/components/LiveUploadSandbox";
import { Lock, History, Building2, PlusCircle, ArrowRight, RefreshCw } from "lucide-react";

function PortalAndAuditContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const appId = searchParams.get("app") || "AICTE-2026-EOA-8841";
  const [dossier, setDossier] = useState<DossierPayload | null>(null);

  // Stage 1: New Application Form State
  const [instName, setInstName] = useState("Sardar Patel Institute of Advanced Robotics, Ahmedabad");
  const [instId, setInstId] = useState("1-66402918");
  const [city, setCity] = useState("Ahmedabad");
  const [stateName, setStateName] = useState("Gujarat");
  const [nodalOfficer, setNodalOfficer] = useState("Dr. Vikramaditya Mehta");
  const [courseName, setCourseName] = useState("B.Tech in Artificial Intelligence & Data Science");
  const [appliedIntake, setAppliedIntake] = useState(180);
  const [histIntake, setHistIntake] = useState(120);
  const [facultyCount, setFacultyCount] = useState(28);
  const [builtupSqm, setBuiltupSqm] = useState(13200);
  const [campusLat, setCampusLat] = useState(18.4579);
  const [campusLng, setCampusLng] = useState(73.8511);
  const [nocFile, setNocFile] = useState<File | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [submittingApp, setSubmittingApp] = useState(false);
  const [createdBanner, setCreatedBanner] = useState<{ appId: string; summary: string } | null>(null);

  const loadDossier = useCallback(async () => {
    const res = await fetch(`/api/applications/${encodeURIComponent(appId)}`);
    if (res.ok) {
      setDossier(await res.json());
    }
  }, [appId]);

  useEffect(() => {
    loadDossier();
  }, [loadDossier]);

  const handleCreateApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingApp(true);
    try {
      const fd = new FormData();
      fd.append("inst_name", instName);
      fd.append("inst_id", instId);
      fd.append("city", city);
      fd.append("state", stateName);
      fd.append("nodal_officer", nodalOfficer);
      fd.append("course_name", courseName);
      fd.append("applied_intake", String(appliedIntake));
      fd.append("historical_eoa_intake", String(histIntake));
      fd.append("faculty_count", String(facultyCount));
      fd.append("declared_builtup_sqm", String(builtupSqm));
      fd.append("campus_lat", String(campusLat));
      fd.append("campus_lng", String(campusLng));
      if (nocFile) fd.append("noc_pdf", nocFile);
      if (photoFile) fd.append("campus_photo", photoFile);

      const res = await fetch("/api/applications/create", {
        method: "POST",
        body: fd,
      });
      if (res.ok) {
        const data = await res.json();
        setCreatedBanner({ appId: data.app_id, summary: data.ai_summary });
        await loadDossier();
      }
    } finally {
      setSubmittingApp(false);
    }
  };

  return (
    <AppShell activeAppId={appId}>
      <div className="space-y-8">
        {/* Top Page Title */}
        <div className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
          <h1 className="text-xl font-bold text-[#0F172A] sm:text-2xl">
            Nodal Officer Application Submission, Pre-Check &amp; Audit Trail
          </h1>
          <p className="mt-1 text-sm text-[#475569]">
            Submit a new institutional application dossier to dynamically generate its 4-Way Consistency Table and APH 2024–27 Checklist from OCR and forensics, test individual files in the sandbox, or inspect the immutable SHA-256 regulatory audit log.
          </p>
        </div>

        {/* Stage 1: Real End-to-End "Submit New Institution Application" Flow */}
        <div className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E2E8F0] pb-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-[#1E3A8A]" />
              <div>
                <h2 className="text-lg font-bold text-[#0F172A]">
                  Submit New Institution Application Dossier (Dynamic End-to-End Ingestion)
                </h2>
                <p className="text-xs text-[#475569]">
                  Runs live PyMuPDF OCR, QR-vs-OCR Cross-Lock, ELA, EXIF GPS, and pHash Clone Hunter to create a new dossier in the Scrutiny Queue.
                </p>
              </div>
            </div>
            <span className="rounded-full border border-[#99F6E4] bg-[#F0FDFA] px-3 py-1 text-xs font-semibold text-[#0F766E]">
              Live Database &amp; OCR Pipeline
            </span>
          </div>

          <form onSubmit={handleCreateApplication} className="mt-5 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[#334155]">
                  Institution Name
                </label>
                <input
                  type="text"
                  required
                  value={instName}
                  onChange={(e) => setInstName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] px-3 py-2 text-xs text-[#0F172A] focus:border-[#1D4ED8] focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#334155]">
                  AICTE Permanent ID
                </label>
                <input
                  type="text"
                  required
                  value={instId}
                  onChange={(e) => setInstId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] px-3 py-2 font-mono text-xs text-[#0F172A] focus:border-[#1D4ED8] focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#334155]">
                  Nodal Officer Name
                </label>
                <input
                  type="text"
                  required
                  value={nodalOfficer}
                  onChange={(e) => setNodalOfficer(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] px-3 py-2 text-xs text-[#0F172A] focus:border-[#1D4ED8] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#334155]">
                  City &amp; State
                </label>
                <div className="mt-1 flex gap-2">
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-1/2 rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] px-2.5 py-2 text-xs text-[#0F172A]"
                  />
                  <input
                    type="text"
                    value={stateName}
                    onChange={(e) => setStateName(e.target.value)}
                    className="w-1/2 rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] px-2.5 py-2 text-xs text-[#0F172A]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#334155]">
                  Applied vs. Previous Intake
                </label>
                <div className="mt-1 flex gap-2">
                  <input
                    type="number"
                    value={appliedIntake}
                    onChange={(e) => setAppliedIntake(Number(e.target.value))}
                    className="w-1/2 rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] px-2.5 py-2 font-mono text-xs text-[#0F172A]"
                    title="Applied Intake"
                  />
                  <input
                    type="number"
                    value={histIntake}
                    onChange={(e) => setHistIntake(Number(e.target.value))}
                    className="w-1/2 rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] px-2.5 py-2 font-mono text-xs text-[#0F172A]"
                    title="Historical EoA Intake"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#334155]">
                  Regular Faculty &amp; Built-up (m²)
                </label>
                <div className="mt-1 flex gap-2">
                  <input
                    type="number"
                    value={facultyCount}
                    onChange={(e) => setFacultyCount(Number(e.target.value))}
                    className="w-1/2 rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] px-2.5 py-2 font-mono text-xs text-[#0F172A]"
                  />
                  <input
                    type="number"
                    value={builtupSqm}
                    onChange={(e) => setBuiltupSqm(Number(e.target.value))}
                    className="w-1/2 rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] px-2.5 py-2 font-mono text-xs text-[#0F172A]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#334155]">
                  Campus GPS (Lat / Lng)
                </label>
                <div className="mt-1 flex gap-2">
                  <input
                    type="number"
                    step="0.0001"
                    value={campusLat}
                    onChange={(e) => setCampusLat(Number(e.target.value))}
                    className="w-1/2 rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] px-2.5 py-2 font-mono text-xs text-[#0F172A]"
                  />
                  <input
                    type="number"
                    step="0.0001"
                    value={campusLng}
                    onChange={(e) => setCampusLng(Number(e.target.value))}
                    className="w-1/2 rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] px-2.5 py-2 font-mono text-xs text-[#0F172A]"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 pt-1 sm:grid-cols-2">
              <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                <label className="block text-xs font-semibold text-[#334155]">
                  Supporting State NOC / Certificate PDF (Optional — uses benchmark NOC if omitted)
                </label>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setNocFile(e.target.files?.[0] || null)}
                  className="mt-1.5 text-xs text-[#475569]"
                />
              </div>
              <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                <label className="block text-xs font-semibold text-[#334155]">
                  Geotagged Campus / Lab Photo JPEG (Optional — uses benchmark photo if omitted)
                </label>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png"
                  onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                  className="mt-1.5 text-xs text-[#475569]"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <span className="text-xs text-[#64748B]">
                Course: <strong>{courseName}</strong> · Automatically generates 4-Way Consistency Table &amp; APH Checklist.
              </span>
              <button
                type="submit"
                disabled={submittingApp}
                className="inline-flex items-center gap-2 rounded-lg bg-[#1E3A8A] px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#1E40AF] disabled:opacity-50"
              >
                {submittingApp ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <PlusCircle className="h-4 w-4" />
                )}
                {submittingApp
                  ? "Running OCR, Forensics & Creating Dossier..."
                  : "Submit Dossier & Run Full Pre-Scrutiny"}
              </button>
            </div>
          </form>

          {createdBanner && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#99F6E4] bg-[#F0FDFA] p-4">
              <div className="max-w-2xl text-xs text-[#0F766E]">
                <strong className="font-bold">
                  ✓ New Application Created ({createdBanner.appId}):
                </strong>{" "}
                {createdBanner.summary}
              </div>
              <button
                type="button"
                onClick={() => router.push(`/applications/${createdBanner.appId}`)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#0F766E] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#115E59]"
              >
                Open Generated Dossier ({createdBanner.appId})
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Live Upload & Diagnostic Sandbox */}
        <div className="rounded-xl border border-[#E2E8F0] bg-white shadow-sm">
          <LiveUploadSandbox onAuditCreated={loadDossier} />
        </div>

        {/* Immutable Regulatory Audit Trail */}
        {dossier && (
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E2E8F0] pb-4">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-[#1E3A8A]" />
                <div>
                  <h2 className="text-lg font-bold text-[#0F172A]">
                    Immutable Regulatory Audit Log ({dossier.audit_logs.length} Entries)
                  </h2>
                  <p className="text-xs text-[#475569]">
                    Every AI validation rule, issuing authority API response, and officer override is cryptographically chained (`prev_hash` → `entry_hash`).
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#99F6E4] bg-[#F0FDFA] px-3 py-1 font-mono text-xs font-semibold text-[#0F766E]">
                <Lock className="h-3.5 w-3.5" />
                SHA-256 Chain Verified
              </span>
            </div>

            <div className="mt-4 divide-y divide-[#E2E8F0]">
              {dossier.audit_logs.map((entry) => (
                <div key={entry.id} className="py-4 first:pt-2 last:pb-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-[#F1F5F9] px-2 py-0.5 font-mono text-xs font-semibold text-[#1E293B]">
                        {entry.actor_role}
                      </span>
                      <span className="text-xs font-semibold text-[#1D4ED8]">
                        {entry.action_type} → {entry.target_id}
                      </span>
                      {entry.ai_confidence !== null && (
                        <span className="font-mono text-xs text-[#64748B]">
                          · AI Confidence: {(entry.ai_confidence * 100).toFixed(0)}%
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full border border-[#CBD5E1] bg-[#F8FAFC] px-2.5 py-0.5 text-xs font-semibold text-[#334155]">
                        {entry.status_after}
                      </span>
                      <span className="font-mono text-xs text-[#64748B] tabular-nums">
                        {entry.timestamp}
                      </span>
                    </div>
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-[#334155]">
                    {entry.rationale}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-4 rounded bg-[#F8FAFC] px-3 py-1.5 font-mono text-[11px] text-[#64748B]">
                    <span>Entry SHA-256: {entry.entry_hash.slice(0, 32)}...</span>
                    <span>Prev Hash: {entry.prev_hash.slice(0, 20)}...</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

export default function PortalPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-[#475569]">Loading Portal...</div>}>
      <PortalAndAuditContent />
    </Suspense>
  );
}
