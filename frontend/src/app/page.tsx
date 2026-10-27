"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ApplicationSummary, DossierPayload } from "@/types/veritas";
import { AppShell } from "@/components/AppShell";
import {
  Search,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileSearch,
  Building2,
  ClipboardCheck,
  ShieldAlert,
  UploadCloud,
  MapPin,
} from "lucide-react";

export default function ScrutinyQueueDashboardPage() {
  const [applications, setApplications] = useState<ApplicationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<"SCRUTINY_OFFICER" | "NODAL_OFFICER">("SCRUTINY_OFFICER");
  const [filterStatus, setFilterStatus] = useState<"ALL" | "FLAGGED" | "READY">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function loadQueue() {
      setLoading(true);
      try {
        const appsRes = await fetch("/api/applications");
        if (appsRes.ok) {
          setApplications(await appsRes.json());
        }
      } finally {
        setLoading(false);
      }
    }
    loadQueue();
  }, []);

  const filteredApplications = applications.filter((app) => {
    const matchesSearch =
      app.inst_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.app_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.state.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (filterStatus === "FLAGGED") return app.risk_score >= 40;
    if (filterStatus === "READY") return app.risk_score < 40;
    return true;
  });

  return (
    <AppShell role={role} onRoleChange={setRole}>
      {/* Top Page Header & Role Context */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
        <div className="max-w-2xl">
          <h1 className="text-xl font-bold text-[#0F172A] sm:text-2xl">
            {role === "SCRUTINY_OFFICER"
              ? "AICTE Application Scrutiny Queue (2026–27 Cycle)"
              : "Institution Nodal Officer Pre-Scrutiny Dashboard"}
          </h1>
          <p className="mt-1.5 text-sm leading-relaxed text-[#475569]">
            {role === "SCRUTINY_OFFICER"
              ? "Review automated pre-scrutiny validation reports before committee sign-off. Veritas cross-checks application forms against State NOCs, Fire Safety certificates, issuing authority portals, and geotagged campus photos."
              : "Check your institution's uploaded certificates and campus photographs against AICTE Approval Process Handbook (APH 2024–27) requirements to rectify deficiencies prior to final scrutiny."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/portal"
            className="inline-flex items-center gap-2 rounded-lg border border-[#CBD5E1] bg-white px-4 py-2.5 text-sm font-semibold text-[#1E293B] transition-colors hover:bg-[#F8FAFC]"
          >
            <UploadCloud className="h-4 w-4 text-[#1D4ED8]" />
            Upload & Test Documents
          </Link>
          <Link
            href="/applications/AICTE-2026-EOA-8841"
            className="inline-flex items-center gap-2 rounded-lg bg-[#1E3A8A] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#1E40AF]"
          >
            Review Priority Application
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Workflow Stepper Strip — Explains How Veritas Works Across Pages */}
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-4">
        <Link
          href="/applications/AICTE-2026-EOA-8841"
          className="flex items-start justify-between rounded-xl border border-[#E2E8F0] bg-white p-4 transition-colors hover:border-[#93C5FD] hover:bg-[#F8FAFC]"
        >
          <div>
            <div className="text-sm font-semibold text-[#0F172A]">
              1. Checklist & Consistency
            </div>
            <p className="mt-1 text-xs leading-relaxed text-[#475569]">
              Compare applied intake & courses against State NOC, Fire Certificate, and AICTE history.
            </p>
          </div>
          <ClipboardCheck className="h-5 w-5 shrink-0 text-[#1D4ED8]" />
        </Link>

        <Link
          href="/forensics?app=AICTE-2026-EOA-8841"
          className="flex items-start justify-between rounded-xl border border-[#E2E8F0] bg-white p-4 transition-colors hover:border-[#93C5FD] hover:bg-[#F8FAFC]"
        >
          <div>
            <div className="text-sm font-semibold text-[#0F172A]">
              2. Document Forensics
            </div>
            <p className="mt-1 text-xs leading-relaxed text-[#475569]">
              Inspect QR code vs. printed text mismatches, PDF edits, and visual tamper heatmaps.
            </p>
          </div>
          <FileSearch className="h-5 w-5 shrink-0 text-[#B91C1C]" />
        </Link>

        <Link
          href="/infrastructure?app=AICTE-2026-EOA-8841"
          className="flex items-start justify-between rounded-xl border border-[#E2E8F0] bg-white p-4 transition-colors hover:border-[#93C5FD] hover:bg-[#F8FAFC]"
        >
          <div>
            <div className="text-sm font-semibold text-[#0F172A]">
              3. Infrastructure & Clone Check
            </div>
            <p className="mt-1 text-xs leading-relaxed text-[#475569]">
              Verify classroom area, lab equipment, GPS campus location, and cross-college duplicate photos.
            </p>
          </div>
          <Building2 className="h-5 w-5 shrink-0 text-[#B45309]" />
        </Link>

        <Link
          href="/portal?app=AICTE-2026-EOA-8841"
          className="flex items-start justify-between rounded-xl border border-[#E2E8F0] bg-white p-4 transition-colors hover:border-[#93C5FD] hover:bg-[#F8FAFC]"
        >
          <div>
            <div className="text-sm font-semibold text-[#0F172A]">
              4. Upload & Audit Trail
            </div>
            <p className="mt-1 text-xs leading-relaxed text-[#475569]">
              Run pre-submission checks on new files and inspect the immutable SHA-256 officer log.
            </p>
          </div>
          <UploadCloud className="h-5 w-5 shrink-0 text-[#0F766E]" />
        </Link>
      </div>

      {/* Main Two-Column Queue Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left 8 Columns: Submitted Institutional Applications Queue */}
        <div className="space-y-4 lg:col-span-8">
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2E8F0] pb-4">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#0F172A]">
                  Submitted Institutional Dossiers
                </h2>
                <span className="rounded-full bg-[#F1F5F9] px-2.5 py-0.5 font-mono text-xs font-semibold text-[#334155]">
                  {filteredApplications.length} of {applications.length}
                </span>
              </div>

              {/* Filter Tabs & Search */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-0.5 text-xs">
                  {[
                    { id: "ALL", label: "All Dossiers" },
                    { id: "FLAGGED", label: "Needs Review" },
                    { id: "READY", label: "Ready to Approve" },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setFilterStatus(tab.id as typeof filterStatus)}
                      className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                        filterStatus === tab.id
                          ? "bg-white text-[#0F172A] shadow-sm font-semibold"
                          : "text-[#64748B] hover:text-[#0F172A]"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-[#64748B]" />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search institution or ID..."
                    className="rounded-lg border border-[#CBD5E1] bg-white py-1.5 pl-8 pr-3 text-xs text-[#0F172A] placeholder:text-[#64748B] focus:border-[#1D4ED8]"
                  />
                </div>
              </div>
            </div>

            {/* Application Dossier List */}
            {loading ? (
              <div className="space-y-3 py-6">
                <div className="h-28 animate-pulse rounded-lg bg-[#F1F5F9]" />
                <div className="h-28 animate-pulse rounded-lg bg-[#F1F5F9]" />
              </div>
            ) : (
              <div className="divide-y divide-[#E2E8F0]">
                {filteredApplications.map((app) => {
                  const isHighRisk = app.risk_score >= 70;
                  const isMediumRisk = app.risk_score >= 40 && app.risk_score < 70;

                  return (
                    <div key={app.app_id} className="py-5 first:pt-4 last:pb-1">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded bg-[#F1F5F9] px-2 py-0.5 font-mono text-xs font-semibold text-[#334155]">
                              {app.app_id}
                            </span>
                            <span className="text-xs font-medium text-[#475569]">
                              {app.category}
                            </span>
                            <span className="text-xs text-[#64748B]">
                              · {app.city}, {app.state}
                            </span>
                          </div>
                          <h3 className="mt-1.5 text-base font-bold text-[#0F172A]">
                            {app.inst_name}
                          </h3>
                        </div>

                        {/* Status Badge */}
                        <div>
                          {isHighRisk ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#FECACA] bg-[#FEF2F2] px-3 py-1 text-xs font-semibold text-[#B91C1C]">
                              <ShieldAlert className="h-3.5 w-3.5" />
                              {app.overall_status}
                            </span>
                          ) : isMediumRisk ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#FDE68A] bg-[#FFFBEB] px-3 py-1 text-xs font-semibold text-[#B45309]">
                              <AlertTriangle className="h-3.5 w-3.5" />
                              {app.overall_status}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#99F6E4] bg-[#F0FDFA] px-3 py-1 text-xs font-semibold text-[#0F766E]">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              {app.overall_status}
                            </span>
                          )}
                        </div>
                      </div>

                      <p className="mt-2 text-xs leading-relaxed text-[#475569]">
                        {app.ai_summary}
                      </p>

                      {/* Key Metrics & Direct Page Links */}
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3.5 py-2.5">
                        <div className="flex flex-wrap items-center gap-4 text-xs">
                          <div>
                            <span className="text-[#64748B]">Applied Intake: </span>
                            <strong className="font-mono font-semibold text-[#0F172A] tabular-nums">
                              {app.applied_intake} Seats
                            </strong>{" "}
                            <span className="text-[#64748B]">
                              (Prev EoA: {app.historical_eoa_intake})
                            </span>
                          </div>
                          <div>
                            <span className="text-[#64748B]">Nodal Officer: </span>
                            <strong className="font-medium text-[#334155]">
                              {app.nodal_officer}
                            </strong>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/forensics?app=${app.app_id}`}
                            className="inline-flex items-center gap-1 rounded-md border border-[#CBD5E1] bg-white px-2.5 py-1.5 text-xs font-medium text-[#334155] transition-colors hover:bg-[#F1F5F9]"
                          >
                            <FileSearch className="h-3.5 w-3.5 text-[#1D4ED8]" />
                            Document Forensics
                          </Link>
                          <Link
                            href={`/infrastructure?app=${app.app_id}`}
                            className="inline-flex items-center gap-1 rounded-md border border-[#CBD5E1] bg-white px-2.5 py-1.5 text-xs font-medium text-[#334155] transition-colors hover:bg-[#F1F5F9]"
                          >
                            <Building2 className="h-3.5 w-3.5 text-[#0F766E]" />
                            Infrastructure CV
                          </Link>
                          <Link
                            href={`/applications/${app.app_id}`}
                            className="inline-flex items-center gap-1 rounded-md bg-[#1E3A8A] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#1E40AF]"
                          >
                            Open Checklist
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right 4 Columns: Priority Alerts Requiring Officer Action Today */}
        <div className="space-y-4 lg:col-span-4">
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <h2 className="text-base font-bold text-[#0F172A]">
                Priority Findings to Inspect
              </h2>
              <span className="rounded-full bg-[#FEF2F2] px-2.5 py-0.5 font-mono text-xs font-semibold text-[#B91C1C]">
                4 Urgent
              </span>
            </div>

            <div className="mt-4 space-y-3">
              <div className="rounded-lg border border-[#FECACA] bg-[#FEF2F2]/60 p-3.5">
                <div className="flex items-center justify-between text-xs font-semibold text-[#B91C1C]">
                  <span>QR vs. Printed Intake Mismatch</span>
                  <span className="font-mono">DOC-8841-NOC</span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-[#334155]">
                  State NOC QR code payload specifies <strong>120 seats</strong>, but printed text on page 1 reads <strong>180 seats</strong> (edited in Courier font).
                </p>
                <Link
                  href="/forensics?app=AICTE-2026-EOA-8841&doc=DOC-8841-NOC"
                  className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#1D4ED8] hover:underline"
                >
                  Inspect Certificate in Document Studio →
                </Link>
              </div>

              <div className="rounded-lg border border-[#FECACA] bg-[#FEF2F2]/60 p-3.5">
                <div className="flex items-center justify-between text-xs font-semibold text-[#B91C1C]">
                  <span>Expired Fire Certificate & Cloned Seal</span>
                  <span className="font-mono">DOC-8841-FIRE</span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-[#334155]">
                  Municipal Fire Portal confirms expiry on <strong>2025-03-31</strong>. Printed date was altered to 2026-12-31 and official seal was duplicated.
                </p>
                <Link
                  href="/forensics?app=AICTE-2026-EOA-8841&doc=DOC-8841-FIRE"
                  className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#1D4ED8] hover:underline"
                >
                  Inspect Fire Certificate & Seal →
                </Link>
              </div>

              <div className="rounded-lg border border-[#FECACA] bg-[#FEF2F2]/60 p-3.5">
                <div className="flex items-center justify-between text-xs font-semibold text-[#B91C1C]">
                  <span>Cross-College Cloned Lab Photo</span>
                  <span className="font-mono">MEDIA-8841-LAB</span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-[#334155]">
                  AI Computer Lab photo matches <strong>Deccan College, Nagpur (2025 EoA)</strong> with 96.9% similarity and GPS coordinates 624 km away.
                </p>
                <Link
                  href="/infrastructure?app=AICTE-2026-EOA-8841&media=MEDIA-8841-LAB"
                  className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#1D4ED8] hover:underline"
                >
                  Compare Side-by-Side Photos →
                </Link>
              </div>

              <div className="rounded-lg border border-[#FDE68A] bg-[#FFFBEB]/70 p-3.5">
                <div className="flex items-center justify-between text-xs font-semibold text-[#B45309]">
                  <span>Classroom CR-102 Carpet Area Shortfall</span>
                  <span className="font-mono">DOC-8841-FLOOR</span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-[#334155]">
                  Architect floor plan measures CR-102 at <strong>48.0 sq.m</strong> (38 seats detected) vs. AICTE APH minimum norm of <strong>66.0 sq.m</strong> (60 seats).
                </p>
                <Link
                  href="/infrastructure?app=AICTE-2026-EOA-8841&media=MEDIA-8841-CR102"
                  className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#1D4ED8] hover:underline"
                >
                  Review Classroom Norm Check →
                </Link>
              </div>
            </div>
          </div>

          {/* Issuing Authority Portals Status Card */}
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
            <h2 className="border-b border-[#E2E8F0] pb-3 text-base font-bold text-[#0F172A]">
              Connected Issuing Authority Gateways
            </h2>
            <div className="mt-3 space-y-2.5 text-xs">
              {[
                {
                  doc_type: "State Government NOC",
                  portal: "Maharashtra e-NOC / DigiLocker Gateway",
                  status: "Mismatch Detected",
                },
                {
                  doc_type: "Fire Safety Certificate",
                  portal: "Pune Municipal Corporation Fire Portal API",
                  status: "Expired",
                },
                {
                  doc_type: "Architect Certified Floor Plan",
                  portal: "Council of Architecture (COA) Registry API",
                  status: "Verified",
                },
                {
                  doc_type: "Sworn Affidavit (Annexure-2)",
                  portal: "StockHolding CRA & NIC e-Sign CCA",
                  status: "Verified",
                },
              ].map((item) => (
                <div
                  key={item.doc_type}
                  className="flex items-center justify-between rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2"
                >
                  <div>
                    <div className="font-semibold text-[#0F172A]">{item.doc_type}</div>
                    <div className="text-[11px] text-[#64748B]">{item.portal}</div>
                  </div>
                  <span
                    className={`rounded-md px-2 py-0.5 font-mono text-[11px] font-semibold ${
                      item.status === "Verified"
                        ? "border border-[#99F6E4] bg-[#F0FDFA] text-[#0F766E]"
                        : "border border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C]"
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
