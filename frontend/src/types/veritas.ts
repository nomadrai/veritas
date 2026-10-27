export interface ELAHotspot {
  bbox: [number, number, number, number];
  z_score: number;
  mean_error_level: number;
  confidence: number;
}

export interface ELAResult {
  quality: number;
  scale: number;
  mean_error: number;
  std_error: number;
  max_block_error: number;
  ela_heatmap_data_url: string;
  ela_raw_data_url: string;
  hotspots: ELAHotspot[];
}

export interface NoiseAnomalyCell {
  row: number;
  col: number;
  bbox: [number, number, number, number];
  noise_sigma: number;
  deviation_score: number;
}

export interface NoiseGridResult {
  grid_size: number;
  median_noise_sigma: number;
  grid_values: number[][];
  anomalous_cells: NoiseAnomalyCell[];
}

export interface CopyMoveRegion {
  source_bbox: [number, number, number, number];
  target_bbox: [number, number, number, number];
  matched_keypoints: number;
  confidence: number;
}

export interface QRCodeItem {
  raw_text: string;
  payload: Record<string, unknown> | string;
  bbox: [number, number, number, number];
}

export interface QROCRDiscrepancy {
  field: string;
  qr_value: string;
  ocr_printed_value: string;
  qr_bbox: [number, number, number, number];
  ocr_bbox: [number, number, number, number];
  severity: string;
  explanation: string;
}

export interface FontAnomaly {
  text: string;
  detected_font: string;
  expected_font: string;
  font_size: number;
  bbox: [number, number, number, number];
  reason: string;
}

export interface PDFForensics {
  is_pdf: boolean;
  eof_markers: number;
  incremental_updates: number;
  producer: string;
  creator: string;
  creation_date: string | null;
  mod_date: string | null;
  date_mismatch?: boolean;
  suspicious_editing_software?: boolean;
  has_digital_signature: boolean;
  dominant_font?: string;
  font_anomalies: FontAnomaly[];
}

export interface DocumentXRay {
  specimen_data_url: string;
  dimensions: { width: number; height: number };
  qr_codes: QRCodeItem[];
  qr_ocr_discrepancies: QROCRDiscrepancy[];
  pdf_forensics: PDFForensics;
  ela: ELAResult;
  noise_grid: NoiseGridResult;
  copy_move_regions: CopyMoveRegion[];
  jpeg_ghost?: {
    dominant_splice_quality: number;
    peak_ghost_contrast: number;
    primary_ghost_heatmap_url: string;
  };
  resampling?: {
    patch_size: number;
    median_periodicity: number;
    resampled_patches: Array<{
      row: number;
      col: number;
      bbox: [number, number, number, number];
      periodicity_score: number;
    }>;
  };
  revision_tree?: {
    is_pdf: boolean;
    total_revisions: number;
    diff_policy_verdict: string;
    revisions: Array<{
      revision_number: number;
      byte_length: number;
      contains_signature: boolean;
      incremental_delta_bytes: number;
      status: string;
    }>;
    font_subsets: Array<{
      page: string;
      font_resource_key: string;
      base_font: string;
      subtype: string;
    }>;
  };
}

export interface ForensicFinding {
  id: string;
  layer: string;
  severity: "CRITICAL" | "HIGH" | "WARNING" | "VERIFIED";
  title: string;
  confidence: number;
  aph_clause: string;
  evidence: string;
  bbox: [number, number, number, number];
  qr_bbox?: [number, number, number, number];
  source_bbox?: [number, number, number, number];
}

export interface DocumentAnnotation {
  id: string;
  label: string;
  severity: "CRITICAL" | "HIGH" | "WARNING" | "VERIFIED" | "INFO";
  layer: "qr" | "ela" | "copymove" | "ocr";
  bbox: [number, number, number, number];
  target_bbox?: [number, number, number, number];
}

export interface AuthorityResponse {
  portal: string;
  queried_at: string;
  http_status: number;
  latency_ms: number;
  source_record: Record<string, string | number>;
  discrepancy: string | null;
}

export interface DossierDocument {
  doc_id: string;
  app_id: string;
  doc_type: string;
  title: string;
  issuing_authority: string;
  cert_number: string;
  issue_date: string;
  expiry_date: string;
  authority_status:
    | "Verified"
    | "Mismatch Detected"
    | "Expired"
    | "Pending"
    | "Manual Review Required"
    | string;
  authority_response: AuthorityResponse;
  forensic_score: number;
  extracted_fields: Record<string, string>;
  qr_payload: Record<string, unknown> | null;
  pdf_metadata: {
    producer: string;
    creator: string;
    creation_date: string;
    mod_date: string;
    eof_markers: number;
    incremental_updates: number;
    dominant_font: string;
    font_anomalies: FontAnomaly[];
    has_digital_signature: boolean;
  };
  forensic_findings: ForensicFinding[];
  annotations: DocumentAnnotation[];
  xray: DocumentXRay;
}

