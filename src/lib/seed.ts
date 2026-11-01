import type { Db } from "./db";

export const DEMO_USERS = [
  { id: "u_viewer", name: "Vera Viewer", role: "viewer" },
  { id: "u_operator", name: "Oscar Operator", role: "operator" },
  { id: "u_auditor", name: "Audrey Auditor", role: "auditor" },
] as const;

const FIRST = ["Maya", "Liam", "Sofia", "Noah", "Ava", "Ethan", "Isla", "Lucas", "Zoe", "Omar", "Priya", "Jonas"];
const LAST = ["Patel", "Nguyen", "Garcia", "Okafor", "Schmidt", "Rossi", "Kim", "Haddad", "Silva", "Brown"];
const REASONS = [
  "Item arrived damaged",
  "Duplicate charge on statement",
  "Service cancelled within trial period",
  "Wrong plan selected at checkout",
  "Did not receive the order",
  "Subscription renewed unexpectedly",
];
const COUNTRIES = ["US", "GB", "DE", "BR", "IN", "NG", "CA"];
const DOCS = ["passport", "driver_license", "national_id"];

// Deterministic pseudo-random generator so seeded data is stable across runs.
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

export function seed(db: Db) {
  const rand = rng(42);
  const pick = <T,>(arr: readonly T[]) => arr[Math.floor(rand() * arr.length)];
  const now = Date.now();

  const insertUser = db.prepare("INSERT OR IGNORE INTO users (id, name, role) VALUES (?, ?, ?)");
  const insertRefund = db.prepare(`
    INSERT OR IGNORE INTO refund_requests
      (id, customer_name, customer_email, order_id, amount_cents, currency, customer_reason, status, requested_at,
       decided_by, decided_at, decision_reason)
    VALUES (?, ?, ?, ?, ?, 'USD', ?, ?, ?, ?, ?, ?)`);
  const insertKyc = db.prepare(`
    INSERT OR IGNORE INTO kyc_cases (id, applicant_name, country, document_type, risk_level, status, submitted_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)`);

  db.transaction(() => {
    for (const u of DEMO_USERS) insertUser.run(u.id, u.name, u.role);

    for (let i = 1; i <= 24; i++) {
      const name = `${pick(FIRST)} ${pick(LAST)}`;
      const email = `${name.toLowerCase().replace(" ", ".")}@example.com`;
      const requestedAt = new Date(now - Math.floor(rand() * 20) * 86_400_000).toISOString();
      // Most rows pending; a few pre-decided so filters have something to show.
      const status = i % 6 === 0 ? "approved" : i % 7 === 0 ? "rejected" : "pending";
      const decided = status !== "pending";
      insertRefund.run(
        `rf_${String(i).padStart(4, "0")}`,
        name,
        email,
        `ord_${100000 + i * 37}`,
        Math.floor(rand() * 48000) + 500,
        pick(REASONS),
        status,
        requestedAt,
        decided ? "u_operator" : null,
        decided ? new Date(now - 86_400_000).toISOString() : null,
        decided ? (status === "approved" ? "Verified with support ticket" : "Outside refund window") : null,
      );
    }

    for (let i = 1; i <= 12; i++) {
      insertKyc.run(
        `kyc_${String(i).padStart(4, "0")}`,
        `${pick(FIRST)} ${pick(LAST)}`,
        pick(COUNTRIES),
        pick(DOCS),
        pick(["low", "low", "medium", "high"]),
        i % 4 === 0 ? "verified" : i % 5 === 0 ? "escalated" : "pending",
        new Date(now - Math.floor(rand() * 10) * 86_400_000).toISOString(),
      );
    }
  })();
}
