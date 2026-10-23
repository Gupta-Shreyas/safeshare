"use client";
import { useCallback, useEffect, useState } from "react";
import { api, shortAddr, timeAgo } from "@/lib/client";

type U = { id: number; username: string; email: string; role: string; address: string; verified: boolean; blacklisted: boolean; credits: number };
type L = { id: number; ts: number; actor: string; action: string; detail: string; ip: string };

export default function AdminPanel() {
  const [users, setUsers] = useState<U[]>([]);
  const [logs, setLogs] = useState<L[]>([]);
  const [paused, setPaused] = useState(false);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState("");

  const load = useCallback(async () => {
    const [u, l, c] = await Promise.all([api("/api/admin/users"), api("/api/admin/audit"), api("/api/chain/status")]);
    if (u.ok) setUsers(u.data.users);
    if (l.ok) setLogs(l.data.logs);
    if (c.ok) setPaused(c.data.paused);
    if (!u.ok) setMsg(u.data.error ?? "Failed to load users");
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function act(key: string, path: string, body: unknown) {
    setBusy(key);
    setMsg("");
    const r = await api(path, "POST", body);
    setMsg(r.ok ? `Done. Transaction ${r.data.txHash}` : `Blocked: ${r.data.error}`);
    await load();
    setBusy("");
  }

  const btn = "rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-40";

  return (<div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-bold">Admin panel</h1>
        <p className="text-sm text-muted">Verification, blacklist and emergency pause are written to the blockchain.</p>
      </div>

      <button
        disabled={busy === "pause"}
        onClick={() => act("pause", "/api/admin/pause", { paused: !paused })}
        className={`w-full rounded-xl py-3 text-sm font-bold text-white active:scale-95 disabled:opacity-50 ${paused ? "bg-emerald-600" : "bg-primary shadow-glow"}`}
      >
        {paused ? "Resume system (unpause contract)" : "Emergency pause (freeze contract)"}
      </button>
      {paused && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">The contract is paused. No one can register, request or check out.</p>}
      {msg && <p className="break-all rounded-xl bg-white p-3 text-sm shadow-card">{msg}</p>}

      <section className="space-y-3">
        <h2 className="font-semibold">Users (status read live from the blockchain)</h2>
        {users.map((u) => (
          <div key={u.id} className="space-y-3 rounded-2xl bg-white p-4 shadow-card">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-bold">{u.username} <span className="ml-1 rounded bg-stone-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-muted">{u.role}</span></p>
                <p className="truncate text-xs text-muted">{u.email}</p>
                <p className="font-mono text-[11px] text-muted">{shortAddr(u.address)} - {u.credits} credits</p>
              </div>
              <span className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${u.blacklisted ? "bg-red-50 text-red-700" : u.verified ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                {u.blacklisted ? "Blacklisted" : u.verified ? "Verified" : "Pending"}
              </span>
            </div>
            <div className="flex gap-2">
              {!u.verified && (
                <button disabled={!!busy} onClick={() => act("v" + u.id, "/api/admin/verify", { username: u.username })} className={`${btn} bg-primary text-white`}>
                  Verify on-chain
                </button>
              )}
              {u.role !== "admin" && (
                <button disabled={!!busy} onClick={() => act("b" + u.id, "/api/admin/blacklist", { username: u.username, status: !u.blacklisted })} className={`${btn} bg-stone-100 text-ink`}>
                  {u.blacklisted ? "Unblacklist" : "Blacklist"}
                </button>
              )}
            </div>
          </div>
        ))}
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Security audit log</h2>
          <button onClick={load} className={`${btn} bg-stone-100 text-ink`}>Refresh</button>
        </div>
        {logs.map((l) => (
          <div key={l.id} className="rounded-xl bg-white p-3 text-xs shadow-card">
            <div className="flex justify-between">
              <b className={/FAILED|LOCKED|FORBIDDEN|BLOCKED/.test(l.action) ? "text-red-600" : ""}>{l.action}</b>
              <span className="text-muted">{timeAgo(l.ts)}</span>
            </div>
            <p className="text-muted">{l.actor}</p>
            {l.detail && <p className="break-all font-mono text-[11px]">{l.detail}</p>}
          </div>
        ))}
      </section>
    </div>
  );
}