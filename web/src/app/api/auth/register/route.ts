import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db, audit } from "@/lib/db";
import { walletFor } from "@/lib/chain";

const schema = z.object({
  username: z.string().regex(/^[a-zA-Z0-9_]{3,24}$/),
  email: z.string().email().max(100),
  password: z.string().min(8).max(72).regex(/[A-Z]/).regex(/[a-z]/).regex(/[0-9]/),
});

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for") ?? "local";
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Username: 3-24 letters, numbers or _. Valid email. Password: 8+ chars with upper, lower and a number." },
      { status: 400 }
    );
  }
  const { username, password } = parsed.data;
  const email = parsed.data.email.toLowerCase();

  const exists = db.prepare("SELECT 1 FROM users WHERE username = ? OR email = ?").get(username, email);
  if (exists) return NextResponse.json({ error: "Username or email already in use" }, { status: 409 });

  const row = db.prepare("SELECT MAX(account_index) AS m FROM users").get() as { m: number | null };
  const idx = (row.m ?? 0) + 1;
  if (idx > 19) return NextResponse.json({ error: "Demo is full (19 accounts)" }, { status: 503 });

  const address = walletFor(idx).address;
  const hash = await bcrypt.hash(password, 10);
  db.prepare(
    "INSERT INTO users (username, email, password_hash, role, account_index, address, created_at) VALUES (?, ?, ?, 'user', ?, ?, ?)"
  ).run(username, email, hash, idx, address, Date.now());

  audit(username, "REGISTER", address, ip);
  return NextResponse.json({ ok: true, username, address }, { status: 201 });
}