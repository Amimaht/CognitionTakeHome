import { NextResponse, type NextRequest } from "next/server";

// Exposes the current path to the layout so the identity switcher can return here.
export function proxy(req: NextRequest) {
  const headers = new Headers(req.headers);
  headers.set("x-pathname", req.nextUrl.pathname + req.nextUrl.search);
  return NextResponse.next({ request: { headers } });
}
