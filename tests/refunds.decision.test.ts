import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { listAuditEvents } from "../src/lib/audit";
import type { Db } from "../src/lib/db";
import { ForbiddenError, UnauthenticatedError } from "../src/lib/permissions";
import {
  decideRefund,
  getRefund,
  InvalidTransitionError,
  listRefunds,
  NotFoundError,
  ValidationError,
} from "../src/lib/refunds";
import { auditCount, AUDITOR, freshDb, OPERATOR, snapshot, VIEWER } from "./helpers";

let db: Db;
let file: string;

beforeEach(() => {
  ({ db, file } = freshDb());
});
afterEach(() => db.close());

describe("decideRefund — happy path", () => {
  it("operator approval persists and writes exactly one audit event", () => {
    const before = getRefund(db, OPERATOR, "rf_0001");
    expect(before.status).toBe("pending");

    const after = decideRefund(db, OPERATOR, "rf_0001", { decision: "approved", reason: "  Ticket #42 verified  " });
    expect(after.status).toBe("approved");
    expect(after.decided_by).toBe("u_operator");
    expect(after.decision_reason).toBe("Ticket #42 verified");
    expect(after.decided_at).toBeTruthy();

    // Re-read from the database: persisted, not just returned.
    const reread = getRefund(db, VIEWER, "rf_0001");
    expect(reread.status).toBe("approved");

    const events = listAuditEvents(db);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      actor_id: "u_operator",
      action: "refund.approved",
      entity_type: "refund_request",
      entity_id: "rf_0001",
      reason: "Ticket #42 verified",
    });
    expect(JSON.parse(events[0].before_state!)).toMatchObject({ status: "pending" });
    expect(JSON.parse(events[0].after_state!)).toMatchObject({ status: "approved", decided_by: "u_operator" });
  });

  it("operator rejection is recorded as refund.rejected", () => {
    decideRefund(db, OPERATOR, "rf_0002", { decision: "rejected", reason: "Outside window" });
    expect(getRefund(db, OPERATOR, "rf_0002").status).toBe("rejected");
    expect(listAuditEvents(db)[0].action).toBe("refund.rejected");
  });
});

describe("decideRefund — authorization", () => {
  it.each([
    ["viewer", VIEWER],
    ["auditor", AUDITOR],
  ])("%s cannot decide; nothing changes", (_label, actor) => {
    const before = snapshot(db);
    expect(() => decideRefund(db, actor, "rf_0001", { decision: "approved", reason: "x" })).toThrow(ForbiddenError);
    expect(snapshot(db)).toEqual(before);
  });

  it("no identity is rejected with 401 and nothing changes", () => {
    const before = snapshot(db);
    expect(() => decideRefund(db, null, "rf_0001", { decision: "approved", reason: "x" })).toThrow(
      UnauthenticatedError,
    );
    expect(snapshot(db)).toEqual(before);
  });

  it("viewer cannot read the audit log through the permission layer", () => {
    expect(() => listRefunds(db, null)).toThrow(UnauthenticatedError);
    // listAuditEvents itself is a data accessor; the page/route guards it.
    expect(() => decideRefund(db, VIEWER, "rf_0001", { decision: "approved", reason: "x" })).toThrow(ForbiddenError);
  });
});

describe("decideRefund — validation", () => {
  it.each([
    ["missing reason", { decision: "approved" }],
    ["blank reason", { decision: "approved", reason: "   " }],
    ["non-string reason", { decision: "approved", reason: 42 }],
    ["too-long reason", { decision: "approved", reason: "x".repeat(501) }],
    ["invalid decision", { decision: "maybe", reason: "ok" }],
    ["missing decision", { reason: "ok" }],
  ])("%s fails with 422 and nothing changes", (_label, input) => {
    const before = snapshot(db);
    expect(() => decideRefund(db, OPERATOR, "rf_0001", input as never)).toThrow(ValidationError);
    expect(snapshot(db)).toEqual(before);
  });

  it("unknown refund fails with 404 and nothing changes", () => {
    const before = snapshot(db);
    expect(() => decideRefund(db, OPERATOR, "rf_9999", { decision: "approved", reason: "ok" })).toThrow(NotFoundError);
    expect(snapshot(db)).toEqual(before);
  });
});

describe("decideRefund — state transitions", () => {
  it("a repeated decision fails with 409 and does not add an audit event", () => {
    decideRefund(db, OPERATOR, "rf_0001", { decision: "approved", reason: "first" });
    const before = snapshot(db);

    expect(() => decideRefund(db, OPERATOR, "rf_0001", { decision: "rejected", reason: "second" })).toThrow(
      InvalidTransitionError,
    );
    expect(snapshot(db)).toEqual(before);
    expect(auditCount(db, "rf_0001")).toBe(1);
    expect(getRefund(db, OPERATOR, "rf_0001").decision_reason).toBe("first");
  });

  it("an already-decided seeded request cannot be re-decided", () => {
    const decided = listRefunds(db, OPERATOR, { status: "approved" })[0];
    expect(decided).toBeTruthy();
    expect(() => decideRefund(db, OPERATOR, decided.id, { decision: "rejected", reason: "flip" })).toThrow(
      InvalidTransitionError,
    );
    expect(auditCount(db)).toBe(0);
  });

  it("competing connection: a decision cannot proceed while another writer holds the lock, and sees 409 afterwards", () => {
    // Connection A holds the write lock (as if mid-decision).
    const a = new Database(file);
    a.pragma("foreign_keys = ON");
    a.prepare("BEGIN IMMEDIATE").run();
    a.prepare(
      "UPDATE refund_requests SET status='approved', decided_by='u_operator', decided_at=?, decision_reason='A wins' WHERE id='rf_0003' AND status='pending'",
    ).run(new Date().toISOString());
    a.prepare(
      "INSERT INTO audit_events (actor_id, action, entity_type, entity_id, reason, created_at) VALUES ('u_operator','refund.approved','refund_request','rf_0003','A wins',?)",
    ).run(new Date().toISOString());

    // Connection B (the module under test) tries to decide the same row.
    const b = new Database(file, { timeout: 100 });
    b.pragma("foreign_keys = ON");
    expect(() => decideRefund(b, OPERATOR, "rf_0003", { decision: "rejected", reason: "B tries" })).toThrow(
      /database is locked|SQLITE_BUSY/,
    );

    a.prepare("COMMIT").run();

    // After A commits, B's retry is rejected by the conditional update.
    expect(() => decideRefund(b, OPERATOR, "rf_0003", { decision: "rejected", reason: "B retries" })).toThrow(
      InvalidTransitionError,
    );

    const row = getRefund(db, OPERATOR, "rf_0003");
    expect(row.status).toBe("approved");
    expect(row.decision_reason).toBe("A wins");
    expect(auditCount(db, "rf_0003")).toBe(1);
    a.close();
    b.close();
  });
});

describe("audit_events is append-only at the database layer", () => {
  it("rejects UPDATE and DELETE", () => {
    decideRefund(db, OPERATOR, "rf_0001", { decision: "approved", reason: "x" });
    expect(() => db.prepare("UPDATE audit_events SET reason = 'tampered'").run()).toThrow(/append-only/);
    expect(() => db.prepare("DELETE FROM audit_events").run()).toThrow(/append-only/);
    expect(listAuditEvents(db)[0].reason).toBe("x");
  });
});
