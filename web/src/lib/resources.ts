import fs from "fs";
import path from "path";
import { ethers } from "ethers";
import { db } from "./db";

export const UPLOAD_DIR = path.join(process.cwd(), "data", "uploads");
export const CATEGORIES = ["Power", "Water", "Medical", "Shelter", "Transport", "Tools", "Other"] as const;
export const MIME = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" } as const;

export type Meta = { title: string; category: string; description: string; location: string };

const g = globalThis as unknown as { __ssres?: boolean };

// Creates the off-chain table for resource details (the chain only stores hashes of them).
export function ensureSchema() {
  if (g.__ssres) return;
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  db.exec(`
    CREATE TABLE IF NOT EXISTS resources (
      chain_id INTEGER PRIMARY KEY,
      owner_username TEXT NOT NULL,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      location TEXT NOT NULL,
      image_file TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);
  g.__ssres = true;
}

// The same field order is used at registration and at verification, so the hashes match.
export function metaHash(m: Meta): string {
  return ethers.keccak256(
    ethers.toUtf8Bytes(
      JSON.stringify({ title: m.title, category: m.category, description: m.description, location: m.location })
    )
  );
}

// Check the real file signature (magic bytes), not the file name or the browser's claimed type.
export function sniffImage(b: Uint8Array): "jpg" | "png" | "webp" | null {
  if (b.length > 12 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpg";
  if (b.length > 12 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "png";
  if (b.length > 12 && String.fromCharCode(...b.slice(0, 4)) === "RIFF" && String.fromCharCode(...b.slice(8, 12)) === "WEBP")
    return "webp";
  return null;
}