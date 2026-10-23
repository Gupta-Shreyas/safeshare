import initSqlJs, { Database as SqlDb } from "sql.js";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import os from "os";
import { walletFor } from "./chain";

// Vercel serverless functions are read-only except for os.tmpdir() (/tmp)
const isServerless = !!process.env.VERCEL || process.env.NODE_ENV === "production";
const dir = isServerless ? path.join(os.tmpdir(), "safeshare") : path.join(process.cwd(), "data");
const file = path.join(dir, "safeshare.db");

try {
  fs.mkdirSync(dir, { recursive: true });
} catch {
  // Directory already exists
}

type Param = string | number | null;

export interface Db {
  exec(sql: string): void;
  prepare(sql: string): {
    get(...p: Param[]): any;
    all(...p: Param[]): any[];
    run(...p: Param[]): { changes: number; lastInsertRowid: number };
  };
}

function wrap(sdb: SqlDb): Db {
  const persist = () => {
    try {
      const data = Buffer.from(sdb.export());
      const tmp = file + ".tmp";
      fs.writeFileSync(tmp, data);
      fs.renameSync(tmp, file);
    } catch {
      // Handle temporary disk edge cases
    }
  };
  return {
    exec(sql) {
      sdb.exec(sql);
      persist();
    },
    prepare(sql) {
      return {
        get(...p) {
          const st = sdb.prepare(sql);
          try {
            st.bind(p);
            return st.step() ? st.getAsObject() : undefined;
          } finally {
            st.free();
          }
        },
        all(...p) {
          const st = sdb.prepare(sql);
          const rows: any[] = [];
          try {
            st.bind(p);
            while (st.step()) rows.push(st.getAsObject());
          } finally {
            st.free();
          }
          return rows;
        },
        run(...p) {
          const st = sdb.prepare(sql);
          try {
            st.bind(p);
            st.step();
          } finally {
            st.free();
          }
          const changes = sdb.getRowsModified();
          const id = Number(sdb.exec("SELECT last_insert_rowid()")[0].values[0][0]);
          persist();
          return { changes, lastInsertRowid: id };
        },
      };
    },
  };
}

async function getWasmBinary(): Promise<Buffer> {
  // Check public folder
  const pubPath = path.join(process.cwd(), "public", "sql-wasm.wasm");
  if (fs.existsSync(pubPath)) {
    return fs.readFileSync(pubPath);
  }
  // Check node_modules
  const nmPath = path.join(process.cwd(), "node_modules", "sql.js", "dist", "sql-wasm.wasm");
  if (fs.existsSync(nmPath)) {
    return fs.readFileSync(nmPath);
  }
  // Fallback to fetching via network
  const res = await fetch("https://sql.js.org/dist/sql-wasm.wasm");
  const ab = await res.arrayBuffer();
  return Buffer.from(ab);
}

async function init(): Promise<Db> {
  const wasmBinary = await getWasmBinary();
  const SQL = await initSqlJs({ wasmBinary });
  const sdb = fs.existsSync(file) ? new SQL.Database(fs.readFileSync(file)) : new SQL.Database();
  const db = wrap(sdb);

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      account_index INTEGER UNIQUE NOT NULL,
      address TEXT NOT NULL,
      failed_attempts INTEGER NOT NULL DEFAULT 0,
      locked_until INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ts INTEGER NOT NULL,
      actor TEXT NOT NULL,
      action TEXT NOT NULL,
      detail TEXT NOT NULL DEFAULT '',
      ip TEXT NOT NULL DEFAULT ''
    );
  `);

  const admin = db.prepare("SELECT 1 AS x FROM users WHERE role = 'admin'").get();
  if (!admin) {
    db.prepare(
      "INSERT INTO users (username, email, password_hash, role, account_index, address, created_at) VALUES (?, ?, ?, 'admin', 0, ?, ?)"
    ).run("admin", "admin@safeshare.local", bcrypt.hashSync("Admin@12345", 10), walletFor(0).address, Date.now());
  }
  return db;
}

const g = globalThis as unknown as { __ssdbp?: Promise<Db> };
export const db: Db = await (g.__ssdbp ??= init().catch((e) => {
  g.__ssdbp = undefined;
  throw e;
}));

export function audit(actor: string, action: string, detail = "", ip = "") {
  db.prepare("INSERT INTO audit_log (ts, actor, action, detail, ip) VALUES (?, ?, ?, ?, ?)").run(
    Date.now(), actor, action, detail, ip
  );
}