import type { Db } from "./db";
import { requirePermission, type Actor } from "./permissions";

export interface KycCase {
  id: string;
  applicant_name: string;
  country: string;
  document_type: string;
  risk_level: "low" | "medium" | "high";
  status: "pending" | "verified" | "escalated";
  submitted_at: string;
}

export function listKycCases(db: Db, actor: Actor | null, status?: string): KycCase[] {
  requirePermission(actor, "kyc:read");
  if (status && status !== "all") {
    return db.prepare("SELECT * FROM kyc_cases WHERE status = ? ORDER BY submitted_at DESC").all(status) as KycCase[];
  }
  return db.prepare("SELECT * FROM kyc_cases ORDER BY submitted_at DESC").all() as KycCase[];
}
