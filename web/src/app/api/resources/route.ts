import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { z } from "zod";
import { ethers } from "ethers";
import { db, audit } from "@/lib/db";
import { guard, chainError } from "@/lib/guard";
import { contractFor, readContract } from "@/lib/chain";
import { CATEGORIES, UPLOAD_DIR, ensureSchema, metaHash, sniffImage } from "@/lib/resources";
import { trustScore, Stats } from "@/lib/trust";

const ZERO = "0x0000000000000000000000000000000000000000";

const toStats = (st: any): Stats => ({
  completed: Number(st.completed), onTime: Number(st.onTime), damaged: Number(st.damaged),
  disputesLost: Number(st.disputesLost), lent: Number(st.lent), careCount: Number(st.careCount), careSum: Number(st.careSum),
});

export async function GET() {
  const g = await guard();
  if ("res" in g) return g.res;
  ensureSchema();
  try {
    const c = readContract();
    const count = Number(await c.resourceCount());
    const names = new Map<string, string>();
    for (const u of db.prepare("SELECT username, address FROM users").all()) names.set(String(u.address).toLowerCase(), u.username);
    const who = (a: string) => (a === ZERO ? null : { address: a, name: names.get(a.toLowerCase()) ?? "unknown" });

    const items: object[] = [];
    for (let id = count; id >= 1; id--) {
      const r = await c.resources(id);
      const row = db.prepare("SELECT * FROM resources WHERE chain_id = ?").get(id);

      // Integrity: recompute both hashes from what the server holds and compare with the chain.
      let metaOk = false;
      let imgOk = false;
      if (row) {
        metaOk = metaHash(row) === r.metadataHash;
        const f = path.join(UPLOAD_DIR, row.image_file);
        imgOk = fs.existsSync(f) && ethers.keccak256(fs.readFileSync(f)) === r.imageHash;
      }

      let borrowerTrust = null;
      if (r.borrower !== ZERO) borrowerTrust = trustScore(toStats(await c.stats(r.borrower)));

      items.push({
        id,
        title: row?.title ?? "(details missing)",
        category: row?.category ?? "",
        description: row?.description ?? "",
        location: row?.location ?? "",
        owner: who(r.owner),
        borrower: who(r.borrower),
        borrowerTrust,
        deposit: Number(r.deposit),
        condition: Number(r.condition),
        conditionBefore: Number(r.conditionBefore),
        durationHours: Number(r.durationSecs) / 3600,
        dueDate: Number(r.dueDate),
        status: Number(r.status),
        integrity: { metadata: metaOk, image: imgOk },
      });
    }
    return NextResponse.json({ me: g.s.address, role: g.s.role, items });
  } catch {
    return NextResponse.json({ error: "Blockchain node not reachable" }, { status: 503 });
  }
}

const schema = z.object({
  title: z.string().trim().min(3).max(80),
  category: z.enum(CATEGORIES),
  description: z.string().trim().min(5).max(500),
  location: z.string().trim().min(2).max(80),
  deposit: z.coerce.number().int().min(1).max(100),
  condition: z.coerce.number().int().min(1).max(5),
});

export async function POST(req: Request) {
  const g = await guard();
  if ("res" in g) return g.res;
  ensureSchema();

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const parsed = schema.safeParse(Object.fromEntries(form.entries()));
  if (!parsed.success)
    return NextResponse.json(
      { error: "Check the form: title 3-80 chars, description 5-500, deposit 1-100, condition 1-5, valid category." },
      { status: 400 }
    );

  const photo = form.get("photo");
  if (!(photo instanceof File) || photo.size === 0) return NextResponse.json({ error: "A photo is required" }, { status: 400 });
  if (photo.size > 2 * 1024 * 1024) return NextResponse.json({ error: "Photo must be under 2 MB" }, { status: 400 });
  const bytes = new Uint8Array(await photo.arrayBuffer());
  const ext = sniffImage(bytes);
  if (!ext) return NextResponse.json({ error: "Photo must be a real JPG, PNG or WebP image" }, { status: 400 });

  const m = parsed.data;
  const imageHash = ethers.keccak256(bytes);
  try {
    const c = contractFor(g.s.idx);
    const tx = await c.registerResource(metaHash(m), imageHash, m.deposit, m.condition);
    const rc = await tx.wait();

    let id = 0;
    for (const log of rc.logs) {
      try {
        const p = c.interface.parseLog(log);
        if (p?.name === "ResourceRegistered") id = Number(p.args.id);
      } catch {}
    }
    if (!id) id = Number(await c.resourceCount());

    const file = `${imageHash.slice(2)}.${ext}`;
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    fs.writeFileSync(path.join(UPLOAD_DIR, file), bytes);
    db.prepare(
      "INSERT INTO resources (chain_id, owner_username, title, category, description, location, image_file, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(id, g.s.username, m.title, m.category, m.description, m.location, file, Date.now());

    audit(g.s.username, "RESOURCE_REGISTERED", `#${id} tx=${tx.hash}`);
    return NextResponse.json({ ok: true, id, txHash: tx.hash }, { status: 201 });
  } catch (e) {
    audit(g.s.username, "CHAIN_BLOCKED", `register: ${chainError(e)}`);
    return NextResponse.json({ error: chainError(e) }, { status: 400 });
  }
}