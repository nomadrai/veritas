"use client";

import React, { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { DossierPayload } from "@/types/veritas";
import { AppShell } from "@/components/AppShell";
import { LiveUploadSandbox } from "@/components/LiveUploadSandbox";
import { Lock, History, CheckCircle2 } from "lucide-react";

function PortalAndAuditContent() {
  const searchParams = useSearchParams();
  const appId = searchParams.get("app") || "AICTE-2026-EOA-8841";
  const [dossier, setDossier] = useState<DossierPayload | null>(null);

  const loadDossier = useCallback(async () => {
    const res = await fetch(`/api/applications/${encodeURIComponent(appId)}`);
    if (res.ok) {
      setDossier(await res.json());
    }
  }, [appId]);

  useEffect(() => {
    loadDossier();
  }, [loadDossier]);

  return (
    <AppShell activeAppId={appId}>
      <div className="space-y-8">
        {/* Top Page Title */}
        <div className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
          <h1 className="text-xl font-bold text-[#0F172A] sm:text-2xl">
            Nodal Officer Pre-Submission Check & Regulatory Audit Trail
          </h1>
          <p className="mt-1 text-sm text-[#475569]">
            Institution Nodal Officers can upload draft certificates and campus photos here to catch and rectify deficiencies before formal AICTE submission. Below, every automated rule check and Scrutiny Officer decision is recorded in an immutable SHA-256 hash-chained ledger.
          </p>
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
