import type { Db } from "./db";

export interface AuditEventInput {
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  reason?: string | null;
  before?: unknown;
  after?: unknown;
}

export interface AuditEvent {
  id: number;
  actor_id: string;
  actor_name: string;
  action: string;
  entity_type: string;
  entity_id: string;
  reason: string | null;
  before_state: string | null;
  after_state: string | null;
  created_at: string;
}

// Must be called inside the same transaction as the state change it records.
export function writeAuditEvent(db: Db, e: AuditEventInput): void {
  db.prepare(
    `INSERT INTO audit_events (actor_id, action, entity_type, entity_id, reason, before_state, after_state, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    e.actorId,
    e.action,
    e.entityType,
    e.entityId,
    e.reason ?? null,
    e.before === undefined ? null : JSON.stringify(e.before),
    e.after === undefined ? null : JSON.stringify(e.after),
    new Date().toISOString(),
  );
}

export function listAuditEvents(db: Db, limit = 200): AuditEvent[] {
  return db
    .prepare(
      `SELECT a.*, u.name AS actor_name
       FROM audit_events a JOIN users u ON u.id = a.actor_id
       ORDER BY a.id DESC LIMIT ?`,
    )
    .all(limit) as AuditEvent[];
}
