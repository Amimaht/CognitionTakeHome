import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "../src/lib/db";
import { listKycCases } from "../src/lib/kyc";
import { listRefunds } from "../src/lib/refunds";
import { freshDb, VIEWER } from "./helpers";

let db: Db;
beforeEach(() => ({ db } = freshDb()));
afterEach(() => db.close());

describe("list filters", () => {
  it("filters refunds by status, search and minimum amount", () => {
    const pending = listRefunds(db, VIEWER, { status: "pending" });
    expect(pending.length).toBeGreaterThan(0);
    expect(pending.every((r) => r.status === "pending")).toBe(true);

    const all = listRefunds(db, VIEWER, { status: "all" });
    expect(all.length).toBe(24);

    expect(listRefunds(db, VIEWER, { status: "all", q: "rf_0001" }).map((r) => r.id)).toEqual(["rf_0001"]);

    const big = listRefunds(db, VIEWER, { status: "all", minAmountCents: 40000 });
    expect(big.every((r) => r.amount_cents >= 40000)).toBe(true);
    expect(big.length).toBeLessThan(all.length);
  });

  it("KYC queue is readable by viewer and filters by status", () => {
    const pending = listKycCases(db, VIEWER, "pending");
    expect(pending.every((k) => k.status === "pending")).toBe(true);
    expect(listKycCases(db, VIEWER, "all").length).toBe(12);
  });
});
