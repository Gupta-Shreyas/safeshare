"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client";

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

  useEffect(() => { load(); }, [load]);

  async function act(key: string, path: string, body: unknown) {
    setBusy(key);
    setMsg("");
    const r = await api(path, "POST", body);
    setMsg(r.ok ? `Done. Transaction ${r.data.txHash}` : `Blocked: ${r.data.error}`);
    await load();
    setBusy("");
  }

  const btn = "rounded-md px-3 py-1 text-xs font-medium disabled:opacity-40";

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin panel</h1>
        <button
          disabled={busy === "pause"}
          onClick={() => act("pause", "/api/admin/pause", { paused: !paused })}
          className={`${btn} ${paused ? "bg-emerald-600" : "bg-red-600"} text-sm`}
        >
          {paused ? "Resume system (unpause contract)" : "Emergency pause (freeze contract)"}
        </button>
      </div>
      {paused && <p className="rounded-lg bg-red-950 text-red-300 p-3">The contract is paused. No one can register, request or check out.</p>}
      {msg && <p className="rounded-lg bg-slate-900 border border-slate-700 p-3 text-sm break-all">{msg}</p>}

      <section>
        <h2 className="font-semibold mb-2">Users (status read live from the blockchain)</h2>
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-sm">
            <thead className="bg-slate-900 text-slate-400 text-left">
              <tr>
                <th className="p-3">User</th><th>Role</th><th>Address</th><th>Verified</th><th>Credits</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-slate-800">
                  <td className="p-3">{u.username}<div className="text-xs text-slate-500">{u.email}</div></td>
                  <td>{u.role}</td>
                  <td className="font-mono text-xs">{u.address.slice(0, 8)}...{u.address.slice(-6)}</td>
                  <td>
                    {u.blacklisted ? <span className="text-red-400">Blacklisted</span> : u.verified ? <span className="text-emerald-400">Verified</span> : <span className="text-amber-400">Pending</span>}
                  </td>
                  <td>{u.credits}</td>
                  <td className="space-x-2">
                    {!u.verified && (
                      <button disabled={!!busy} onClick={() => act("v" + u.id, "/api/admin/verify", { username: u.username })} className={`${btn} bg-emerald-600`}>
                        Verify on-chain
                      </button>
                    )}
                    {u.role !== "admin" && (
                      <button disabled={!!busy} onClick={() => act("b" + u.id, "/api/admin/blacklist", { username: u.username, status: !u.blacklisted })} className={`${btn} bg-slate-700`}>
                        {u.blacklisted ? "Unblacklist" : "Blacklist"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold">Security audit log</h2>
          <button onClick={load} className={`${btn} bg-slate-800`}>Refresh</button>
        </div>
        <div className="overflow-x-auto rounded-xl border border-slate-800 max-h-96 overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-900 text-slate-400 text-left sticky top-0">
              <tr><th className="p-2">Time</th><th>Actor</th><th>Action</th><th>Detail</th></tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id} className="border-t border-slate-800">
                  <td className="p-2 whitespace-nowrap">{new Date(l.ts).toLocaleTimeString()}</td>
                  <td>{l.actor}</td>
                  <td className={/FAILED|LOCKED|FORBIDDEN|BLOCKED/.test(l.action) ? "text-red-400" : ""}>{l.action}</td>
                  <td className="font-mono break-all">{l.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}