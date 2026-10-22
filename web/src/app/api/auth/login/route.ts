import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db, audit } from "@/lib/db";
import { createSession } from "@/lib/auth";

const schema = z.object({ username: z.string().min(1).max(64), password: z.string().min(1).max(72) });
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 10);
const MAX_ATTEMPTS = 5;
const LOCK_MS = 5 * 60 * 1000;

type UserRow = { id: number; username: string; role: string; password_hash: string; failed_attempts: number; locked_until: number };

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for") ?? "local";
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid username or password" }, { status: 400 });
  const { username, password } = parsed.data;

  const u = db.prepare("SELECT * FROM users WHERE username = ?").get(username) as UserRow | undefined;
  const now = Date.now();

  if (u && u.locked_until > now) {
    audit(username, "LOGIN_BLOCKED_LOCKED", "", ip);
    const mins = Math.ceil((u.locked_until - now) / 60000);
    return NextResponse.json({ error: `Too many attempts. Account locked for ${mins} more minute(s).` }, { status: 429 });
  }

  // Always run a hash comparison so response time does not reveal whether the username exists.
  const ok = await bcrypt.compare(password, u ? u.password_hash : DUMMY_HASH);

  if (!u || !ok) {
    if (u) {
      const attempts = u.failed_attempts + 1;
      if (attempts >= MAX_ATTEMPTS) {
        db.prepare("UPDATE users SET failed_attempts = 0, locked_until = ? WHERE id = ?").run(now + LOCK_MS, u.id);
        audit(username, "ACCOUNT_LOCKED", `after ${attempts} failed attempts`, ip);
      } else {
        db.prepare("UPDATE users SET failed_attempts = ? WHERE id = ?").run(attempts, u.id);
      }
    }
    audit(username, "LOGIN_FAILED", "", ip);
    return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
  }

  db.prepare("UPDATE users SET failed_attempts = 0, locked_until = 0 WHERE id = ?").run(u.id);
  await createSession(u.id);
  audit(username, "LOGIN_OK", "", ip);
  return NextResponse.json({ ok: true, username: u.username, role: u.role });
}