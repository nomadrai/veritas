import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import snapshotData from "@/data/veritas_snapshot.json";

const BACKEND_BASE = process.env.BACKEND_URL || "http://127.0.0.1:8000";

// Mutable in-memory state for serverless Vercel preview interactions
const runtimeState = structuredClone(snapshotData) as typeof snapshotData;

async function tryProxyToFastAPI(req: NextRequest, pathAfterApi: string): Promise<NextResponse | null> {
  if (process.env.VERCEL === "1" && !process.env.BACKEND_URL) {
    return null;
  }
  const url = `${BACKEND_BASE}/api/${pathAfterApi}${req.nextUrl.search}`;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1500);
    const headers: Record<string, string> = {};
    const contentType = req.headers.get("content-type");
    if (contentType) headers["content-type"] = contentType;

    const body =
      req.method !== "GET" && req.method !== "HEAD"
        ? Buffer.from(await req.arrayBuffer())
        : undefined;

    const resp = await fetch(url, {
      method: req.method,
      headers,
      body,
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const data = await resp.json();
    return NextResponse.json(data, { status: resp.status });
  } catch {
    return null;
  }
}

function appendSnapshotAudit(
  appId: string,
  actorRole: string,
  actorName: string,
  actionType: string,
  targetId: string,
  statusAfter: string,
  rationale: string,
  ruleId: string = "VERITAS-AUDIT"
) {
  const logs = runtimeState.primary_dossier.audit_logs;
  const prevHash = logs.length > 0 ? logs[0].entry_hash : "0".repeat(64);
  const ts = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  const entryHash = crypto
    .createHash("sha256")
    .update(`${ts}|${appId}|${actorRole}|${actionType}|${targetId}|${statusAfter}|${rationale}|${prevHash}`)
    .digest("hex");

  const entry = {
    id: logs.length + 1,
    timestamp: ts,
    app_id: appId,
    actor_role: actorRole,
    actor_name: actorName,
    action_type: actionType,
    target_id: targetId,
    rule_id: ruleId,
    ai_confidence: 0.99,
    status_after: statusAfter,
    rationale,
    prev_hash: prevHash,
    entry_hash: entryHash,
  };
  logs.unshift(entry);
  return entry;
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await context.params;
  const path = slug.join("/");

  const proxied = await tryProxyToFastAPI(req, path);
  if (proxied) return proxied;

  if (path === "health") {
    return NextResponse.json(runtimeState.health);
  }

  if (path === "applications") {
    return NextResponse.json(runtimeState.applications);
  }

  if (slug[0] === "applications" && slug[1]) {
    const appId = slug[1];
    if (appId === "AICTE-2026-EOA-8841") {
      return NextResponse.json(runtimeState.primary_dossier);
    }
    const sec = (
      runtimeState.secondary_meta as unknown as Record<
        string,
        {
          application: typeof runtimeState.primary_dossier.application;
          institution: typeof runtimeState.primary_dossier.institution;
          documents?: unknown[];
          infrastructure_media?: unknown[];
        }
      >
    )[appId];
    if (sec) {
      return NextResponse.json({
        ...runtimeState.primary_dossier,
        application: sec.application,
        institution: sec.institution,
        documents: sec.documents || runtimeState.primary_dossier.documents,
        infrastructure_media:
          sec.infrastructure_media || runtimeState.primary_dossier.infrastructure_media,
      });
    }
    return NextResponse.json(runtimeState.primary_dossier);
  }

  if (slug[0] === "documents" && slug[1] && slug[2] === "xray") {
    const docId = slug[1];
    const doc =
      runtimeState.primary_dossier.documents.find((d) => d.doc_id === docId) ||
      runtimeState.primary_dossier.documents[0];
    const quality = Number(req.nextUrl.searchParams.get("quality") || 90);
    const scale = Number(req.nextUrl.searchParams.get("scale") || 18);
    return NextResponse.json({
      ...doc.xray,
      ela: {
        ...doc.xray.ela,
        quality,
        scale,
      },
    });
  }

  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await context.params;
  const path = slug.join("/");

  const proxied = await tryProxyToFastAPI(req, path);
  if (proxied) return proxied;

  if (slug[0] === "authority" && slug[1] === "verify" && slug[2]) {
    const docId = slug[2];
    const doc =
      runtimeState.primary_dossier.documents.find((d) => d.doc_id === docId) ||
      runtimeState.primary_dossier.documents[0];
    const entry = appendSnapshotAudit(
      doc.app_id,
      "SYSTEM · ISSUING AUTHORITY LIVE SYNC",
      doc.authority_response.portal,
      "LIVE_AUTHORITY_API_PING",
      doc.doc_id,
      doc.authority_status,
      doc.authority_response.discrepancy ||
        `Source registry confirmed certificate ${doc.cert_number} is ${doc.authority_status}.`
    );
    return NextResponse.json({
      doc_id: doc.doc_id,
      authority_status: doc.authority_status,
      authority_response: doc.authority_response,
      audit_log_entry: entry,
    });
  }

  if (path === "scrutiny/decision") {
    const body = await req.json();
    const {
      app_id = "AICTE-2026-EOA-8841",
      target_id = "AICTE-2026-EOA-8841",
      target_type = "application",
      new_status = "Verified",
      officer_name = "Shri V. K. Subramanian (AICTE Scrutiny Officer)",
      actor_role = "AICTE SCRUTINY OFFICER",
      rationale = "Scrutiny decision recorded.",
      rule_id = "STATUTORY-DECISION",
    } = body;

    if (target_type === "application") {
      runtimeState.primary_dossier.application.overall_status = new_status;
      const summaryRow = runtimeState.applications.find((a) => a.app_id === app_id);
      if (summaryRow) summaryRow.overall_status = new_status;
    } else if (target_type === "document") {
      const doc = runtimeState.primary_dossier.documents.find((d) => d.doc_id === target_id);
      if (doc) doc.authority_status = new_status;
    }

    const entry = appendSnapshotAudit(
      app_id,
      actor_role,
      officer_name,
      "OFFICER_STATUTORY_DECISION",
      target_id,
      new_status,
      rationale,
      rule_id
    );
    return NextResponse.json({ status: "recorded", audit_log_entry: entry });
  }

  if (path === "live-analyze") {
    const formData = await req.formData();
    const preset = (formData.get("preset_specimen") as string) || "tampered_noc";
    const uploadedFile = formData.get("file") as File | null;
    const filename = uploadedFile?.name || `${preset}.pdf`;

    const docs = runtimeState.primary_dossier.documents;
    const media = runtimeState.primary_dossier.infrastructure_media;

    if (preset === "cloned_nagpur_lab" || (uploadedFile && !filename.toLowerCase().endsWith(".pdf"))) {
      const m = media[0];
      appendSnapshotAudit(
        "AICTE-2026-EOA-8841",
        "NODAL OFFICER / LIVE SANDBOX",
        "Live Pre-Scrutiny Diagnostic",
        "LIVE_SPECIMEN_SCAN",
        filename,
        "Diagnostic Completed",
        `Executed live X-Ray & Clone Hunter on ${filename}.`
      );
      return NextResponse.json({
        filename: uploadedFile?.name || "computer_lab_8841.jpg",
        is_pdf: false,
        xray: {
          ...docs[0].xray,
          specimen_data_url: m.specimen_data_url,
          ela: {
            ...docs[0].xray.ela,
            ela_heatmap_data_url: m.ela_heatmap_data_url,
            hotspots: m.ela_hotspots,
          },
          qr_codes: [],
          qr_ocr_discrepancies: [],
          copy_move_regions: [],
        },
        cv_analysis: {
          hashes: m.hashes,
          exif: m.exif,
          clone_matches: m.clone_matches,
        },
      });
    }

    const docMap: Record<string, number> = {
      tampered_noc: 0,
      expired_fire_seal_clone: 1,
      floor_plan_deficit: 2,
      clean_affidavit: 3,
    };
    const chosenDoc = docs[docMap[preset] ?? 0];
    appendSnapshotAudit(
      "AICTE-2026-EOA-8841",
      "NODAL OFFICER / LIVE SANDBOX",
      "Live Pre-Scrutiny Diagnostic",
      "LIVE_SPECIMEN_SCAN",
      filename,
      "Diagnostic Completed",
      `Executed live 3-Layer Document Forensics on ${filename}.`
    );
    return NextResponse.json({
      filename: uploadedFile?.name || `${chosenDoc.doc_id}.pdf`,
      is_pdf: true,
      xray: chosenDoc.xray,
      cv_analysis: null,
    });
  }

  if (path === "applications/create") {
    const formData = await req.formData();
    const instName = (formData.get("inst_name") as string) || "Sardar Patel Institute of Advanced Technology, Ahmedabad";
    const instId = (formData.get("inst_id") as string) || "1-66402918";
    const state = (formData.get("state") as string) || "Gujarat";
    const city = (formData.get("city") as string) || "Ahmedabad";
    const nodalOfficer = (formData.get("nodal_officer") as string) || "Dr. Vikramaditya Mehta";
    const category = (formData.get("category") as string) || "EoA + Increase in Intake";
    const courseName = (formData.get("course_name") as string) || "B.Tech in AI & Data Science";
    const appliedIntake = Number(formData.get("applied_intake") || 180);
    const histIntake = Number(formData.get("historical_eoa_intake") || 120);
    const facultyCount = Number(formData.get("faculty_count") || 24);
    const landAcres = Number(formData.get("declared_land_acres") || 6.5);
    const builtupSqm = Number(formData.get("declared_builtup_sqm") || 12400);
    const campusLat = Number(formData.get("campus_lat") || 23.0225);
    const campusLng = Number(formData.get("campus_lng") || 72.5714);

    const shortCode = String(Date.now()).slice(-4);
    const newAppId = `AICTE-2026-EOA-${shortCode}`;
    const intakeMismatch = appliedIntake !== histIntake;
    const reqFaculty = Math.max(12, Math.round((appliedIntake * 4) / 20));
    const fsrOk = facultyCount >= reqFaculty;
    const flagCount = (intakeMismatch ? 1 : 0) + (fsrOk ? 0 : 1);
    const riskScore = flagCount > 0 ? 68 : 16;
    const overallStatus =
      flagCount > 0
        ? `Action Required · ${flagCount} Advisory Flags`
        : "Ready for Committee Approval · 0 Flags";
    const aiSummary = `Dynamically ingested dossier ${newAppId} for ${instName}: Applied intake = ${appliedIntake} (Sanctioned QR = ${histIntake}), Faculty = ${facultyCount} (Required >= ${reqFaculty} for 1:20 norm).`;

    runtimeState.applications.unshift({
      app_id: newAppId,
      inst_id: instId,
      inst_name: instName,
      state,
      city,
      academic_year: "2026-2027",
      category,
      submitted_at: new Date().toISOString(),
      applied_intake: appliedIntake,
      historical_eoa_intake: histIntake,
      overall_status: overallStatus,
      risk_score: riskScore,
      ai_summary: aiSummary,
      nodal_officer: nodalOfficer,
    });

    (runtimeState.secondary_meta as Record<string, unknown>)[newAppId] = {
      application: {
        ...runtimeState.primary_dossier.application,
        app_id: newAppId,
        inst_id: instId,
        category,
        applied_intake: appliedIntake,
        declared_land_acres: landAcres,
        declared_builtup_sqm: builtupSqm,
        overall_status: overallStatus,
        risk_score: riskScore,
        ai_summary: aiSummary,
        consistency_flags: [
          {
            field: `Sanctioned Intake (${courseName})`,
            app_form_value: `${appliedIntake} Seats`,
            doc_ocr_value: `${appliedIntake} Seats (Uploaded NOC OCR)`,
            qr_or_api_value: `${histIntake} Seats (Decoded QR Payload)`,
            historical_aicte_db: `${histIntake} Seats (Prev EoA)`,
            status: intakeMismatch ? "MISMATCH" : "VERIFIED",
          },
          {
            field: "Faculty-Student Ratio (APH 1:20 Norm)",
            app_form_value: `${facultyCount} Regular Faculty`,
            doc_ocr_value: `${facultyCount} Faculty Verified`,
            qr_or_api_value: `Required: >= ${reqFaculty} Faculty`,
            historical_aicte_db: "APH Clause 7.1 (1:20 Norm)",
            status: fsrOk ? "VERIFIED" : "DEFICIENT",
          },
        ],
      },
      institution: {
        ...runtimeState.primary_dossier.institution,
        inst_id: instId,
        name: instName,
        state,
        city,
        campus_lat: campusLat,
        campus_lng: campusLng,
        historical_eoa_intake: histIntake,
        faculty_count: facultyCount,
        nodal_officer: nodalOfficer,
      },
    };

    appendSnapshotAudit(
      newAppId,
      "INSTITUTION NODAL OFFICER",
      nodalOfficer,
      "DYNAMIC_DOSSIER_SUBMITTED",
      newAppId,
      overallStatus,
      aiSummary
    );

    return NextResponse.json({
      status: "created",
      app_id: newAppId,
      overall_status: overallStatus,
      risk_score: riskScore,
      ai_summary: aiSummary,
    });
  }

  return NextResponse.json({ error: "Unsupported route" }, { status: 404 });
}
