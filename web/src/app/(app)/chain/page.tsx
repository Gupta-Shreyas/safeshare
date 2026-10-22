"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";

type Block = { number: number; hash: string; timestamp: number; gasUsed: string; txCount: number; txs: string[] };
type Chain = { chainId: number; latest: number; contract: string; paused: boolean; resourceCount: number; blocks: Block[] };

export default function ChainPage() {
  const [c, setC] = useState<Chain | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      const r = await api("/api/chain/status");
      if (!alive) return;
      if (r.ok) { setC(r.data); setErr(""); } else setErr(r.data.error ?? "Node unreachable");
    };
    tick();
    const t = setInterval(tick, 3000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  const card = "rounded-xl border border-slate-800 bg-slate-950 p-4";
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Live blockchain</h1>
      {err && <p className="rounded-lg bg-red-950 text-red-300 p-3">{err}. Is `npx hardhat node` running?</p>}
      {c && (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <div className={card}><p className="text-xs text-slate-400">Chain ID</p><p className="text-xl font-semibold">{c.chainId}</p></div>
            <div className={card}><p className="text-xs text-slate-400">Latest block</p><p className="text-xl font-semibold">#{c.latest}</p></div>
            <div className={card}><p className="text-xs text-slate-400">Resources on-chain</p><p className="text-xl font-semibold">{c.resourceCount}</p></div>
            <div className={card}>
              <p className="text-xs text-slate-400">Contract state</p>
              <p className={`text-xl font-semibold ${c.paused ? "text-red-400" : "text-emerald-400"}`}>{c.paused ? "Paused" : "Active"}</p>
            </div>
          </div>
          <div className={card}>
            <p className="text-xs text-slate-400">SafeShare contract address (same address you see in Remix)</p>
            <p className="font-mono text-sm break-all">{c.contract}</p>
            <p className="text-xs text-slate-500 mt-2">
              Connect Remix to http://127.0.0.1:8545 and open this address to see the same data this website reads.
            </p>
          </div>
          <div className="space-y-3">
            <h2 className="font-semibold">Latest blocks (refreshes every 3 s)</h2>
            {c.blocks.map((b) => (
              <div key={b.number} className={card}>
                <div className="flex justify-between text-sm">
                  <b>Block #{b.number}</b>
                  <span className="text-slate-400">{new Date(b.timestamp * 1000).toLocaleTimeString()} - {b.txCount} tx - gas {b.gasUsed}</span>
                </div>
                <p className="font-mono text-xs break-all text-slate-400 mt-1">hash {b.hash}</p>
                {b.txs.map((t) => (
                  <p key={t} className="font-mono text-xs break-all text-emerald-400">tx {t}</p>
                ))}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}