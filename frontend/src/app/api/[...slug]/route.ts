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
      runtimeState.secondary_meta as Record<
        string,
        {
          application: typeof runtimeState.primary_dossier.application;
          institution: typeof runtimeState.primary_dossier.institution;
        }
      >
    )[appId];
    if (sec) {
      return NextResponse.json({
        ...runtimeState.primary_dossier,
        application: sec.application,
        institution: sec.institution,
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

  return NextResponse.json({ error: "Unsupported route" }, { status: 404 });
}
