import { NextResponse } from "next/server";
import { DEMO_COOKIE } from "@/lib/session";
import { DEMO_USERS } from "@/lib/seed";

// Demo identity switcher. Stores only a user id; role is resolved server-side.
export async function POST(req: Request) {
  const form = await req.formData();
  const userId = String(form.get("userId") ?? "");
  const returnTo = String(form.get("returnTo") ?? "/refunds");
  const safeReturn = returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/refunds";
  const res = NextResponse.redirect(new URL(safeReturn, req.url), 303);
  if (DEMO_USERS.some((u) => u.id === userId)) {
    res.cookies.set(DEMO_COOKIE, userId, { httpOnly: true, sameSite: "lax", path: "/" });
  } else {
    res.cookies.delete(DEMO_COOKIE);
  }
  return res;
}