export interface CVDetection {
  id: string;
  label: string;
  confidence: number;
  status: "CRITICAL" | "WARNING" | "VERIFIED";
  bbox: [number, number, number, number];
}

export interface CloneMatch {
  matched_media_id: string;
  matched_app_id: string;
  matched_inst_id: string;
  matched_inst_name: string;
  matched_facility: string;
  phash_hamming_distance: number;
  dhash_hamming_distance: number;
  whash_hamming_distance: number;
  matched_phash: string;
  vector_cosine_similarity: number;
  similarity_percent: number;
  captured_at: string;
  preview_data_url: string;
  verdict: string;
}

export interface InfrastructureMedia {
  media_id: string;
  app_id: string;
  inst_id: string;
  inst_name: string;
  facility_type: string;
  title: string;
  specimen_data_url: string;
  ela_heatmap_data_url: string;
  ela_hotspots: ELAHotspot[];
  hashes: {
    phash: string;
    dhash: string;
    ahash: string;
    whash: string;
  };
  exif: {
    lat: number | null;
    lng: number | null;
    campus_lat: number;
    campus_lng: number;
    allowed_radius_m: number;
    distance_m: number | null;
    geo_status: "VERIFIED_ON_CAMPUS" | "OUTSIDE_CAMPUS_BOUNDARY" | "MISSING_EXIF_GPS";
    camera_make: string;
    camera_model: string;
    software: string;
    captured_at: string;
    explanation: string;
  };
  geo_distance_m: number | null;
  geo_status: string;
  cv_detections: CVDetection[];
  aph_compliance: {
    status: string;
    aph_clause: string;
    detected_pcs?: number;
    required_pcs?: number;
    detected_seats?: number;
    required_seats?: number;
    summary: string;
  };
  clone_matches: CloneMatch[];
}

export interface ChecklistItem {
  id: string;
  category: string;
  rule: string;
  status: "CRITICAL" | "WARNING" | "VERIFIED";
  target_type: "document" | "media";
  target_id: string;
  confidence: number;
  detail: string;
}

export interface ConsistencyFlag {
  field: string;
  app_form_value: string;
  doc_ocr_value: string;
  qr_or_api_value: string;
  historical_aicte_db: string;
  status: "MISMATCH" | "EXPIRED" | "DEFICIENT" | "VERIFIED";
}

export interface AuditLogEntry {
  id: number;
  timestamp: string;
  app_id: string;
  actor_role: string;
  actor_name: string;
  action_type: string;
  target_id: string;
  rule_id: string | null;
  ai_confidence: number | null;
  status_after: string;
  rationale: string;
  prev_hash: string;
  entry_hash: string;
}

export interface ApplicationSummary {
  app_id: string;
  inst_id: string;
  inst_name: string;
  state: string;
  city: string;
  academic_year: string;
  category: string;
  submitted_at: string;
  applied_intake: number;
  historical_eoa_intake: number;
  overall_status: string;
  risk_score: number;
  ai_summary: string;
  nodal_officer: string;
}

export interface DossierPayload {
  application: {
    app_id: string;
    inst_id: string;
    academic_year: string;
    category: string;
    submitted_at: string;
    applied_intake: number;
    applied_courses: Array<{
      course: string;
      level: string;
      existing_intake: number;
      applied_intake: number;
      noc_sanctioned_intake: number;
    }>;
    declared_land_acres: number;
    declared_builtup_sqm: number;
    overall_status: string;
    risk_score: number;
    ai_summary: string;
    checklist: ChecklistItem[];
    consistency_flags: ConsistencyFlag[];
  };
  institution: {
    inst_id: string;
    name: string;
    state: string;
    city: string;
    address: string;
    campus_lat: number;
    campus_lng: number;
    campus_radius_m: number;
    established_year: number;
    historical_eoa_intake: number;
    historical_deficiencies: number;
    faculty_count: number;
    ter_payment_status: string;
    ter_receipt_no: string;
    nodal_officer: string;
  };
  documents: DossierDocument[];
  infrastructure_media: InfrastructureMedia[];
  audit_logs: AuditLogEntry[];
}
