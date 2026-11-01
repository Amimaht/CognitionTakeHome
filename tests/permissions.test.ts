import { describe, expect, it } from "vitest";
import { ForbiddenError, hasPermission, requirePermission, UnauthenticatedError } from "../src/lib/permissions";
import { AUDITOR, OPERATOR, VIEWER } from "./helpers";

describe("role permissions", () => {
  it("maps roles to the expected permissions", () => {
    expect(hasPermission(VIEWER, "refund:read")).toBe(true);
    expect(hasPermission(VIEWER, "refund:decide")).toBe(false);
    expect(hasPermission(VIEWER, "audit:read")).toBe(false);
    expect(hasPermission(OPERATOR, "refund:decide")).toBe(true);
    expect(hasPermission(OPERATOR, "audit:read")).toBe(false);
    expect(hasPermission(AUDITOR, "audit:read")).toBe(true);
    expect(hasPermission(AUDITOR, "refund:decide")).toBe(false);
  });

  it("requirePermission throws typed errors with HTTP statuses", () => {
    expect(() => requirePermission(null, "refund:read")).toThrow(UnauthenticatedError);
    expect(() => requirePermission(VIEWER, "refund:decide")).toThrow(ForbiddenError);
    try {
      requirePermission(VIEWER, "refund:decide");
    } catch (e) {
      expect((e as ForbiddenError).status).toBe(403);
    }
    expect(requirePermission(OPERATOR, "refund:decide")).toBe(OPERATOR);
  });
});
