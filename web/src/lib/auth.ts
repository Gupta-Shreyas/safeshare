import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { db } from "./db";

const COOKIE = "ss_session";
const secret = () => new TextEncoder().encode(process.env.JWT_SECRET);

export type Session = { uid: number; username: string; role: "admin" | "user"; idx: number; address: string };

export async function createSession(uid: number) {
  const token = await new SignJWT({ uid })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("2h")
    .sign(secret());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,                 // JavaScript cannot read it (XSS cannot steal it)
    sameSite: "strict",             // not sent on cross-site requests (CSRF defense)
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 2,
  });
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

// Role and account are re-read from the DB on every request, so a changed role takes effect immediately.
export async function getSession(): Promise<Session | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    const row = db
      .prepare("SELECT id, username, role, account_index, address FROM users WHERE id = ?")
      .get(payload.uid as number) as
      | { id: number; username: string; role: "admin" | "user"; account_index: number; address: string }
      | undefined;
    if (!row) return null;
    return { uid: row.id, username: row.username, role: row.role, idx: row.account_index, address: row.address };
  } catch {
    return null;
  }
}