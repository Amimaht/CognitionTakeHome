import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { openDb, type Db } from "../src/lib/db";
import { seed } from "../src/lib/seed";
import type { Actor } from "../src/lib/permissions";

export const VIEWER: Actor = { id: "u_viewer", name: "Vera Viewer", role: "viewer" };
export const OPERATOR: Actor = { id: "u_operator", name: "Oscar Operator", role: "operator" };
export const AUDITOR: Actor = { id: "u_auditor", name: "Audrey Auditor", role: "auditor" };

export function freshDb(): { db: Db; file: string } {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "refunds-test-"));
  const file = path.join(dir, "test.db");
  const db = openDb(file);
  seed(db);
  return { db, file };
}

export function snapshot(db: Db) {
  return {
    refunds: db.prepare("SELECT * FROM refund_requests ORDER BY id").all(),
    audit: db.prepare("SELECT * FROM audit_events ORDER BY id").all(),
  };
}

export function auditCount(db: Db, entityId?: string): number {
  const row = entityId
    ? db.prepare("SELECT COUNT(*) AS n FROM audit_events WHERE entity_id = ?").get(entityId)
    : db.prepare("SELECT COUNT(*) AS n FROM audit_events").get();
  return (row as { n: number }).n;
}
