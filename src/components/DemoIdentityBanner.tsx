import type { Actor } from "@/lib/permissions";
import { DEMO_USERS } from "@/lib/seed";

export function DemoIdentityBanner({ actor, returnTo }: { actor: Actor | null; returnTo: string }) {
  return (
    <div className="demo-banner">
      <strong>Demo identity</strong>
      <span className="muted">
        {" "}
        — not authentication. The server looks up the role from the database; the browser never sends a role.
      </span>
      <form method="post" action="/api/demo-session" className="inline-form">
        <input type="hidden" name="returnTo" value={returnTo} />
        <select name="userId" defaultValue={actor?.id ?? ""}>
          <option value="">(none)</option>
          {DEMO_USERS.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name} — {u.role}
            </option>
          ))}
        </select>
        <button type="submit">Switch</button>
      </form>
      {actor ? (
        <span>
          Acting as <strong>{actor.name}</strong> (<code>{actor.role}</code>)
        </span>
      ) : (
        <span className="muted">No identity selected</span>
      )}
    </div>
  );
}
