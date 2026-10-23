"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client";
import { Icon } from "./Icon";

type Item = { id: number; title: string; status: number; owner: { address: string; name: string } | null; borrower: { address: string; name: string } | null };
const lc = (a?: string) => (a ?? "").toLowerCase();

function QrCard({ it, onChanged }: { it: Item; onChanged: () => void }) {
  const kind: "checkout" | "return" = it.status === 2 ? "checkout" : "return";
  const ready = it.status === 2 || it.status === 4;
  const [qr, setQr] = useState<{ qr: string; token: string } | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const gen = useCallback(async () => {
    const r = await api(`/api/resources/qr?id=${it.id}&kind=${kind}`);
    if (r.ok) { setQr(r.data); setErr(""); } else { setQr(null); setErr(r.data.error ?? "Could not create the QR code"); }
  }, [it.id, kind]);

  useEffect(() => {
    if (!ready) { setQr(null); return; }
    gen();
    const t = setInterval(gen, 240000);
    return () => clearInterval(t);
  }, [ready, gen]);

  async function startReturn() {
    setBusy(true);
    const r = await api("/api/resources/action", "POST", { id: it.id, action: "return" });
    if (!r.ok) setErr(r.data.error ?? "Could not start the return");
    await onChanged();
    setBusy(false);
  }

  async function copy() {
    try { await navigator.clipboard.writeText(qr!.token); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {}
  }

  return (
    <div className="rounded-3xl bg-white p-5 text-center shadow-card ring-1 ring-stone-100">
      <p className="text-xs font-bold uppercase tracking-wider text-accent">{kind === "checkout" ? "Checkout - handover" : "Return"}</p>
      <h3 className="mt-1 text-lg font-extrabold">{it.title}</h3>
      <p className="mb-4 text-xs text-muted">Owner: {it.owner?.name} - item #{it.id}</p>

      {it.status === 3 && (
        <>
          <p className="mb-3 text-sm text-muted">You have this item. When you are done, start the return to get your return QR.</p>
          <button disabled={busy} onClick={startReturn} className="rounded-xl bg-primary px-5 py-3 font-bold text-white shadow-glow active:scale-95 disabled:opacity-50">
            {busy ? "Working..." : "Start return"}
          </button>
        </>
      )}

      {ready && qr && (
        <>
          <img src={qr.qr} alt="QR code" className="mx-auto w-full max-w-[18rem] rounded-2xl bg-white p-3 ring-1 ring-stone-200" />
          <p className="mt-3 text-xs text-muted">Show this to the owner. Valid for 10 minutes, refreshes by itself, and only works for you and this item.</p>
          <div className="mt-3 flex justify-center gap-2">
            <button onClick={gen} className="rounded-lg bg-stone-100 px-3 py-1.5 text-xs font-semibold">New code</button>
            <button onClick={copy} className="rounded-lg bg-stone-100 px-3 py-1.5 text-xs font-semibold">{copied ? "Copied" : "Copy code text"}</button>
          </div>
        </>
      )}
      {ready && !qr && !err && <p className="text-sm text-muted">Creating your code...</p>}
      {err && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}
    </div>
  );
}

export default function MyQr() {
  const [mine, setMine] = useState<Item[]>([]);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const r = await api("/api/resources");
    if (r.ok) {
      setMine((r.data.items as Item[]).filter((i) => lc(i.borrower?.address) === lc(r.data.me) && [2, 3, 4].includes(i.status)));
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(() => { if (document.visibilityState === "visible") load(); }, 6000);
    return () => clearInterval(t);
  }, [load]);

  if (loaded && mine.length === 0)
    return (
      <div className="rounded-3xl bg-white p-6 text-center shadow-card ring-1 ring-stone-100">
        <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-light text-primary"><Icon name="qr" size={28} /></span>
        <p className="font-bold">No QR code to show yet</p>
        <p className="mt-1 text-sm text-muted">
          A QR appears here once you request an item and the owner approves it. It appears again when you start a return.
        </p>
      </div>
    );

  return <div className="space-y-4">{mine.map((it) => <QrCard key={it.id + "-" + it.status} it={it} onChanged={load} />)}</div>;
}