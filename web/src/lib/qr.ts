import crypto from "crypto";

type Kind = "checkout" | "return";
type Payload = { r: number; k: Kind; b: string; exp: number };

function key(): string {
  const k = process.env.QR_SIGNING_SECRET;
  if (!k) throw new Error("QR_SIGNING_SECRET is not set");
  return k;
}
const sign = (data: string) => crypto.createHmac("sha256", key()).update(data).digest("base64url");

export function makeToken(resourceId: number, kind: Kind, borrower: string, ttlSec = 600): string {
  const payload: Payload = {
    r: resourceId,
    k: kind,
    b: borrower.toLowerCase(),
    exp: Math.floor(Date.now() / 1000) + ttlSec,
  };
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${data}.${sign(data)}`;
}

// Returns an error message, or null when the token is valid.
export function checkToken(token: string, resourceId: number, kind: Kind, borrower: string): string | null {
  const [data, sig] = token.trim().split(".");
  if (!data || !sig) return "Malformed QR code";
  const a = Buffer.from(sig);
  const b = Buffer.from(sign(data));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return "QR signature invalid (forged or tampered)";
  let p: Payload;
  try {
    p = JSON.parse(Buffer.from(data, "base64url").toString());
  } catch {
    return "Malformed QR code";
  }
  if (p.exp < Date.now() / 1000) return "QR code expired";
  if (p.r !== resourceId || p.k !== kind) return "QR code is for a different item or step";
  if (p.b !== borrower.toLowerCase()) return "QR code was not issued to this borrower";
  return null;
}