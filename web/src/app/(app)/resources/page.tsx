"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client";

type Party = { address: string; name: string } | null;
type Item = {
  id: number; title: string; category: string; description: string; location: string;
  owner: Party; borrower: Party; borrowerTrust: { score: number; label: string } | null;
  deposit: number; condition: number; conditionBefore: number; durationHours: number; dueDate: number; status: number;
  integrity: { metadata: boolean; image: boolean };
};

const STATUS = ["Available", "Requested", "Approved", "Checked out", "Return pending", "Disputed", "Retired"];
const COLOR = ["text-emerald-400", "text-amber-400", "text-sky-400", "text-violet-400", "text-orange-400", "text-red-400", "text-slate-500"];
const COND = ["", "Poor", "Fair", "Good", "Very good", "Like new"];

export default function ResourcesPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [me, setMe] = useState("");
  const [role, setRole] = useState("user");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const r = await api("/api/resources");
    if (r.ok) {
      setItems(r.data.items);
      setMe(r.data.me);
      setRole(r.data.role);
      setErr("");
    } else setErr(r.data.error ?? "Failed to load");
    setLoaded(true);
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 6000);
    return () => clearInterval(t);
  }, [load]);

  async function run(id: number, body: Record<string, unknown>) {
    setMsg("Sending transaction...");
    const r = await api("/api/resources/action", "POST", { id, ...body });
    setMsg(r.ok ? `Done. Transaction ${r.data.txHash}` : `Blocked: ${r.data.error}`);
    await load();
    return r.ok;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Community resources</h1>
        <Link href="/resources/new" className="rounded-lg bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-sm font-semibold">
          Add a resource
        </Link>
      </div>
      {err && <p className="rounded-lg bg-red-950 text-red-300 p-3">{err}</p>}
      {msg && <p className="rounded-lg bg-slate-900 border border-slate-700 p-3 text-sm break-all">{msg}</p>}
      {loaded && !err && items.length === 0 && <p className="text-slate-400">No resources yet. Add the first one.</p>}
      <div className="grid gap-5 md:grid-cols-2">
        {items.map((it) => (
          <Card key={it.id} it={it} me={me} role={role} run={(b) => run(it.id, b)} flash={setMsg} />
        ))}
      </div>
    </div>
  );
}

