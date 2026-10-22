import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { db } from "@/lib/db";
import { guard } from "@/lib/guard";
import { MIME, UPLOAD_DIR, ensureSchema } from "@/lib/resources";

export async function GET(req: Request) {
  const g = await guard();
  if ("res" in g) return g.res;
  ensureSchema();
  const id = Number(new URL(req.url).searchParams.get("id"));
  const row = Number.isInteger(id) ? db.prepare("SELECT image_file FROM resources WHERE chain_id = ?").get(id) : undefined;
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const ext = path.extname(row.image_file).slice(1) as keyof typeof MIME;
  try {
    const buf = fs.readFileSync(path.join(UPLOAD_DIR, row.image_file));
    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": MIME[ext] ?? "application/octet-stream",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}