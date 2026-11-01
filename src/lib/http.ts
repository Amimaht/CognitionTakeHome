import { NextResponse } from "next/server";

// Domain errors carry an HTTP status; anything else is a 500.
export function errorResponse(err: unknown) {
  const status = typeof (err as { status?: unknown })?.status === "number" ? (err as { status: number }).status : 500;
  const message = status === 500 ? "Internal error" : (err as Error).message;
  if (status === 500) console.error(err);
  return NextResponse.json({ error: message }, { status });
}

export function formatMoney(cents: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}

export function formatDate(iso: string | null) {
  return iso ? new Date(iso).toLocaleString("en-US", { timeZone: "UTC", hour12: false }) + " UTC" : "—";
}
