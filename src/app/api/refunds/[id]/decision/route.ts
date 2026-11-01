import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { errorResponse } from "@/lib/http";
import { decideRefund } from "@/lib/refunds";
import { getActor } from "@/lib/session";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const actor = await getActor();
    const body = (await req.json().catch(() => ({}))) as { decision?: unknown; reason?: unknown };
    // Only `decision` and `reason` are read from the body. Actor identity and
    // role come from the session lookup, never from the client.
    const updated = decideRefund(getDb(), actor, id, { decision: body.decision, reason: body.reason });
    return NextResponse.json(updated);
  } catch (err) {
    return errorResponse(err);
  }
}
