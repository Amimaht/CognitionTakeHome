import type { Db } from "./db";
import { writeAuditEvent } from "./audit";
import { requirePermission, type Actor } from "./permissions";

export type RefundStatus = "pending" | "approved" | "rejected";
export type Decision = "approved" | "rejected";

export interface RefundRequest {
  id: string;
  customer_name: string;
  customer_email: string;
  order_id: string;
  amount_cents: number;
  currency: string;
  customer_reason: string;
  status: RefundStatus;
  requested_at: string;
  decided_by: string | null;
  decided_by_name: string | null;
  decided_at: string | null;
  decision_reason: string | null;
}

export class ValidationError extends Error {
  readonly status = 422;
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export class NotFoundError extends Error {
  readonly status = 404;
  constructor(id: string) {
    super(`Refund request ${id} not found`);
    this.name = "NotFoundError";
  }
}

export class InvalidTransitionError extends Error {
  readonly status = 409;
  constructor(current: RefundStatus) {
    super(`Refund request is already ${current}; only pending requests can be decided`);
    this.name = "InvalidTransitionError";
  }
}

const SELECT = `SELECT r.*, u.name AS decided_by_name
                FROM refund_requests r LEFT JOIN users u ON u.id = r.decided_by`;

export interface RefundFilter {
  status?: RefundStatus | "all";
  minAmountCents?: number;
  q?: string;
}

export function listRefunds(db: Db, actor: Actor | null, filter: RefundFilter = {}): RefundRequest[] {
  requirePermission(actor, "refund:read");
  const where: string[] = [];
  const params: unknown[] = [];
  if (filter.status && filter.status !== "all") {
    where.push("r.status = ?");
    params.push(filter.status);
  }
  if (filter.minAmountCents !== undefined && Number.isFinite(filter.minAmountCents)) {
    where.push("r.amount_cents >= ?");
    params.push(filter.minAmountCents);
  }
  if (filter.q) {
    where.push("(r.customer_name LIKE ? OR r.order_id LIKE ? OR r.id LIKE ?)");
    const like = `%${filter.q}%`;
    params.push(like, like, like);
  }
  const sql = `${SELECT} ${where.length ? "WHERE " + where.join(" AND ") : ""}
               ORDER BY CASE r.status WHEN 'pending' THEN 0 ELSE 1 END, r.requested_at DESC`;
  return db.prepare(sql).all(...params) as RefundRequest[];
}

export function getRefund(db: Db, actor: Actor | null, id: string): RefundRequest {
  requirePermission(actor, "refund:read");
  const row = db.prepare(`${SELECT} WHERE r.id = ?`).get(id) as RefundRequest | undefined;
  if (!row) throw new NotFoundError(id);
  return row;
}

export const MAX_REASON_LENGTH = 500;

export function validateDecision(input: { decision?: unknown; reason?: unknown }): {
  decision: Decision;
  reason: string;
} {
  if (input.decision !== "approved" && input.decision !== "rejected") {
    throw new ValidationError("decision must be 'approved' or 'rejected'");
  }
  const reason = typeof input.reason === "string" ? input.reason.trim() : "";
  if (!reason) throw new ValidationError("reason is required");
  if (reason.length > MAX_REASON_LENGTH) {
    throw new ValidationError(`reason must be at most ${MAX_REASON_LENGTH} characters`);
  }
  return { decision: input.decision, reason };
}

/**
 * Decide a pending refund request.
 *
 * Order of checks: permission -> validation -> existence -> state. The state
 * change and its audit event are committed in one transaction, and the UPDATE
 * is conditional on status = 'pending' so a repeated or competing decision
 * cannot overwrite a completed one.
 */
export function decideRefund(
  db: Db,
  actor: Actor | null,
  id: string,
  input: { decision?: unknown; reason?: unknown },
): RefundRequest {
  const operator = requirePermission(actor, "refund:decide");
  const { decision, reason } = validateDecision(input);

  const run = db.transaction(() => {
    const before = db.prepare(`${SELECT} WHERE r.id = ?`).get(id) as RefundRequest | undefined;
    if (!before) throw new NotFoundError(id);

    const decidedAt = new Date().toISOString();
    const result = db
      .prepare(
        `UPDATE refund_requests
         SET status = ?, decided_by = ?, decided_at = ?, decision_reason = ?
         WHERE id = ? AND status = 'pending'`,
      )
      .run(decision, operator.id, decidedAt, reason, id);

    if (result.changes !== 1) {
      // Re-read inside the transaction so the error reports the real current state.
      const current = db.prepare("SELECT status FROM refund_requests WHERE id = ?").get(id) as {
        status: RefundStatus;
      };
      throw new InvalidTransitionError(current.status);
    }

    const after = db.prepare(`${SELECT} WHERE r.id = ?`).get(id) as RefundRequest;
    writeAuditEvent(db, {
      actorId: operator.id,
      action: `refund.${decision}`,
      entityType: "refund_request",
      entityId: id,
      reason,
      before: { status: before.status, decided_by: before.decided_by, decision_reason: before.decision_reason },
      after: { status: after.status, decided_by: after.decided_by, decision_reason: after.decision_reason },
    });
    return after;
  });

  // IMMEDIATE acquires the write lock up front so two connections racing on the
  // same row serialize instead of both reading 'pending'.
  return run.immediate();
}
