"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  ApplicationSummary,
  DossierPayload,
} from "@/types/veritas";
import { OpticalComparator } from "@/components/OpticalComparator";
import { InfrastructureInspector } from "@/components/InfrastructureInspector";
import { LiveUploadSandbox } from "@/components/LiveUploadSandbox";
import {
  Scale,
  FileText,
  Camera,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  History,
  UploadCloud,
  Table2,
  ListChecks,
  UserCheck,
  Building2,
  Lock,
  ArrowUpRight,
  Gavel,
} from "lucide-react";

type LeftTab = "checklist" | "consistency" | "exhibits" | "audit" | "sandbox";
type UserRole = "SCRUTINY_OFFICER" | "NODAL_OFFICER";

export default function VeritasWorkbenchPage() {
  const [applications, setApplications] = useState<ApplicationSummary[]>([]);
  const [selectedAppId, setSelectedAppId] = useState<string>("AICTE-2026-EOA-8841");
  const [dossier, setDossier] = useState<DossierPayload | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [role, setRole] = useState<UserRole>("SCRUTINY_OFFICER");
  const [leftTab, setLeftTab] = useState<LeftTab>("checklist");

  // Active specimen on the right Optical Stage: either a document or an infrastructure photo
  const [activeTargetType, setActiveTargetType] = useState<"document" | "media">("document");
  const [activeTargetId, setActiveTargetId] = useState<string>("DOC-8841-NOC");
  const [activeFindingId, setActiveFindingId] = useState<string | null>(null);
  const opticalStageRef = React.useRef<HTMLElement | null>(null);

  // Officer decision state
  const [officerRationale, setOfficerRationale] = useState<string>("");
  const [submittingDecision, setSubmittingDecision] = useState<boolean>(false);
  const [pingingAuthority, setPingingAuthority] = useState<boolean>(false);
  const [decisionBanner, setDecisionBanner] = useState<string | null>(null);

  const fetchApplicationsList = useCallback(async () => {
    const res = await fetch("/api/applications");
    if (res.ok) {
      const list: ApplicationSummary[] = await res.json();
      setApplications(list);
    }
  }, []);

  const fetchDossier = useCallback(async (appId: string) => {
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
  }, []);

  useEffect(() => {
    fetchApplicationsList();
  }, [fetchApplicationsList]);

  useEffect(() => {
    fetchDossier(selectedAppId);
  }, [selectedAppId, fetchDossier]);

  const handleSelectChecklistItem = (
    targetType: "document" | "media",
    targetId: string
  ) => {
    setActiveTargetType(targetType);
    setActiveTargetId(targetId);
    setActiveFindingId(null);
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      opticalStageRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handlePingAuthority = async (docId: string) => {
    setPingingAuthority(true);
    try {
      const res = await fetch(`/api/authority/verify/${encodeURIComponent(docId)}`, {
        method: "POST",
      });
      if (res.ok) {
        await fetchDossier(selectedAppId);
        setDecisionBanner(`Authority API response for ${docId} logged to SHA-256 Audit Trail.`);
      }
    } finally {
      setPingingAuthority(false);
    }
  };

  const handleRecordDecision = async (newStatus: string) => {
    if (!dossier) return;
    const rationaleText =
      officerRationale.trim() ||
      `Statutory review decision (${newStatus}) recorded on ${activeTargetId} after inspecting Veritas X-Ray evidence.`;
    setSubmittingDecision(true);
    try {
      const res = await fetch("/api/scrutiny/decision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          app_id: dossier.application.app_id,
          target_id: activeTargetId,
          target_type: activeTargetType,
          new_status: newStatus,
          officer_name:
            role === "SCRUTINY_OFFICER"
              ? "Shri V. K. Subramanian (AICTE Scrutiny Officer)"
              : `${dossier.institution.nodal_officer} (Self-Rectification Note)`,
          actor_role:
            role === "SCRUTINY_OFFICER"
              ? "AICTE SCRUTINY OFFICER"
              : "INSTITUTION NODAL OFFICER",
          rationale: rationaleText,
          rule_id: "STATUTORY-MANUAL-DISPOSITION",
        }),
      });
      if (res.ok) {
        setOfficerRationale("");
        setDecisionBanner(
          `Recorded "${newStatus}" on ${activeTargetId} · Appended to SHA-256 Audit Trail.`
        );
        await fetchDossier(selectedAppId);
        await fetchApplicationsList();
      }
    } finally {
      setSubmittingDecision(false);
    }
  };

  const activeDoc =
    dossier?.documents.find((d) => d.doc_id === activeTargetId) ||
    dossier?.documents[0] ||
    null;

  const activeMedia =
    dossier?.infrastructure_media.find((m) => m.media_id === activeTargetId) ||
    dossier?.infrastructure_media[0] ||
    null;

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-paper text-ink lg:h-screen lg:overflow-hidden">
      {/* Top Statutory Command Header */}
      <header className="border-b border-paper-border bg-paper-elevated px-4 py-2.5">
        <div className="mx-auto flex max-w-[1920px] flex-wrap items-center justify-between gap-3">
          {/* Brand & Problem Statement Identity */}
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center border border-ink bg-ink text-white">
              <Scale className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold tracking-tight text-ink">
                  VERITAS
                </h1>
                <span className="border border-paper-border bg-paper px-2 py-0.5 font-mono text-[11px] font-semibold text-ink-secondary">
                  AICTE · SIH26261
                </span>
                <span className="hidden border border-cobalt/30 bg-cobalt-surface px-2 py-0.5 font-mono text-[11px] font-medium text-cobalt sm:inline-block">
                  APH 2024–2027 RULESET ACTIVE
                </span>
              </div>
              <p className="text-xs text-ink-secondary">
                AI Application Validation, 3-Layer X-Ray Document Forensics & Infrastructure CV Copilot
              </p>
            </div>
          </div>

          {/* Dossier Selector & Role Switcher */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex w-full items-center gap-2 sm:w-auto">
              <label
                htmlFor="dossier-select"
                className="shrink-0 font-mono text-xs font-semibold text-ink-secondary"
              >
                DOSSIER:
              </label>
              <select
                id="dossier-select"
                value={selectedAppId}
                onChange={(e) => setSelectedAppId(e.target.value)}
                className="w-full max-w-[260px] truncate border border-paper-border bg-paper px-2.5 py-1.5 font-mono text-xs font-semibold text-ink focus:border-cobalt sm:max-w-[440px]"
              >
                {applications.map((app) => (
                  <option key={app.app_id} value={app.app_id}>
                    {app.app_id} · {app.inst_name} (Risk: {app.risk_score}/100)
                  </option>
                ))}
              </select>
            </div>

            {/* Role Toggle */}
            <div
              className="inline-flex border border-paper-border bg-paper p-0.5"
              role="group"
              aria-label="Active User Role"
            >
              <button
                type="button"
                onClick={() => setRole("SCRUTINY_OFFICER")}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold transition-colors ${
                  role === "SCRUTINY_OFFICER"
                    ? "bg-ink text-white"
                    : "text-ink-secondary hover:text-ink"
                }`}
              >
                <UserCheck className="h-3.5 w-3.5" />
                AICTE Scrutiny Officer
              </button>
              <button
                type="button"
                onClick={() => {
                  setRole("NODAL_OFFICER");
                  setLeftTab("sandbox");
                }}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold transition-colors ${
                  role === "NODAL_OFFICER"
                    ? "bg-cobalt text-white"
                    : "text-ink-secondary hover:text-ink"
                }`}
              >
                <Building2 className="h-3.5 w-3.5" />
                Institution Nodal Officer
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Statutory Advisory Safeguard Banner */}
      <div className="border-b border-paper-border bg-paper-sunken px-4 py-1.5">
        <div className="mx-auto flex max-w-[1920px] flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-ink-secondary">
            <span className="font-mono font-bold text-ink">
              {role === "SCRUTINY_OFFICER"
                ? "● MODE: STATUTORY SCRUTINY WORKBENCH"
                : "● MODE: INSTITUTION PRE-SUBMISSION SELF-SCRUTINY"}
            </span>
            <span>·</span>
            <span>
              All Veritas AI findings are evidence-linked advisory flags. Final EVC inspection and regulatory decisions remain with competent AICTE authorities.
            </span>
          </div>
          {decisionBanner && (
            <div className="border border-veridian-border bg-veridian-surface px-2.5 py-0.5 font-mono text-xs font-semibold text-veridian">
              ✓ {decisionBanner}
            </div>
          )}
        </div>
      </div>

      {/* Main Split-Screen Workbench */}
      {loading || !dossier ? (
        <div className="grid flex-1 grid-cols-1 lg:grid-cols-12">
          <div className="space-y-3 border-r border-paper-border p-6 lg:col-span-5">
            <div className="h-20 animate-pulse bg-paper-sunken" />
            <div className="h-12 animate-pulse bg-paper-sunken" />
            <div className="h-64 animate-pulse bg-paper-sunken" />
          </div>
          <div className="bg-chamber p-6 lg:col-span-7">
            <div className="h-full animate-pulse bg-chamber-panel" />
          </div>
        </div>
      ) : (
        <main className="mx-auto grid w-full max-w-[1920px] flex-1 grid-cols-1 lg:min-h-0 lg:grid-cols-12">
          {/* LEFT PANE: Statutory Dossier, APH Checklist, Consistency Matrix & Audit Log */}
          <section
            aria-label="Application Dossier and Compliance Checklist"
            className="flex flex-col border-b border-paper-border bg-paper lg:col-span-5 lg:min-h-0 lg:border-b-0 lg:border-r"
          >
            {/* Institution Summary Ledger */}
            <div className="border-b border-paper-border bg-paper-elevated p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="text-base font-bold text-ink">
                    {dossier.institution.name}
                  </h2>
                  <p className="mt-0.5 font-mono text-xs text-ink-secondary">
                    Permanent ID: {dossier.institution.inst_id} · {dossier.application.category} ·{" "}
                    {dossier.institution.city}, {dossier.institution.state}
                  </p>
                </div>
                <span
                  className={`border px-2.5 py-1 font-mono text-xs font-bold tabular-nums ${
                    dossier.application.risk_score >= 70
                      ? "border-vermilion-border bg-vermilion-surface text-vermilion"
                      : dossier.application.risk_score >= 40
                      ? "border-amber-border bg-amber-surface text-amber"
                      : "border-veridian-border bg-veridian-surface text-veridian"
                  }`}
                >
                  RISK INDEX: {dossier.application.risk_score}/100
                </span>
              </div>

              {/* 4-Column Tabular Telemetry Strip */}
              <div className="mt-3 grid grid-cols-2 gap-px border border-paper-border bg-paper-border font-mono text-xs sm:grid-cols-4">
                <div className="bg-paper p-2">
                  <div className="text-[10px] text-ink-muted">APPLIED vs EOA INTAKE</div>
                  <div className="mt-0.5 font-bold tabular-nums text-vermilion">
                    {dossier.application.applied_intake} vs {dossier.institution.historical_eoa_intake} Seats
                  </div>
                </div>
                <div className="bg-paper p-2">
                  <div className="text-[10px] text-ink-muted">FACULTY & FSR</div>
                  <div className="mt-0.5 font-bold tabular-nums text-ink">
                    {dossier.institution.faculty_count} Faculty (1:19.2)
                  </div>
                </div>
                <div className="bg-paper p-2">
                  <div className="text-[10px] text-ink-muted">CAMPUS BOUNDARY GPS</div>
                  <div className="mt-0.5 font-bold tabular-nums text-ink">
                    {dossier.institution.campus_lat.toFixed(3)}°N, {dossier.institution.campus_lng.toFixed(3)}°E
                  </div>
                </div>
                <div className="bg-paper p-2">
                  <div className="text-[10px] text-ink-muted">TER FEE RECEIPT</div>
                  <div className="mt-0.5 font-bold tabular-nums text-veridian">
                    ● {dossier.institution.ter_payment_status} ({dossier.institution.ter_receipt_no})
                  </div>
                </div>
              </div>

              {/* AI Executive Advisory Summary */}
              <div className="mt-3 border border-paper-border bg-paper p-2.5 text-xs leading-relaxed text-ink-secondary">
                <strong className="font-semibold text-ink">Veritas Executive Synthesis: </strong>
                {dossier.application.ai_summary}
              </div>
            </div>

            {/* Left Workspace Navigation Tabs */}
            <div
              className="flex flex-wrap border-b border-paper-border bg-paper-sunken px-2 pt-1"
              role="tablist"
              aria-label="Scrutiny Dossier Views"
            >
              {[
                {
                  id: "checklist",
                  label: `APH Checklist (${dossier.application.checklist.length})`,
                  icon: ListChecks,
                },
                {
                  id: "consistency",
                  label: "Cross-Doc Matrix",
                  icon: Table2,
                },
                {
                  id: "exhibits",
                  label: `Exhibits (${dossier.documents.length + dossier.infrastructure_media.length})`,
                  icon: FileText,
                },
                {
                  id: "audit",
                  label: `Audit Trail (${dossier.audit_logs.length})`,
                  icon: History,
                },
                {
                  id: "sandbox",
                  label: "Live Upload Lab",
                  icon: UploadCloud,
                },
              ].map((t) => {
                const Icon = t.icon;
                const active = leftTab === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setLeftTab(t.id as LeftTab)}
                    className={`inline-flex items-center gap-1.5 border-x border-t px-3 py-2 text-xs font-semibold transition-colors ${
                      active
                        ? "border-paper-border bg-paper text-ink"
                        : "border-transparent text-ink-secondary hover:text-ink"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {t.label}
                  </button>
                );
              })}
            </div>

            {/* Left Tab Content Area */}
            <div className="flex-1 overflow-y-auto">
              {/* TAB 1: APH 2024-27 Co-Referenced Checklist */}
              {leftTab === "checklist" && (
                <div className="divide-y divide-paper-border">
                  {dossier.application.checklist.map((item) => {
                    const isFocused =
                      activeTargetType === item.target_type &&
                      activeTargetId === item.target_id;
                    return (
                      <div
                        key={item.id}
                        onClick={() =>
                          handleSelectChecklistItem(item.target_type, item.target_id)
                        }
                        className={`cursor-pointer p-3.5 transition-colors duration-150 ${
                          isFocused
                            ? "bg-cobalt-surface/60"
                            : "bg-paper hover:bg-paper-elevated"
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            {item.status === "CRITICAL" && (
                              <span className="border border-vermilion-border bg-vermilion-surface px-1.5 py-0.5 font-mono text-[10px] font-bold text-vermilion">
                                ▲ CRITICAL FLAG
                              </span>
                            )}
                            {item.status === "WARNING" && (
                              <span className="border border-amber-border bg-amber-surface px-1.5 py-0.5 font-mono text-[10px] font-bold text-amber">
                                ◆ DEFICIENCY
                              </span>
                            )}
                            {item.status === "VERIFIED" && (
                              <span className="border border-veridian-border bg-veridian-surface px-1.5 py-0.5 font-mono text-[10px] font-bold text-veridian">
                                ● VERIFIED
                              </span>
                            )}
                            <span className="font-mono text-xs font-semibold text-ink-secondary">
                              {item.category}
                            </span>
                          </div>

                          <span className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-cobalt">
                            Inspect {item.target_id}
                            <ArrowUpRight className="h-3.5 w-3.5" />
                          </span>
                        </div>

                        <h3 className="mt-2 text-sm font-semibold text-ink">
                          {item.rule}
                        </h3>
                        <p className="mt-1 text-xs leading-relaxed text-ink-secondary">
                          {item.detail}
                        </p>
                        <div className="mt-2 flex items-center justify-between font-mono text-[11px] text-ink-muted">
                          <span>Linked Exhibit: {item.target_id}</span>
                          <span className="tabular-nums">
                            AI Confidence: {(item.confidence * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* TAB 2: Cross-Document Consistency Matrix */}
              {leftTab === "consistency" && (
                <div className="p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-ink">
                      Cross-Document & Historical AICTE Record Matrix
                    </h3>
                    <span className="font-mono text-xs text-ink-secondary">
                      4-Way Field Reconciliation
                    </span>
                  </div>
                  <div className="overflow-x-auto border border-paper-border bg-paper-elevated">
                    <table className="w-full border-collapse text-left text-xs">
                      <thead>
                        <tr className="border-b border-paper-border bg-paper-sunken font-mono text-[11px] text-ink-secondary">
                          <th className="p-2.5">Parameter</th>
                          <th className="p-2.5">App Form</th>
                          <th className="p-2.5">Printed OCR</th>
                          <th className="p-2.5">QR / Source API</th>
                          <th className="p-2.5">AICTE DB / Norm</th>
                          <th className="p-2.5">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-paper-border font-mono text-[11px]">
                        {dossier.application.consistency_flags.map((row, idx) => (
                          <tr key={idx} className="hover:bg-paper">
                            <td className="p-2.5 font-sans font-semibold text-ink">
                              {row.field}
                            </td>
                            <td className="p-2.5 text-ink-secondary">{row.app_form_value}</td>
                            <td
                              className={`p-2.5 font-semibold ${
                                row.status !== "VERIFIED" ? "text-vermilion" : "text-ink"
                              }`}
                            >
                              {row.doc_ocr_value}
                            </td>
                            <td className="p-2.5 font-semibold text-cobalt">
                              {row.qr_or_api_value}
                            </td>
                            <td className="p-2.5 text-ink-secondary">
                              {row.historical_aicte_db}
                            </td>
                            <td className="p-2.5">
                              <span
                                className={`inline-block border px-1.5 py-0.5 text-[10px] font-bold ${
                                  row.status === "VERIFIED"
                                    ? "border-veridian-border bg-veridian-surface text-veridian"
                                    : "border-vermilion-border bg-vermilion-surface text-vermilion"
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
              )}

              {/* TAB 3: Dossier Exhibits Grid (Documents + Geotagged Infrastructure Photos) */}
              {leftTab === "exhibits" && (
                <div className="space-y-4 p-4">
                  <div>
                    <h3 className="mb-2 text-sm font-semibold text-ink">
                      Submitted Statutory PDF Certificates ({dossier.documents.length})
                    </h3>
                    <div className="divide-y divide-paper-border border border-paper-border bg-paper-elevated">
                      {dossier.documents.map((doc) => {
                        const selected =
                          activeTargetType === "document" && activeTargetId === doc.doc_id;
                        return (
                          <button
                            key={doc.doc_id}
                            type="button"
                            onClick={() => {
                              setActiveTargetType("document");
                              setActiveTargetId(doc.doc_id);
                            }}
                            className={`flex w-full items-center justify-between gap-3 p-3 text-left transition-colors ${
                              selected ? "bg-cobalt-surface" : "hover:bg-paper"
                            }`}
                          >
                            <div className="flex items-start gap-2.5">
                              <FileText className="mt-0.5 h-4 w-4 shrink-0 text-cobalt" />
                              <div>
                                <div className="text-xs font-semibold text-ink">
                                  {doc.title}
                                </div>
                                <div className="mt-0.5 font-mono text-[11px] text-ink-secondary">
                                  {doc.doc_id} · {doc.issuing_authority} · %%EOF:{" "}
                                  {doc.pdf_metadata.eof_markers}
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1 font-mono text-[11px]">
                              <span
                                className={`border px-1.5 py-0.5 font-bold ${
                                  doc.authority_status === "Verified"
                                    ? "border-veridian-border bg-veridian-surface text-veridian"
                                    : "border-vermilion-border bg-vermilion-surface text-vermilion"
                                }`}
                              >
                                {doc.authority_status}
                              </span>
                              <span className="tabular-nums text-ink-muted">
                                Integrity: {doc.forensic_score}/100
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <h3 className="mb-2 text-sm font-semibold text-ink">
                      Geotagged Campus & Lab Photographs ({dossier.infrastructure_media.length})
                    </h3>
                    <div className="divide-y divide-paper-border border border-paper-border bg-paper-elevated">
                      {dossier.infrastructure_media.map((m) => {
                        const selected =
                          activeTargetType === "media" && activeTargetId === m.media_id;
                        const hasClone = m.clone_matches && m.clone_matches.length > 0;
                        return (
                          <button
                            key={m.media_id}
                            type="button"
                            onClick={() => {
                              setActiveTargetType("media");
                              setActiveTargetId(m.media_id);
                            }}
                            className={`flex w-full items-center justify-between gap-3 p-3 text-left transition-colors ${
                              selected ? "bg-cobalt-surface" : "hover:bg-paper"
                            }`}
                          >
                            <div className="flex items-start gap-2.5">
                              <Camera className="mt-0.5 h-4 w-4 shrink-0 text-cobalt" />
                              <div>
                                <div className="text-xs font-semibold text-ink">
                                  {m.title}
                                </div>
                                <div className="mt-0.5 font-mono text-[11px] text-ink-secondary">
                                  pHash: {m.hashes.phash} · GPS:{" "}
                                  {m.exif.distance_m !== null
                                    ? m.exif.distance_m >= 1000
                                      ? `${(m.exif.distance_m / 1000).toFixed(1)} km away`
                                      : `${m.exif.distance_m.toFixed(1)}m from center`
                                    : "No GPS"}
                                </div>
                              </div>
                            </div>
                            <span
                              className={`border px-1.5 py-0.5 font-mono text-[10px] font-bold ${
                                hasClone
                                  ? "border-vermilion-border bg-vermilion-surface text-vermilion"
                                  : m.aph_compliance.status === "COMPLIANT"
                                  ? "border-veridian-border bg-veridian-surface text-veridian"
                                  : "border-amber-border bg-amber-surface text-amber"
                              }`}
                            >
                              {hasClone
                                ? "▲ CLONE + GPS VIOLATION"
                                : m.aph_compliance.status}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: Immutable SHA-256 Hash-Chained Audit Trail */}
              {leftTab === "audit" && (
                <div className="divide-y divide-paper-border">
                  <div className="flex items-center justify-between bg-paper-elevated px-4 py-2.5 font-mono text-xs">
                    <span className="inline-flex items-center gap-1.5 font-semibold text-ink">
                      <Lock className="h-3.5 w-3.5 text-veridian" />
                      SHA-256 HASH-CHAINED REGULATORY LEDGER
                    </span>
                    <span className="text-veridian">● CHAIN INTEGRITY VERIFIED</span>
                  </div>
                  {dossier.audit_logs.map((log) => (
                    <div key={log.id} className="bg-paper p-3.5 text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[11px]">
                        <span className="font-bold text-ink">{log.actor_role}</span>
                        <span className="tabular-nums text-ink-muted">{log.timestamp}</span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                        <span className="font-semibold text-cobalt">
                          {log.action_type} → {log.target_id}
                        </span>
                        <span className="border border-paper-border bg-paper-elevated px-1.5 py-0.5 font-mono text-[10px] font-semibold text-ink">
                          {log.status_after}
                        </span>
                      </div>
                      <p className="mt-1.5 text-xs leading-relaxed text-ink-secondary">
                        {log.rationale}
                      </p>
                      <div className="mt-2 truncate border border-paper-border bg-paper-sunken px-2 py-1 font-mono text-[10px] text-ink-muted">
                        SHA256: {log.entry_hash.slice(0, 28)}... · PREV:{" "}
                        {log.prev_hash.slice(0, 18)}...
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* TAB 5: Live Upload & Self-Scrutiny Diagnostic Lab */}
              {leftTab === "sandbox" && (
                <LiveUploadSandbox
                  onAuditCreated={() => fetchDossier(selectedAppId)}
                />
              )}
            </div>

            {/* Bottom Statutory Officer Decision & Override Dock (Deliberate Isolation for Destructive Actions) */}
            <div className="border-t border-paper-border bg-paper-elevated p-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-ink">
                  <Gavel className="h-4 w-4 text-cobalt" />
                  <span>
                    {role === "SCRUTINY_OFFICER"
                      ? `Officer Decision & Advisory Override (${activeTargetId})`
                      : `Nodal Officer Rectification Note (${activeTargetId})`}
                  </span>
                </div>
                <span className="font-mono text-[11px] text-ink-muted">
                  Logged to Immutable SHA-256 Chain
                </span>
              </div>

              <div className="mt-2 flex flex-col gap-2">
                <input
                  type="text"
                  value={officerRationale}
                  onChange={(e) => setOfficerRationale(e.target.value)}
                  placeholder="Enter statutory justification, APH clause override reason, or EVC inspection directive..."
                  className="w-full border border-paper-border bg-paper px-3 py-1.5 text-xs text-ink placeholder:text-ink-muted focus:border-cobalt"
                />

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  {/* Affirmative / Routine Actions */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      disabled={submittingDecision}
                      onClick={() => handleRecordDecision("Verified")}
                      className="inline-flex items-center gap-1 border border-veridian bg-veridian px-2.5 py-1 text-xs font-semibold text-white transition-colors hover:bg-teal-800 disabled:opacity-50"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Accept / Override as Verified
                    </button>
                    <button
                      type="button"
                      disabled={submittingDecision}
                      onClick={() => handleRecordDecision("Manual Review Required")}
                      className="inline-flex items-center gap-1 border border-amber bg-amber-surface px-2.5 py-1 text-xs font-semibold text-amber transition-colors hover:bg-amber-100 disabled:opacity-50"
                    >
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Route to EVC Physical Inspection
                    </button>
                  </div>

                  {/* Deliberately Isolated Adverse / Deficiency Action (Donated by Challenger 4) */}
                  <button
                    type="button"
                    disabled={submittingDecision}
                    onClick={() => handleRecordDecision("Mismatch Detected")}
                    className="inline-flex items-center gap-1 border border-vermilion bg-transparent px-2.5 py-1 text-xs font-semibold text-vermilion transition-colors hover:bg-vermilion hover:text-white focus:bg-vermilion focus:text-white disabled:opacity-50"
                  >
                    <ShieldAlert className="h-3.5 w-3.5" />
                    Confirm Deficiency / Show-Cause Flag
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* RIGHT PANE: Dark Optical Inspection Chamber (PDF X-Ray Comparator or Infrastructure CV) */}
          <section
            ref={opticalStageRef}
            aria-label="Optical Forensics and Computer Vision Comparator"
            className="flex flex-col bg-chamber lg:col-span-7 lg:min-h-0"
          >
            {/* Quick Exhibit Bar at Top of Optical Chamber */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-chamber-border bg-[#0C0F14] px-4 py-1.5">
              <div className="flex flex-wrap items-center gap-1">
                <span className="mr-1 font-mono text-[11px] font-semibold text-slate-400">
                  STAGE SPECIMEN:
                </span>
                {dossier.documents.map((d) => (
                  <button
                    key={d.doc_id}
                    type="button"
                    onClick={() => {
                      setActiveTargetType("document");
                      setActiveTargetId(d.doc_id);
                    }}
                    className={`border px-2 py-0.5 font-mono text-[11px] transition-colors ${
                      activeTargetType === "document" && activeTargetId === d.doc_id
                        ? "border-blue-400 bg-blue-950/90 font-semibold text-white"
                        : "border-chamber-border bg-chamber-panel text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {d.doc_type}
                  </button>
                ))}
                {dossier.infrastructure_media.map((m) => (
                  <button
                    key={m.media_id}
                    type="button"
                    onClick={() => {
                      setActiveTargetType("media");
                      setActiveTargetId(m.media_id);
                    }}
                    className={`inline-flex items-center gap-1 border px-2 py-0.5 font-mono text-[11px] transition-colors ${
                      activeTargetType === "media" && activeTargetId === m.media_id
                        ? "border-amber-400 bg-amber-950/90 font-semibold text-white"
                        : "border-chamber-border bg-chamber-panel text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <Camera className="h-3 w-3" />
                    {m.facility_type}
                  </button>
                ))}
              </div>
            </div>

            {activeTargetType === "document" && activeDoc ? (
              <OpticalComparator
                document={activeDoc}
                activeFindingId={activeFindingId}
                onSelectFinding={setActiveFindingId}
                onPingAuthority={handlePingAuthority}
                pingingAuthority={pingingAuthority}
              />
            ) : activeMedia ? (
              <InfrastructureInspector media={activeMedia} />
            ) : null}
          </section>
        </main>
      )}
    </div>
  );
}
