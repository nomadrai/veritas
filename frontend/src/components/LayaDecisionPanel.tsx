"use client";

import React, { useState, useMemo } from "react";
import { DossierPayload } from "@/types/veritas";
import {
  evaluateLayaDecision,
  LayaWhatIfOverrides,
} from "@/lib/layaEngine";
import { Cpu, SlidersHorizontal, CheckCircle2, Sparkles } from "lucide-react";

interface LayaDecisionPanelProps {
  dossier: DossierPayload;
  onApplyRecommendation: (status: string, rationale: string) => void;
  submitting: boolean;
}

export function LayaDecisionPanel({
  dossier,
  onApplyRecommendation,
  submitting,
}: LayaDecisionPanelProps) {
  const [overrides, setOverrides] = useState<LayaWhatIfOverrides>({
    resolveIntakeMismatch: false,
    renewFireCertificate: false,
    replaceClonedLabPhoto: false,
    condoneClassroomArea: false,
  });

  const layaOutput = useMemo(
    () => evaluateLayaDecision(dossier, overrides),
    [dossier, overrides]
  );

  const toggleOverride = (key: keyof LayaWhatIfOverrides) => {
    setOverrides((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="mb-5 rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] p-5">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2E8F0] pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1E3A8A] text-white">
            <Cpu className="h-4 w-4" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-bold text-[#0F172A]">
                Laya System-1 Calibrated Decision Engine
              </h3>
              <span className="rounded-md border border-[#BFDBFE] bg-[#EFF6FF] px-2 py-0.5 font-mono text-[11px] font-semibold text-[#1D4ED8]">
                RLCD Proper Scoring · {layaOutput.forward_pass_ms}ms Single-Pass
              </span>
            </div>
            <p className="text-xs text-[#475569]">
              Non-autoregressive typed decisions (<code>choice</code>, <code>score</code>, and{" "}
              <code>noul</code> primitives) computed over the multi-modal dossier state (ECE:{" "}
              {layaOutput.ece_calibration}).
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={submitting}
          onClick={() =>
            onApplyRecommendation(
              layaOutput.choice.selected_action_status,
              `Applied Laya System-1 recommendation "${layaOutput.choice.selected}" (P=${(
                layaOutput.choice.confidence * 100
              ).toFixed(1)}%, Expected Rubric Score E[S]=${
                layaOutput.score.expected_level
              }/5.00).`
            )
          }
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#1E3A8A] px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#1E40AF] disabled:opacity-50"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Apply Laya Recommended Disposition ({(layaOutput.choice.confidence * 100).toFixed(1)}%)
        </button>
      </div>

      {/* Interactive What-If Counterfactual Toggles */}
      <div className="mt-3.5 flex flex-wrap items-center gap-2 rounded-lg border border-[#E2E8F0] bg-white px-3.5 py-2.5 text-xs">
        <span className="inline-flex items-center gap-1.5 font-semibold text-[#334155]">
          <SlidersHorizontal className="h-3.5 w-3.5 text-[#1D4ED8]" />
          What-If Counterfactual Simulator:
        </span>
        {[
          {
            key: "resolveIntakeMismatch" as const,
            label: "Resolve NOC Intake Mismatch",
          },
          {
            key: "renewFireCertificate" as const,
            label: "Upload Renewed Fire NOC",
          },
          {
            key: "replaceClonedLabPhoto" as const,
            label: "Replace Cloned Lab Photo",
          },
          {
            key: "condoneClassroomArea" as const,
            label: "Condone CR-102 Area Shortfall",
          },
        ].map((item) => {
          const active = Boolean(overrides[item.key]);
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => toggleOverride(item.key)}
              className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                active
                  ? "border-[#0F766E] bg-[#F0FDFA] font-semibold text-[#0F766E]"
                  : "border-[#CBD5E1] bg-[#F8FAFC] text-[#475569] hover:bg-white"
              }`}
            >
              {active && <CheckCircle2 className="h-3 w-3" />}
              {item.label}
            </button>
          );
        })}
      </div>

      {/* 3 Laya Primitives Grid: choice | score | noul */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Primitive 1: `choice` */}
        <div className="rounded-lg border border-[#E2E8F0] bg-white p-4">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
            <span className="font-mono text-xs font-bold text-[#1E3A8A]">
              1. PRIMITIVE: `choice`
            </span>
            <span className="font-mono text-[11px] text-[#64748B]">
              P(top) = {(layaOutput.choice.confidence * 100).toFixed(1)}%
            </span>
          </div>
          <div className="mt-3 space-y-2.5">
            {layaOutput.choice.options.map((opt) => {
              const pct = Math.round(opt.probability * 1000) / 10;
              const isWinner = opt.option === layaOutput.choice.selected;
              return (
                <div key={opt.option} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span
                      className={
                        isWinner
                          ? "font-bold text-[#0F172A]"
                          : "font-medium text-[#475569]"
                      }
                    >
                      {isWinner ? "● " : ""}
                      {opt.option}
                    </span>
                    <span className="font-mono text-[11px] font-semibold tabular-nums text-[#0F172A]">
                      {pct.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[#F1F5F9]">
                    <div
                      style={{ width: `${Math.max(2, pct)}%` }}
                      className={`h-full transition-all duration-200 ${
                        isWinner ? "bg-[#1D4ED8]" : "bg-[#94A3B8]"
                      }`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Primitive 2: `score` */}
        <div className="rounded-lg border border-[#E2E8F0] bg-white p-4">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
            <span className="font-mono text-xs font-bold text-[#1E3A8A]">
              2. PRIMITIVE: `score` (Rubric)
            </span>
            <span className="rounded bg-[#FEF2F2] px-2 py-0.5 font-mono text-xs font-bold text-[#B91C1C]">
              E[S] = {layaOutput.score.expected_level} / 5.00
            </span>
          </div>
          <div className="mt-3 space-y-2">
            {layaOutput.score.rubric_distribution.map((lvl) => {
              const pct = Math.round(lvl.probability * 1000) / 10;
              return (
                <div key={lvl.level} className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-medium text-[#334155]">{lvl.label}</span>
                    <span className="font-mono font-semibold tabular-nums text-[#0F172A]">
                      {pct.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#F1F5F9]">
                    <div
                      style={{ width: `${Math.max(2, pct)}%` }}
                      className={`h-full transition-all duration-200 ${
                        lvl.level >= 4
                          ? "bg-[#B91C1C]"
                          : lvl.level === 3
                          ? "bg-[#B45309]"
                          : "bg-[#0F766E]"
                      }`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Primitive 3: `noul` */}
        <div className="rounded-lg border border-[#E2E8F0] bg-white p-4">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
            <span className="font-mono text-xs font-bold text-[#1E3A8A]">
              3. PRIMITIVE: `noul` P(true)
            </span>
            <span className="font-mono text-[11px] text-[#64748B]">
              Calibrated Binary Truth
            </span>
          </div>
          <div className="mt-3 space-y-2.5">
            {layaOutput.noul.map((prop) => {
              const pct = Math.round(prop.p_true * 1000) / 10;
              const isHighRisk =
                (prop.id.includes("tamper") || prop.id.includes("clone")) &&
                prop.p_true >= 0.5;
              const isGood =
                (prop.id.includes("ready") || prop.id.includes("condonable")) &&
                prop.p_true >= 0.5;
              return (
                <div
                  key={prop.id}
                  className="rounded-md border border-[#E2E8F0] bg-[#F8FAFC] p-2 text-[11px]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="leading-snug text-[#334155]">
                      {prop.statement}
                    </span>
                    <span
                      className={`shrink-0 rounded px-1.5 py-0.5 font-mono font-bold tabular-nums ${
                        isHighRisk
                          ? "bg-[#FEF2F2] text-[#B91C1C]"
                          : isGood
                          ? "bg-[#F0FDFA] text-[#0F766E]"
                          : "bg-[#F1F5F9] text-[#334155]"
                      }`}
                    >
                      P={pct.toFixed(1)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
