export type Role = "viewer" | "operator" | "auditor";

export type Permission = "refund:read" | "refund:decide" | "kyc:read" | "audit:read";

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  viewer: ["refund:read", "kyc:read"],
  operator: ["refund:read", "refund:decide", "kyc:read"],
  auditor: ["refund:read", "kyc:read", "audit:read"],
};

export interface Actor {
  id: string;
  name: string;
  role: Role;
}

export class ForbiddenError extends Error {
  readonly status = 403;
  constructor(permission: Permission) {
    super(`Missing permission: ${permission}`);
    this.name = "ForbiddenError";
  }
}

export class UnauthenticatedError extends Error {
  readonly status = 401;
  constructor() {
    super("No demo identity selected");
    this.name = "UnauthenticatedError";
  }
}

export function hasPermission(actor: Actor | null, permission: Permission): boolean {
  if (!actor) return false;
  return ROLE_PERMISSIONS[actor.role].includes(permission);
}

export function requirePermission(actor: Actor | null, permission: Permission): Actor {
  if (!actor) throw new UnauthenticatedError();
  if (!hasPermission(actor, permission)) throw new ForbiddenError(permission);
  return actor;
}
