"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client";
import { Icon } from "@/components/Icon";
import EmptyState from "@/components/EmptyState";

type Party = { address: string; name: string } | null;
type Item = {
  id: number; title: string; category: string; description: string; location: string;
  owner: Party; borrower: Party; borrowerTrust: { score: number; label: string } | null;
  deposit: number; condition: number; conditionBefore: number; durationHours: number; dueDate: number; status: number;
  integrity: { metadata: boolean; image: boolean };
};

const STATUS = ["Available", "Requested", "Approved", "Checked out", "Return pending", "Disputed", "Retired"];
const CHIP = [
  "bg-yellow/30 text-navy", "bg-orange/15 text-orange-deep", "bg-navy/10 text-navy", "bg-navy text-sand-light",
  "bg-orange text-navy", "bg-red text-white", "bg-stone-200 text-stone-500",
];
const COND = ["", "Poor", "Fair", "Good", "Very good", "Like new"];
const FILTERS = ["All", "Available", "Mine", "Borrowing"] as const;
const lc = (a?: string) => (a ?? "").toLowerCase();

export default function ResourcesPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [me, setMe] = useState("");
  const [role, setRole] = useState("user");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");

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
    const t = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, 8000);
    return () => clearInterval(t);
  }, [load]);

  async function run(id: number, body: Record<string, unknown>) {
    setMsg("Sending transaction...");
    const r = await api("/api/resources/action", "POST", { id, ...body });
    setMsg(r.ok ? `Done. Transaction ${r.data.txHash}` : `Blocked: ${r.data.error}`);
    await load();
    return r.ok;
  }

  const shown = items.filter((it) =>
    filter === "All"
      ? true
      : filter === "Available"
      ? it.status === 0
      : filter === "Mine"
      ? lc(it.owner?.address) === lc(me)
      : lc(it.borrower?.address) === lc(me) && it.status >= 1 && it.status <= 5
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Community resources</h1>
        <Link href="/resources/new" className="flex items-center gap-1 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-white shadow-glow active:scale-95">
          <Icon name="plus" size={16} /> Add
        </Link>
      </div>

      <div className="no-scrollbar flex gap-2 overflow-x-auto">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-semibold ${filter === f ? "bg-primary text-white" : "bg-white text-muted shadow-card"}`}
          >
            {f}
          </button>
        ))}
      </div>

      {err && <p className="rounded-2xl bg-red-50 p-3 text-red-700">{err}</p>}
      {msg && <p className="break-all rounded-2xl bg-white p-3 text-sm shadow-card">{msg}</p>}
      {loaded && !err && shown.length === 0 && <EmptyState title="Nothing here yet" text="No items match this view. Register one to get your community started." href="/resources/new" cta="Register an item" />}

      <div className="grid items-start gap-5 md:grid-cols-2 xl:grid-cols-3">
        {shown.map((it) => (
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
  const mine = !!it.owner && lc(it.owner.address) === lc(me);
  const borrowing = !!it.borrower && lc(it.borrower.address) === lc(me);
  const [hours, setHours] = useState(24);
  const [pct, setPct] = useState(50);
  const [qr, setQr] = useState<{ token: string; qr: string; kind: string } | null>(null);

  async function go(b: Record<string, unknown>) {
    if (await run(b)) setQr(null);
  }
  async function showQr(kind: "checkout" | "return") {
    const r = await api(`/api/resources/qr?id=${it.id}&kind=${kind}`);
    if (r.ok) setQr({ ...r.data, kind });
    else flash(`Blocked: ${r.data.error}`);
  }

  const btn = "rounded-xl px-4 py-2 text-sm font-semibold transition active:scale-95 disabled:opacity-40";
  const primary = `${btn} bg-primary text-white hover:bg-primary-hover`;
  const soft = `${btn} bg-stone-100 text-ink hover:bg-stone-200`;
  const intact = it.integrity.metadata && it.integrity.image;
  const st = it.status;

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-card">
      <img loading="lazy" src={`/api/resources/image?id=${it.id}`} alt={it.title} className="h-40 w-full bg-stone-100 object-cover" />
      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-bold">{it.title}</h2>
            <p className="flex items-center gap-1 text-xs text-muted">
              <Icon name="pin" size={12} className="shrink-0 text-primary" /> #{it.id} - {it.category} - {it.location}
            </p>
          </div>
          <span className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${CHIP[st]}`}>{STATUS[st]}</span>
        </div>
        <p className="text-sm text-ink">{it.description}</p>
        <p className="text-xs text-muted">
          Owner: <b>{it.owner?.name}</b> - Deposit: <b>{it.deposit} credits</b> - Condition: <b>{COND[it.condition]}</b>
        </p>
        <p className={`text-xs ${intact ? "text-emerald-600" : "font-semibold text-red-600"}`}>
          {intact ? "Integrity verified: details and photo match the on-chain hashes" : "TAMPERED: details or photo do not match the blockchain"}
        </p>

        {it.borrower && st >= 1 && st <= 5 && (
          <p className="rounded-xl bg-stone-50 p-3 text-xs text-muted">
            Borrower: <b className="text-ink">{it.borrower.name}</b>
            {it.borrowerTrust && <> - Trust {it.borrowerTrust.score}/100 ({it.borrowerTrust.label})</>}
            {it.durationHours > 0 && <> - {it.durationHours} h requested</>}
            {(st === 3 || st === 4) && it.dueDate > 0 && <> - Due {new Date(it.dueDate * 1000).toLocaleString()}</>}
            {st >= 3 && it.conditionBefore > 0 && <> - Condition at checkout: {COND[it.conditionBefore]}</>}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {st === 0 && !mine && (
            <>
              <input
                type="number"
                min={1}
                max={720}
                value={hours}
                onChange={(e) => setHours(Number(e.target.value))}
                className="w-20 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-base"
              />
              <span className="text-xs text-muted">hours</span>
              <button onClick={() => go({ action: "request", durationHours: hours })} className={primary}>Request to borrow</button>
            </>
          )}
          {st === 0 && mine && <button onClick={() => go({ action: "retire" })} className={soft}>Retire resource</button>}

          {st === 1 && mine && (
            <>
              <button onClick={() => go({ action: "approve" })} className={primary}>Approve</button>
              <button onClick={() => go({ action: "reject" })} className={soft}>Reject</button>
            </>
          )}
          {(st === 1 || st === 2) && borrowing && <button onClick={() => go({ action: "cancel" })} className={soft}>Cancel request</button>}

          {st === 2 && borrowing && <button onClick={() => showQr("checkout")} className={primary}>Show my checkout QR</button>}
          {st === 2 && mine && (
            <Link href="/scan" className={`${primary} flex items-center gap-2`}>
              <Icon name="qr" size={16} /> Scan borrower QR
            </Link>
          )}

          {st === 3 && borrowing && <button onClick={() => go({ action: "return" })} className={soft}>Start return</button>}
          {(st === 3 || st === 4) && borrowing && <button onClick={() => showQr("return")} className={primary}>Show my return QR</button>}
          {(st === 3 || st === 4) && mine && (
            <Link href="/scan" className={`${primary} flex items-center gap-2`}>
              <Icon name="qr" size={16} /> Scan return QR
            </Link>
          )}
          {(st === 3 || st === 4) && (mine || borrowing) && (
            <button onClick={() => go({ action: "dispute" })} className={`${btn} bg-red-50 text-red-700 hover:bg-red-100`}>Raise dispute</button>
          )}
        </div>

        {st === 5 && role === "admin" && (
          <div className="space-y-2 rounded-xl border border-red-100 bg-red-50 p-3">
            <p className="text-xs text-muted">Admin resolution: refund {pct}% of the deposit to the borrower.</p>
            <input type="range" min={0} max={100} value={pct} onChange={(e) => setPct(Number(e.target.value))} className="w-full" />
            <button onClick={() => go({ action: "resolve", refundPercent: pct })} className={primary}>Resolve dispute</button>
          </div>
        )}
        {st === 5 && role !== "admin" && <p className="text-xs text-red-600">Waiting for an admin to resolve this dispute.</p>}

        {qr && (
          <div className="space-y-2 rounded-xl border border-stone-100 p-3 text-center">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase text-primary">{qr.kind === "checkout" ? "Checkout QR" : "Return QR"}</p>
              <button onClick={() => setQr(null)} aria-label="Hide QR" className="text-muted"><Icon name="x" size={16} /></button>
            </div>
            <img src={qr.qr} alt="QR code" className="mx-auto h-64 w-64 max-w-full rounded-lg bg-white p-2" />
            <p className="text-xs text-muted">Show this to the owner. It is valid for 10 minutes and only works for you and this item.</p>
            <textarea
              readOnly
              rows={2}
              value={qr.token}
              className="w-full rounded-lg border border-stone-200 bg-stone-50 p-2 font-mono text-[11px]"
              onFocus={(e) => e.currentTarget.select()}
            />
          </div>
        )}
      </div>
    </div>
  );
}