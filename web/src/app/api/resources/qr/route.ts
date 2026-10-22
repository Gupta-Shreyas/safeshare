import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { audit } from "@/lib/db";
import { guard } from "@/lib/guard";
import { readContract } from "@/lib/chain";
import { makeToken } from "@/lib/qr";

export async function GET(req: Request) {
  const g = await guard();
  if ("res" in g) return g.res;
  const url = new URL(req.url);
  const id = Number(url.searchParams.get("id"));
  const kind = url.searchParams.get("kind");
  if (!Number.isInteger(id) || id < 1 || (kind !== "checkout" && kind !== "return"))
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  try {
    const r = await readContract().resources(id);
    const status = Number(r.status);
    if (String(r.borrower).toLowerCase() !== g.s.address.toLowerCase()) {
      audit(g.s.username, "FORBIDDEN", `asked for a ${kind} QR of resource #${id}`);
      return NextResponse.json({ error: "Only the borrower can generate this QR code" }, { status: 403 });
    }
    const okState = kind === "checkout" ? status === 2 : status === 3 || status === 4;
    if (!okState) return NextResponse.json({ error: "This item is not at the right step for that QR code" }, { status: 409 });

    const token = makeToken(id, kind, g.s.address);
    const qr = await QRCode.toDataURL(token, { width: 320, margin: 1 });
    audit(g.s.username, "QR_ISSUED", `${kind} #${id}`);
    return NextResponse.json({ token, qr, expiresInSec: 600 });
  } catch {
    return NextResponse.json({ error: "Blockchain node not reachable" }, { status: 503 });
  }
}