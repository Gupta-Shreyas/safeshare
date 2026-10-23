import { NextResponse } from "next/server";
import { z } from "zod";
import { db, audit } from "@/lib/db";
import { guard } from "@/lib/guard";
import { readContract } from "@/lib/chain";

const KINDS = ["Water", "Medical", "Power", "Shelter", "Transport", "Other"] as const;
const gl = globalThis as unknown as { __ssalerts?: boolean };

function ensure() {
  if (gl.__ssalerts) return;
  db.exec(`
    CREATE TABLE IF NOT EXISTS alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      kind TEXT NOT NULL,
      note TEXT NOT NULL,
      ts INTEGER NOT NULL
    );
  `);
  gl.__ssalerts = true;
}

export async function GET() {
  const g = await guard();
  if ("res" in g) return g.res;
  ensure();
  const alerts = db
    .prepare("SELECT id, username, kind, note, ts FROM alerts WHERE ts > ? ORDER BY id DESC LIMIT 10")
    .all(Date.now() - 24 * 3600 * 1000);
  return NextResponse.json({ alerts });
}

export async function POST(req: Request) {
  const g = await guard();
  if ("res" in g) return g.res;
  ensure();
  const parsed = z
    .object({ kind: z.enum(KINDS), note: z.string().trim().max(140) })
    .safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  // Only verified, non-blacklisted members can broadcast (same Sybil defense as borrowing).
  try {
    const c = readContract();
    const role = await c.VERIFIED_ROLE();
    const [ok, banned] = await Promise.all([c.hasRole(role, g.s.address), c.blacklisted(g.s.address)]);
    if (!ok || banned) {
      audit(g.s.username, "FORBIDDEN", "tried to send an alert while unverified or blacklisted");
      return NextResponse.json({ error: "Only verified members can send alerts" }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: "Blockchain node not reachable" }, { status: 503 });
  }

  const last = db.prepare("SELECT ts FROM alerts WHERE username = ? ORDER BY id DESC LIMIT 1").get(g.s.username);
  if (last && Date.now() - Number(last.ts) < 60_000)
    return NextResponse.json({ error: "Please wait a minute before sending another alert" }, { status: 429 });

  const { kind, note } = parsed.data;
  db.prepare("INSERT INTO alerts (username, kind, note, ts) VALUES (?, ?, ?, ?)").run(g.s.username, kind, note, Date.now());
  audit(g.s.username, "ALERT_SENT", kind);
  return NextResponse.json({ ok: true }, { status: 201 });
}