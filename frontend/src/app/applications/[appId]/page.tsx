"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { DossierPayload, ApplicationSummary } from "@/types/veritas";
import { AppShell } from "@/components/AppShell";
import { LayaDecisionPanel } from "@/components/LayaDecisionPanel";
import snapshotData from "@/data/veritas_snapshot.json";
import {
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  FileSearch,
  Building2,
  RefreshCw,
  Gavel,
  ArrowRight,
  ExternalLink,
} from "lucide-react";

function getInitialDossier(appId: string): DossierPayload {
  const base = snapshotData.primary_dossier as unknown as DossierPayload;
  if (appId === "AICTE-2026-EOA-8841") return base;
  const sec = (
    snapshotData.secondary_meta as unknown as Record<string, Partial<DossierPayload>>
  )[appId];
  if (sec) {
    return {
      ...base,
      application: (sec.application as DossierPayload["application"]) || base.application,
      institution: (sec.institution as DossierPayload["institution"]) || base.institution,
      documents: (sec.documents as DossierPayload["documents"]) || base.documents,
      infrastructure_media:
        (sec.infrastructure_media as DossierPayload["infrastructure_media"]) ||
        base.infrastructure_media,
    };
  }
  return base;
}

export default function ApplicationChecklistPage() {
  const params = useParams();
  const appId = (params?.appId as string) || "AICTE-2026-EOA-8841";

  const [dossier, setDossier] = useState<DossierPayload | null>(() => getInitialDossier(appId));
  const [applications, setApplications] = useState<ApplicationSummary[]>(
    snapshotData.applications as ApplicationSummary[]
  );
  const [loading, setLoading] = useState(false);
  const [pingingDocId, setPingingDocId] = useState<string | null>(null);
  const [rationale, setRationale] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [dossRes, appsRes] = await Promise.all([
        fetch(`/api/applications/${encodeURIComponent(appId)}?light=1`),
        fetch("/api/applications"),
      ]);
      if (dossRes.ok) {
        setDossier(await dossRes.json());
      }
      if (appsRes.ok) {
        setApplications(await appsRes.json());
      }
    } catch {
      // Keep initial snapshot state
    }
  }, [appId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handlePingAuthority = async (docId: string) => {
    setPingingDocId(docId);
    try {
      const res = await fetch(`/api/authority/verify/${encodeURIComponent(docId)}`, {
        method: "POST",
      });
      if (res.ok) {
        await loadData();
        setStatusMessage(`Verified source registry status for ${docId} and logged to Audit Trail.`);
      }
    } finally {
      setPingingDocId(null);
    }
  };

  const handleOfficerDecision = async (newStatus: string, customRationale?: string) => {
    if (!dossier) return;
    const note =
      customRationale ||
      rationale.trim() ||
      `Scrutiny Officer recorded disposition "${newStatus}" on application ${dossier.application.app_id}.`;
    setSubmitting(true);
    try {
      const res = await fetch("/api/scrutiny/decision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          app_id: dossier.application.app_id,
          target_id: dossier.application.app_id,
          target_type: "application",
          new_status: newStatus,
          officer_name: "Shri V. K. Subramanian (AICTE Scrutiny Officer)",
          actor_role: "AICTE SCRUTINY OFFICER",
          rationale: note,
          rule_id: "APH-COMMITTEE-DISPOSITION",
        }),
      });
      if (res.ok) {
        setRationale("");
        setStatusMessage(`Application status updated to "${newStatus}" and recorded in SHA-256 Audit Log.`);
        await loadData();
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell activeAppId={appId}>
      {loading || !dossier ? (
        <div className="space-y-4">
          <div className="h-32 animate-pulse rounded-xl bg-white" />
          <div className="h-64 animate-pulse rounded-xl bg-white" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top Institution Profile Header */}
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#E2E8F0] pb-5">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-[#F1F5F9] px-2.5 py-1 font-mono text-xs font-semibold text-[#1E293B]">
                    {dossier.application.app_id}
                  </span>
                  <span className="rounded-md border border-[#CBD5E1] bg-white px-2.5 py-1 text-xs font-medium text-[#334155]">
                    Permanent ID: {dossier.institution.inst_id}
                  </span>
                  <span className="text-xs text-[#64748B]">
                    · {dossier.application.category} · Academic Year {dossier.application.academic_year}
                  </span>
                </div>
                <h1 className="mt-2 text-xl font-bold text-[#0F172A] sm:text-2xl">
                  {dossier.institution.name}
                </h1>
                <p className="mt-1 text-xs text-[#475569]">
                  {dossier.institution.address} · Nodal Officer: <strong>{dossier.institution.nodal_officer}</strong>
                </p>
              </div>

              {/* Switch Dossier or Jump to Deep Inspection Pages */}
              <div className="flex flex-wrap items-center gap-2.5">
                <select
                  aria-label="Switch Application Dossier"
                  value={appId}
                  onChange={(e) => {
                    window.location.href = `/applications/${e.target.value}`;
                  }}
                  className="rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] px-3 py-2 text-xs font-semibold text-[#0F172A]"
                >
                  {applications.map((a) => (
                    <option key={a.app_id} value={a.app_id}>
                      {a.app_id} · {a.inst_name}
                    </option>
                  ))}
                </select>
                <Link
                  href={`/forensics?app=${appId}`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#CBD5E1] bg-white px-3.5 py-2 text-xs font-semibold text-[#1E293B] hover:bg-[#F8FAFC]"
                >
                  <FileSearch className="h-4 w-4 text-[#1D4ED8]" />
                  Inspect PDFs in Forensics Studio
                </Link>
                <Link
                  href={`/infrastructure?app=${appId}`}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#1E3A8A] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#1E40AF]"
                >
                  <Building2 className="h-4 w-4" />
                  Inspect Campus Photos & Clone Check
                </Link>
              </div>
            </div>

            {/* 4 Key Institutional Figures */}
            <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3.5">
                <div className="text-xs text-[#64748B]">Applied vs. Previous Intake</div>
                <div className="mt-1 font-mono text-base font-bold text-[#B91C1C] tabular-nums">
                  {dossier.application.applied_intake} Seats{" "}
                  <span className="text-xs font-normal text-[#475569]">
                    (was {dossier.institution.historical_eoa_intake})
                  </span>
                </div>
              </div>
              <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3.5">
                <div className="text-xs text-[#64748B]">Faculty Strength & FSR</div>
                <div className="mt-1 font-mono text-base font-bold text-[#0F172A] tabular-nums">
                  {dossier.institution.faculty_count} Faculty{" "}
                  <span className="text-xs font-normal text-[#0F766E]">(1:19.2 Norm OK)</span>
                </div>
              </div>
              <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3.5">
                <div className="text-xs text-[#64748B]">Declared Land & Built-up</div>
                <div className="mt-1 font-mono text-base font-bold text-[#0F172A] tabular-nums">
                  {dossier.application.declared_land_acres} Acres ·{" "}
                  {dossier.application.declared_builtup_sqm.toLocaleString()} m²
                </div>
              </div>
              <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3.5">
                <div className="text-xs text-[#64748B]">TER Processing Fee Status</div>
                <div className="mt-1 font-mono text-base font-bold text-[#0F766E] tabular-nums">
                  {dossier.institution.ter_payment_status} ({dossier.institution.ter_receipt_no})
                </div>
              </div>
            </div>

            {/* Plain-English AI Executive Summary */}
            <div className="mt-4 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-4 text-xs leading-relaxed text-[#334155]">
              <strong className="font-semibold text-[#0F172A]">Pre-Scrutiny Executive Summary: </strong>
              {dossier.application.ai_summary}
            </div>

            {statusMessage && (
              <div className="mt-3 rounded-lg border border-[#99F6E4] bg-[#F0FDFA] px-4 py-2.5 text-xs font-semibold text-[#0F766E]">
                ✓ {statusMessage}
              </div>
            )}
          </div>

          {/* Section 1: Cross-Document Consistency Engine Table */}
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E2E8F0] pb-4">
              <div>
                <h2 className="text-lg font-bold text-[#0F172A]">
                  1. Cross-Document Consistency Verification
                </h2>
                <p className="mt-0.5 text-xs text-[#475569]">
                  Compares values declared in the Application Form against OCR text printed on uploaded PDFs, embedded QR codes / Issuing Authority APIs, and AICTE historical records.
                </p>
              </div>
              <span className="rounded-md border border-[#CBD5E1] bg-[#F8FAFC] px-2.5 py-1 font-mono text-xs font-medium text-[#334155]">
                4-Source Reconciliation
              </span>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[#475569]">
                    <th className="p-3 font-semibold">Application Field</th>
                    <th className="p-3 font-semibold">Application Form</th>
                    <th className="p-3 font-semibold">Uploaded PDF Text (OCR)</th>
                    <th className="p-3 font-semibold">QR Payload / Authority API</th>
                    <th className="p-3 font-semibold">AICTE DB / APH Norm</th>
                    <th className="p-3 font-semibold">Consistency Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {dossier.application.consistency_flags.map((row, i) => (
                    <tr key={i} className="hover:bg-[#F8FAFC]">
                      <td className="p-3 font-semibold text-[#0F172A]">{row.field}</td>
                      <td className="p-3 font-mono text-[#334155]">{row.app_form_value}</td>
                      <td
                        className={`p-3 font-mono font-semibold ${
                          row.status !== "VERIFIED" ? "text-[#B91C1C]" : "text-[#0F172A]"
                        }`}
                      >
                        {row.doc_ocr_value}
                      </td>
                      <td className="p-3 font-mono font-semibold text-[#1D4ED8]">
                        {row.qr_or_api_value}
                      </td>
                      <td className="p-3 font-mono text-[#475569]">{row.historical_aicte_db}</td>
                      <td className="p-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-mono text-[11px] font-semibold ${
                            row.status === "VERIFIED"
                              ? "border-[#99F6E4] bg-[#F0FDFA] text-[#0F766E]"
                              : "border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C]"
                          }`}
                        >
                          {row.status === "VERIFIED" ? "●" : "▲"} {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 2: AICTE APH 2024-27 Checklist & Evidence Links */}
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E2E8F0] pb-4">
              <div>
                <h2 className="text-lg font-bold text-[#0F172A]">
                  2. Approval Process Handbook (APH 2024–2027) Scrutiny Checklist
                </h2>
                <p className="mt-0.5 text-xs text-[#475569]">
                  Every automated flag links directly to the specific document or campus photograph where the evidence was detected.
                </p>
              </div>
            </div>

            <div className="mt-4 divide-y divide-[#E2E8F0]">
              {dossier.application.checklist.map((item) => {
                const targetUrl =
                  item.target_type === "document"
                    ? `/forensics?app=${appId}&doc=${item.target_id}`
                    : `/infrastructure?app=${appId}&media=${item.target_id}`;

                return (
                  <div
                    key={item.id}
                    className="flex flex-wrap items-start justify-between gap-4 py-4 first:pt-1 last:pb-1"
                  >
                    <div className="max-w-3xl space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {item.status === "CRITICAL" && (
                          <span className="inline-flex items-center gap-1 rounded-md border border-[#FECACA] bg-[#FEF2F2] px-2 py-0.5 text-xs font-semibold text-[#B91C1C]">
                            <ShieldAlert className="h-3.5 w-3.5" />
                            Discrepancy Flagged
                          </span>
                        )}
                        {item.status === "WARNING" && (
                          <span className="inline-flex items-center gap-1 rounded-md border border-[#FDE68A] bg-[#FFFBEB] px-2 py-0.5 text-xs font-semibold text-[#B45309]">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            Norm Shortfall
                          </span>
                        )}
                        {item.status === "VERIFIED" && (
                          <span className="inline-flex items-center gap-1 rounded-md border border-[#99F6E4] bg-[#F0FDFA] px-2 py-0.5 text-xs font-semibold text-[#0F766E]">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Verified Compliant
                          </span>
                        )}
                        <span className="text-xs font-semibold text-[#475569]">
                          {item.category}
                        </span>
                        <span className="font-mono text-xs text-[#64748B]">
                          · AI Confidence: {(item.confidence * 100).toFixed(0)}%
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-[#0F172A]">{item.rule}</h3>
                      <p className="text-xs leading-relaxed text-[#475569]">{item.detail}</p>
                    </div>

                    <Link
                      href={targetUrl}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] px-3.5 py-2 text-xs font-semibold text-[#1E3A8A] transition-colors hover:border-[#93C5FD] hover:bg-[#EFF6FF]"
                    >
                      Inspect Evidence ({item.target_id})
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 3: Issuing Authority Source Verification */}
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
            <div className="border-b border-[#E2E8F0] pb-4">
              <h2 className="text-lg font-bold text-[#0F172A]">
                3. Issuing Authority Source Verification (API & Registry Sync)
              </h2>
              <p className="mt-0.5 text-xs text-[#475569]">
                Direct verification of uploaded certificates against authorized issuing portals (DigiLocker, State NOC Portal, Municipal Fire Dept, and Council of Architecture).
              </p>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              {dossier.documents.map((doc) => (
                <div
                  key={doc.doc_id}
                  className="flex flex-col justify-between rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-bold text-[#0F172A]">{doc.doc_type}</h3>
                        <p className="text-xs text-[#475569]">{doc.authority_response.portal}</p>
                      </div>
                      <span
                        className={`rounded-full border px-2.5 py-0.5 font-mono text-xs font-semibold ${
                          doc.authority_status === "Verified"
                            ? "border-[#99F6E4] bg-[#F0FDFA] text-[#0F766E]"
                            : "border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C]"
                        }`}
                      >
                        {doc.authority_status}
                      </span>
                    </div>

                    <div className="mt-3 rounded-lg border border-[#E2E8F0] bg-white p-3 font-mono text-xs text-[#334155]">
                      <div>Certificate No: <strong>{doc.cert_number}</strong></div>
                      <div>Issued: {doc.issue_date} · Valid Upto: {doc.expiry_date}</div>
                      {doc.authority_response.discrepancy ? (
                        <div className="mt-1.5 font-sans text-xs font-medium text-[#B91C1C]">
                          ▲ {doc.authority_response.discrepancy}
                        </div>
                      ) : (
                        <div className="mt-1.5 font-sans text-xs font-medium text-[#0F766E]">
                          ● Source registry attributes match uploaded certificate 100%.
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-2 pt-2">
                    <Link
                      href={`/forensics?app=${appId}&doc=${doc.doc_id}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#1D4ED8] hover:underline"
                    >
                      Open X-Ray Document View
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                    <button
                      type="button"
                      disabled={pingingDocId === doc.doc_id}
                      onClick={() => handlePingAuthority(doc.doc_id)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#CBD5E1] bg-white px-3 py-1.5 text-xs font-semibold text-[#1E293B] hover:bg-[#F1F5F9] disabled:opacity-50"
                    >
                      <RefreshCw
                        className={`h-3.5 w-3.5 ${
                          pingingDocId === doc.doc_id ? "animate-spin text-[#1D4ED8]" : ""
                        }`}
                      />
                      Re-Verify with Portal
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: Officer Final Scrutiny Decision & Sign-Off (Powered by Laya System-1 Decision Engine) */}
          <div className="rounded-xl border border-[#CBD5E1] bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 border-b border-[#E2E8F0] pb-3">
              <Gavel className="h-5 w-5 text-[#1E3A8A]" />
              <h2 className="text-lg font-bold text-[#0F172A]">
                4. Laya System-1 Decision Copilot &amp; Scrutiny Officer Sign-Off
              </h2>
            </div>
            <p className="mt-2 mb-4 text-xs text-[#475569]">
              Inspect Laya&apos;s calibrated System-1 decision primitives (<code>choice</code>, <code>score</code>, and <code>noul</code>) below, test counterfactual &ldquo;What-If&rdquo; overrides, or record your official committee decision into the SHA-256 Audit Trail.
            </p>

            <LayaDecisionPanel
              dossier={dossier}
              submitting={submitting}
              onApplyRecommendation={(status, autoRationale) =>
                handleOfficerDecision(status, autoRationale)
              }
            />

            <div className="mt-4 space-y-3">
              <textarea
                rows={2}
                value={rationale}
                onChange={(e) => setRationale(e.target.value)}
                placeholder="Enter official scrutiny remarks, APH clause reference, or EVC inspection instructions..."
                className="w-full rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] p-3 text-xs text-[#0F172A] placeholder:text-[#64748B] focus:border-[#1D4ED8] focus:bg-white"
              />

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleOfficerDecision("Approved by Scrutiny Committee")}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#0F766E] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#115E59] disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Approve / Clear Advisory Flags
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleOfficerDecision("Routed to EVC Physical Inspection")}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#F59E0B] bg-[#FFFBEB] px-4 py-2 text-xs font-semibold text-[#B45309] transition-colors hover:bg-[#FEF3C7] disabled:opacity-50"
                  >
                    <AlertTriangle className="h-4 w-4" />
                    Order EVC Physical Inspection
                  </button>
                </div>

                {/* Deliberately isolated adverse action */}
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleOfficerDecision("Deficiency Show-Cause Notice Issued")}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#B91C1C] bg-white px-4 py-2 text-xs font-semibold text-[#B91C1C] transition-colors hover:bg-[#B91C1C] hover:text-white disabled:opacity-50"
                >
                  <ShieldAlert className="h-4 w-4" />
                  Issue Deficiency / Show-Cause Notice
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
