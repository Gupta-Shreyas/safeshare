"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import { trustScore, Stats } from "@/lib/trust";

type Status = {
  username: string; role: string; address: string; verified: boolean; blacklisted: boolean; credits: number;
  stats: Stats;
};

export default function Dashboard() {
  const [s, setS] = useState<Status | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    api("/api/me/status").then((r) => (r.ok ? setS(r.data) : setErr(r.data.error ?? "Failed to load")));
  }, []);

  if (err) return <p className="rounded-lg bg-red-950 text-red-300 p-4">{err}</p>;
  if (!s) return <p className="text-slate-400">Loading from the blockchain...</p>;

  const t = trustScore(s.stats);
  const care = s.stats.careCount ? (s.stats.careSum / s.stats.careCount).toFixed(1) : "-";
  const tone = t.score >= 80 ? "text-emerald-400" : t.score >= 60 ? "text-sky-400" : t.score >= 40 ? "text-amber-400" : "text-red-400";
  const card = "rounded-xl border border-slate-800 bg-slate-950 p-5";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Welcome, {s.username}</h1>
        <Link href="/resources" className="rounded-lg bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-sm font-semibold">
          Browse resources
        </Link>
      </div>

      {!s.verified && (
        <div className="rounded-xl border border-amber-700 bg-amber-950 p-4 text-amber-200">
          <b>Not verified yet.</b> The smart contract blocks unverified wallets from registering or borrowing resources
          (Sybil defense). Ask an admin to verify your account.
        </div>
      )}
      {s.blacklisted && (
        <div className="rounded-xl border border-red-700 bg-red-950 p-4 text-red-200">
          <b>Blacklisted.</b> An admin has blocked this account on-chain.
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <div className={card}>
          <p className="text-sm text-slate-400">On-chain status</p>
          <p className={`text-xl font-semibold ${s.verified ? "text-emerald-400" : "text-amber-400"}`}>
            {s.verified ? "Verified" : "Unverified"}
          </p>
        </div>
        <div className={card}>
          <p className="text-sm text-slate-400">Credits (deposit balance)</p>
          <p className="text-xl font-semibold">{s.credits}</p>
        </div>
        <div className={card}>
          <p className="text-sm text-slate-400">Trust score</p>
          <p className={`text-xl font-semibold ${tone}`}>{t.score}/100 <span className="text-sm font-normal">{t.label}</span></p>
        </div>
        <div className={card}>
          <p className="text-sm text-slate-400">Blockchain account</p>
          <p className="text-xs font-mono break-all">{s.address}</p>
        </div>
      </div>

      <div className={card}>
        <h2 className="font-semibold mb-3">Your on-chain track record</h2>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-4 text-center">
          {[
            ["Borrowed", s.stats.completed],
            ["On time", s.stats.onTime],
            ["Damaged", s.stats.damaged],
            ["Lent", s.stats.lent],
            ["Disputes lost", s.stats.disputesLost],
            ["Care rating", care],
          ].map(([k, v]) => (
            <div key={k as string}>
              <p className="text-2xl font-bold">{v}</p>
              <p className="text-xs text-slate-400">{k}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-500 mt-4">
          The trust score is calculated from these on-chain counters (on-time returns, damage record, owners' care ratings
          and disputes). New members start near 50, and anyone can recompute the score from the chain.
        </p>
      </div>
    </div>
  );
}