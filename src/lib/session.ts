import { cookies } from "next/headers";
import type { Db } from "./db";
import { getDb } from "./db";
import type { Actor, Role } from "./permissions";

// DEMO ONLY. The cookie carries a user id chosen from a visible selector. It is
// not authentication. What matters for the prototype is that the ROLE is always
// looked up server-side from the users table and never taken from the client.
export const DEMO_COOKIE = "demo_user_id";

export function resolveActor(db: Db, userId: string | undefined): Actor | null {
  if (!userId) return null;
  const row = db
    .prepare("SELECT id, name, role FROM users WHERE id = ?")
    .get(userId) as { id: string; name: string; role: Role } | undefined;
  return row ?? null;
}

export async function getActor(): Promise<Actor | null> {
  const jar = await cookies();
  return resolveActor(getDb(), jar.get(DEMO_COOKIE)?.value);
}