function Card({
  it, me, role, run, flash,
}: {
  it: Item; me: string; role: string;
  run: (b: Record<string, unknown>) => Promise<boolean>;
  flash: (m: string) => void;
}) {
  const lc = (a?: string) => (a ?? "").toLowerCase();
  const mine = !!it.owner && lc(it.owner.address) === lc(me);
  const borrowing = !!it.borrower && lc(it.borrower.address) === lc(me);

  const [hours, setHours] = useState(24);
  const [token, setToken] = useState("");
  const [cond, setCond] = useState(3);
  const [care, setCare] = useState(5);
  const [pct, setPct] = useState(50);
  const [qr, setQr] = useState<{ token: string; qr: string } | null>(null);

  async function go(b: Record<string, unknown>) {
    if (await run(b)) {
      setToken("");
      setQr(null);
    }
  }
  async function showQr(kind: "checkout" | "return") {
    const r = await api(`/api/resources/qr?id=${it.id}&kind=${kind}`);
    if (r.ok) setQr(r.data);
    else flash(`Blocked: ${r.data.error}`);
  }

  const btn = "rounded-md px-3 py-1.5 text-xs font-medium disabled:opacity-40";
  const field = "rounded-md bg-slate-900 border border-slate-700 px-2 py-1 text-sm";
  const intact = it.integrity.metadata && it.integrity.image;
  const st = it.status;

  const condSelect = (v: number, set: (n: number) => void) => (
    <select className={field} value={v} onChange={(e) => set(Number(e.target.value))}>
      {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} - {COND[n]}</option>)}
    </select>
  );

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden">
      <img src={`/api/resources/image?id=${it.id}`} alt={it.title} className="h-44 w-full object-cover bg-slate-900" />
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold">{it.title}</h2>
            <p className="text-xs text-slate-400">#{it.id} - {it.category} - {it.location}</p>
          </div>
          <span className={`text-sm font-semibold whitespace-nowrap ${COLOR[st]}`}>{STATUS[st]}</span>
        </div>
        <p className="text-sm text-slate-300">{it.description}</p>
        <p className="text-xs text-slate-400">
          Owner: <b>{it.owner?.name}</b> - Deposit: <b>{it.deposit} credits</b> - Condition: <b>{COND[it.condition]}</b>
        </p>
        <p className={`text-xs ${intact ? "text-emerald-400" : "text-red-400 font-semibold"}`}>
          {intact ? "Integrity verified: details and photo match the on-chain hashes" : "TAMPERED: details or photo do not match the blockchain"}
        </p>

        {it.borrower && st >= 1 && st <= 5 && (
          <p className="text-xs text-slate-400">
            Borrower: <b>{it.borrower.name}</b>
            {it.borrowerTrust && <> - Trust {it.borrowerTrust.score}/100 ({it.borrowerTrust.label})</>}
            {it.durationHours > 0 && <> - {it.durationHours} h requested</>}
            {(st === 3 || st === 4) && it.dueDate > 0 && <> - Due {new Date(it.dueDate * 1000).toLocaleString()}</>}
            {st >= 3 && it.conditionBefore > 0 && <> - Condition at checkout: {COND[it.conditionBefore]}</>}
          </p>
        )}

        <div className="space-y-2 pt-1">
          {st === 0 && !mine && (
            <div className="flex items-center gap-2">
              <input type="number" min={1} max={720} value={hours} onChange={(e) => setHours(Number(e.target.value))} className={`${field} w-20`} />
              <span className="text-xs text-slate-400">hours</span>
              <button onClick={() => go({ action: "request", durationHours: hours })} className={`${btn} bg-emerald-600`}>Request to borrow</button>
            </div>
          )}
          {st === 0 && mine && <button onClick={() => go({ action: "retire" })} className={`${btn} bg-slate-700`}>Retire resource</button>}

          {st === 1 && mine && (
            <div className="space-x-2">
              <button onClick={() => go({ action: "approve" })} className={`${btn} bg-emerald-600`}>Approve</button>
              <button onClick={() => go({ action: "reject" })} className={`${btn} bg-slate-700`}>Reject</button>
            </div>
          )}
          {(st === 1 || st === 2) && borrowing && <button onClick={() => go({ action: "cancel" })} className={`${btn} bg-slate-700`}>Cancel request</button>}

          {st === 2 && borrowing && <button onClick={() => showQr("checkout")} className={`${btn} bg-sky-600`}>Show my checkout QR</button>}
          {st === 2 && mine && (
            <div className="space-y-2 rounded-lg border border-slate-800 p-3">
              <p className="text-xs text-slate-400">At handover: enter the item's condition and the borrower's QR code.</p>
              {condSelect(cond, setCond)}
              <textarea className={`${field} w-full font-mono text-xs`} rows={2} placeholder="Paste the borrower's QR code text" value={token} onChange={(e) => setToken(e.target.value)} />
              <button onClick={() => go({ action: "checkout", conditionBefore: cond, token })} className={`${btn} bg-emerald-600`}>Confirm checkout</button>
            </div>
          )}

          {st === 3 && borrowing && <button onClick={() => go({ action: "return" })} className={`${btn} bg-violet-600`}>Start return</button>}
          {(st === 3 || st === 4) && borrowing && <button onClick={() => showQr("return")} className={`${btn} bg-sky-600`}>Show my return QR</button>}
          {(st === 3 || st === 4) && mine && (
            <div className="space-y-2 rounded-lg border border-slate-800 p-3">
              <p className="text-xs text-slate-400">On return: rate the condition now and the borrower's care, then enter their QR code.</p>
              <div className="flex gap-2 items-center">
                {condSelect(cond, setCond)}
                <span className="text-xs text-slate-400">care</span>
                {condSelect(care, setCare)}
              </div>
              <textarea className={`${field} w-full font-mono text-xs`} rows={2} placeholder="Paste the borrower's return QR code text" value={token} onChange={(e) => setToken(e.target.value)} />
              <button onClick={() => go({ action: "confirmReturn", conditionAfter: cond, careRating: care, token })} className={`${btn} bg-emerald-600`}>Confirm return</button>
            </div>
          )}
          {(st === 3 || st === 4) && (mine || borrowing) && (
            <button onClick={() => go({ action: "dispute" })} className={`${btn} bg-red-700`}>Raise dispute</button>
          )}

          {st === 5 && role === "admin" && (
            <div className="space-y-2 rounded-lg border border-red-900 p-3">
              <p className="text-xs text-slate-400">Admin resolution: refund {pct}% of the deposit to the borrower.</p>
              <input type="range" min={0} max={100} value={pct} onChange={(e) => setPct(Number(e.target.value))} className="w-full" />
              <button onClick={() => go({ action: "resolve", refundPercent: pct })} className={`${btn} bg-red-600`}>Resolve dispute</button>
            </div>
          )}
          {st === 5 && role !== "admin" && <p className="text-xs text-red-300">Waiting for an admin to resolve this dispute.</p>}
        </div>

        {qr && (
          <div className="rounded-lg border border-slate-800 p-3 space-y-2">
            <img src={qr.qr} alt="QR code" className="h-40 w-40 rounded bg-white p-1" />
            <p className="text-xs text-slate-400">Valid for 10 minutes. On a single laptop, copy this text into the owner's confirm box:</p>
            <textarea readOnly rows={2} value={qr.token} className={`${field} w-full font-mono text-xs`} onFocus={(e) => e.currentTarget.select()} />
          </div>
        )}
      </div>
    </div>
  );
}