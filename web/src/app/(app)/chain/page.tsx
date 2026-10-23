"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { Icon } from "@/components/Icon";

type Tx = { hash: string; kind: string; label: string; text: string };
type Block = { number: number; hash: string; timestamp: number; gasUsed: string; txCount: number; txs: Tx[] };
type Chain = { chainId: number; latest: number; contract: string; paused: boolean; resourceCount: number; blocks: Block[] };

const CHIP: Record<string, string> = {
  permission: "bg-yellow text-navy",
  request: "bg-orange/15 text-orange-deep",
  exchange: "bg-navy text-yellow",
  listing: "bg-sand text-navy",
  dispute: "bg-red text-white",
  system: "bg-navy/10 text-navy",
};
const ICON: Record<string, string> = {
  permission: "shield", request: "list", exchange: "qr", listing: "package", dispute: "alert", system: "link",
};
const FILTERS = [
  ["all", "Everything"], ["permission", "Permissions"], ["request", "Requests"],
  ["exchange", "Handovers"], ["listing", "Items"], ["dispute", "Disputes"],
] as const;

export default function ChainPage() {
  const [c, setC] = useState<Chain | null>(null);
  const [err, setErr] = useState("");
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      const r = await api("/api/chain/status");
      if (!alive) return;
      if (r.ok) { setC(r.data); setErr(""); } else setErr(r.data.error ?? "Node unreachable");
    };
    tick();
    const t = setInterval(() => { if (document.visibilityState === "visible") tick(); }, 4000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  const card = "rounded-2xl bg-white p-4 shadow-card ring-1 ring-black/5";
  const blocks = (c?.blocks ?? [])
    .map((b) => ({ ...b, txs: b.txs.filter((t) => filter === "all" || t.kind === filter) }))
    .filter((b) => filter === "all" || b.txs.length > 0);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <p className="ss-eyebrow text-orange-deep">Ledger</p>
        <h1 className="font-display text-3xl font-extrabold text-navy">Live blockchain</h1>
        <p className="text-muted">Every permission, request and handover, written in plain words. The raw hashes are one tap away.</p>
      </div>

      {err && <p className="rounded-2xl bg-red/10 p-3 text-sm text-red">{err}. Is `npx hardhat node` running?</p>}

      {c && (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className={card}><p className="text-xs text-muted">Chain ID</p><p className="text-lg font-bold">{c.chainId}</p></div>
            <div className={card}><p className="text-xs text-muted">Latest block</p><p className="text-lg font-bold">#{c.latest}</p></div>
            <div className={card}><p className="text-xs text-muted">Items on-chain</p><p className="text-lg font-bold">{c.resourceCount}</p></div>
            <div className={card}>
              <p className="text-xs text-muted">Contract</p>
              <p className={`text-lg font-bold ${c.paused ? "text-red" : "text-navy"}`}>{c.paused ? "Paused" : "Active"}</p>
            </div>
          </div>

          <details className={card}>
            <summary className="cursor-pointer text-sm font-semibold text-navy">Contract address</summary>
            <p className="mt-2 break-all font-mono text-xs text-muted">{c.contract}</p>
          </details>

          <div className="no-scrollbar flex gap-2 overflow-x-auto">
            {FILTERS.map(([k, label]) => (
              <button
                key={k}
                onClick={() => setFilter(k)}
                className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-semibold ${filter === k ? "bg-navy text-sand-light" : "bg-white text-muted shadow-card"}`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {blocks.length === 0 && <p className="rounded-2xl bg-white p-5 text-muted shadow-card">Nothing of that kind in the latest blocks.</p>}
            {blocks.map((b) => (
              <div key={b.number} className={card}>
                <div className="flex items-center justify-between">
                  <p className="font-display text-lg font-bold text-navy">Block #{b.number}</p>
                  <p className="text-xs text-muted">{new Date(b.timestamp * 1000).toLocaleString()}</p>
                </div>

                <div className="mt-3 space-y-3">
                  {b.txs.length === 0 && (
                    <p className="text-sm text-muted">{b.number === 0 ? "Genesis block, the start of this chain." : "Empty block."}</p>
                  )}
                  {b.txs.map((t) => (
                    <div key={t.hash} className="rounded-xl bg-sand-light/60 p-3">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${CHIP[t.kind] ?? CHIP.system}`}>
                        <Icon name={ICON[t.kind] ?? "link"} size={13} />
                        {t.label}
                      </span>
                      <p className="mt-2 break-words text-base text-ink">{t.text}</p>
                      <details className="mt-2">
                        <summary className="cursor-pointer text-xs font-semibold text-muted">Technical details</summary>
                        <p className="mt-1 break-all font-mono text-[11px] text-muted">tx {t.hash}</p>
                        <p className="break-all font-mono text-[11px] text-muted">block {b.hash}</p>
                        <p className="font-mono text-[11px] text-muted">gas {b.gasUsed}</p>
                      </details>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}