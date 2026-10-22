import { NextResponse } from "next/server";
import { z } from "zod";
import { audit } from "@/lib/db";
import { guard, chainError } from "@/lib/guard";
import { contractFor, readContract } from "@/lib/chain";
import { checkToken } from "@/lib/qr";

class Bad extends Error {}
const need = <T>(v: T | undefined, msg: string): T => {
  if (v === undefined) throw new Bad(msg);
  return v;
};

const schema = z.object({
  id: z.number().int().min(1),
  action: z.enum(["request", "cancel", "approve", "reject", "retire", "checkout", "return", "confirmReturn", "dispute", "resolve"]),
  durationHours: z.number().int().min(1).max(720).optional(),
  conditionBefore: z.number().int().min(1).max(5).optional(),
  conditionAfter: z.number().int().min(1).max(5).optional(),
  careRating: z.number().int().min(1).max(5).optional(),
  refundPercent: z.number().min(0).max(100).optional(),
  token: z.string().min(20).max(600).optional(),
});

export async function POST(req: Request) {
  const g = await guard();
  if ("res" in g) return g.res;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const a = parsed.data;
  const id = a.id;

  try {
    // The transaction is signed with the logged-in user's own blockchain account,
    // so the contract itself decides who may do what.
    const c = contractFor(g.s.idx);
    let tx: { hash: string; wait: () => Promise<unknown> };

    switch (a.action) {
      case "request":
        tx = await c.requestResource(id, need(a.durationHours, "Duration is required"));
        break;
      case "cancel":
        tx = await c.cancelRequest(id);
        break;
      case "approve":
        tx = await c.approveRequest(id);
        break;
      case "reject":
        tx = await c.rejectRequest(id);
        break;
      case "retire":
        tx = await c.retireResource(id);
        break;
      case "return":
        tx = await c.returnResource(id);
        break;
      case "dispute":
        tx = await c.raiseDispute(id);
        break;
      case "checkout": {
        const cond = need(a.conditionBefore, "Condition is required");
        const token = need(a.token, "The borrower's QR code is required");
        const r = await readContract().resources(id);
        const bad = checkToken(token, id, "checkout", r.borrower);
        if (bad) {
          audit(g.s.username, "QR_BLOCKED", `checkout #${id}: ${bad}`);
          return NextResponse.json({ error: bad }, { status: 400 });
        }
        tx = await c.confirmCheckout(id, cond);
        break;
      }
      case "confirmReturn": {
        const cond = need(a.conditionAfter, "Condition after is required");
        const care = need(a.careRating, "Care rating is required");
        const token = need(a.token, "The borrower's QR code is required");
        const r = await readContract().resources(id);
        const bad = checkToken(token, id, "return", r.borrower);
        if (bad) {
          audit(g.s.username, "QR_BLOCKED", `return #${id}: ${bad}`);
          return NextResponse.json({ error: bad }, { status: 400 });
        }
        tx = await c.confirmReturn(id, cond, care);
        break;
      }
      case "resolve": {
        if (g.s.role !== "admin") {
          audit(g.s.username, "FORBIDDEN", `tried to resolve dispute #${id}`);
          return NextResponse.json({ error: "Admin only" }, { status: 403 });
        }
        const pct = need(a.refundPercent, "Refund percent is required");
        tx = await c.resolveDispute(id, Math.round(pct * 100));
        break;
      }
      default:
        throw new Bad("Unknown action");
    }

    await tx.wait();
    audit(g.s.username, `RES_${a.action.toUpperCase()}`, `#${id} tx=${tx.hash}`);
    return NextResponse.json({ ok: true, txHash: tx.hash });
  } catch (e) {
    if (e instanceof Bad) return NextResponse.json({ error: e.message }, { status: 400 });
    audit(g.s.username, "CHAIN_BLOCKED", `${a.action} #${id}: ${chainError(e)}`);
    return NextResponse.json({ error: chainError(e) }, { status: 400 });
  }
}