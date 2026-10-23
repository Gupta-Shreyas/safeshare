"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api, timeAgo } from "@/lib/client";
import { Icon } from "@/components/Icon";
import { trustScore, Stats } from "@/lib/trust";

type Status = { username: string; role: string; address: string; verified: boolean; blacklisted: boolean; credits: number; stats: Stats };
type Alert = { id: number; username: string; kind: string; note: string; ts: number };
type Item = { id: number; title: string; location: string; deposit: number; status: number; owner: { address: string; name: string } | null; borrower: { address: string; name: string } | null };

const KINDS = ["Water", "Medical", "Power", "Shelter", "Transport", "Other"];
const lc = (a?: string) => (a ?? "").toLowerCase();

const ACTIONS = [
  { href: "/resources", icon: "list", tile: "bg-yellow text-navy", title: "Borrow something", text: "Browse items your neighbours are lending.", cta: "Browse items" },
  { href: "/resources/new", icon: "package", tile: "bg-orange text-navy", title: "Lend something", text: "Register an item so others can borrow it.", cta: "Register an item" },
  { href: "/scan", icon: "qr", tile: "bg-navy text-yellow", title: "Hand over or return", text: "Show your QR code, or scan the borrower's.", cta: "Open QR" },
];

function Ring({ score }: { score: number }) {
  const C = 2 * Math.PI * 44;
  return (
    <div className="relative h-32 w-32 shrink-0">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden="true">
        <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="8" />
        <circle cx="50" cy="50" r="44" fill="none" stroke="#FCBF49" strokeWidth="8" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - score / 100)} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-4xl font-extrabold">{score}</span>
        <span className="ss-eyebrow text-[9px] text-white/60">of 100</span>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [s, setS] = useState<Status | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [me, setMe] = useState("");
  const [err, setErr] = useState("");
  const [sheet, setSheet] = useState(false);
  const [sheetErr, setSheetErr] = useState("");
  const [kind, setKind] = useState("Medical");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [a, b, c] = await Promise.all([api("/api/me/status"), api("/api/alerts"), api("/api/resources")]);
    if (a.ok) { setS(a.data); setErr(""); } else setErr(a.data.error ?? "Failed to load");
    if (b.ok) setAlerts(b.data.alerts);
    if (c.ok) { setItems(c.data.items); setMe(c.data.me); }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(() => { if (document.visibilityState === "visible") load(); }, 10000);
    return () => clearInterval(t);
  }, [load]);

  async function sendAlert() {
    setBusy(true);
    setSheetErr("");
    const r = await api("/api/alerts", "POST", { kind, note });
    if (r.ok) { setSheet(false); setNote(""); await load(); }
    else setSheetErr(r.data.error ?? "Could not send the alert");
    setBusy(false);
  }

  async function borrow(id: number) {
    await api("/api/resources/action", "POST", { id, action: "request", durationHours: 24 });
    await load();
  }

  if (err) return <p className="rounded-2xl bg-red/10 p-4 text-red">{err}</p>;
  if (!s) return <p className="text-muted">Loading from the blockchain...</p>;

  const t = trustScore(s.stats);
  const care = s.stats.careCount ? (s.stats.careSum / s.stats.careCount).toFixed(1) : "-";
  const nearby = items.filter((i) => i.status === 0).slice(0, 4);
  const myQr = items.filter((i) => lc(i.borrower?.address) === lc(me) && [2, 3, 4].includes(i.status));
  const myItems = items.filter((i) => lc(i.owner?.address) === lc(me));
  const waiting = myItems.filter((i) => i.status === 1);

  let next: { title: string; text: string; href?: string; cta?: string } | null = null;
  if (!s.verified) next = { title: "Step 1: get verified", text: "An admin must verify your account on the blockchain before you can borrow or send alerts. Ask them to open the Admin panel." };
  else if (myQr.length) next = { title: myQr.length === 1 ? "Your QR code is ready" : `${myQr.length} QR codes are ready`, text: "Show it to the owner to complete the handover or return.", href: "/scan#qr", cta: "Open My QR" };
  else if (waiting.length) next = { title: `${waiting.length} borrow ${waiting.length === 1 ? "request is" : "requests are"} waiting for you`, text: "Approve or reject them so neighbours can plan.", href: "/resources", cta: "Review requests" };
  else if (!myItems.length && s.stats.completed === 0) next = { title: "Make your first move", text: "Borrow something you need, or register an item you can lend.", href: "/resources", cta: "Browse items" };

  const card = "rounded-3xl bg-white p-6 shadow-card ring-1 ring-black/5";

  return (
    <div className="space-y-8">
      <div>
        <p className="ss-eyebrow text-orange-deep">Dashboard</p>
        <h1 className="mt-1 font-display text-[length:clamp(2rem,4vw,3rem)] font-extrabold leading-tight text-navy">
          Hello, <span className="font-serif text-[1.12em] font-normal italic tracking-normal">{s.username}</span>
        </h1>
        <p className="mt-1 text-lg text-muted">What would you like to do today?</p>
      </div>

      {s.blacklisted && <div className="rounded-2xl border border-red/30 bg-red/10 p-4 text-red"><b>Blacklisted.</b> An admin has blocked this account on-chain.</div>}

      {next && (
        <div className="ss-glow-border rounded-3xl">
          <div className="flex flex-wrap items-center gap-4 rounded-3xl bg-white p-5 shadow-card">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-yellow text-navy"><Icon name="check" size={22} /></span>
            <div className="min-w-0 flex-1">
              <p className="font-display text-xl font-bold text-navy">{next.title}</p>
              <p className="text-base text-muted">{next.text}</p>
            </div>
            {next.href && <Link href={next.href} className="ss-btn rounded-xl bg-navy px-5 py-3 font-bold text-sand-light shadow-glow">{next.cta}</Link>}
          </div>
        </div>
      )}

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {ACTIONS.map((a) => (
          <Link key={a.href} href={a.href} className="ss-lift group flex flex-col rounded-3xl bg-white p-5 shadow-card ring-1 ring-black/5 sm:p-6">
            <span className={`flex h-14 w-14 items-center justify-center rounded-2xl transition group-hover:-rotate-6 group-hover:scale-110 ${a.tile}`}><Icon name={a.icon} size={26} /></span>
            <h2 className="mt-5 font-display text-xl font-bold text-navy">{a.title}</h2>
            <p className="mt-1.5 flex-1 text-sm text-muted sm:text-base">{a.text}</p>
            <span className="mt-4 text-sm font-bold text-orange-deep">{a.cta} &rarr;</span>
          </Link>
        ))}
        <button
          onClick={() => { setSheetErr(""); setSheet(true); }}
          className="ss-lift ss-ping group flex flex-col rounded-3xl bg-gradient-to-br from-[#e84545] to-red p-5 text-left text-white shadow-danger sm:p-6"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 transition group-hover:-rotate-6 group-hover:scale-110"><Icon name="alert" size={26} /></span>
          <h2 className="mt-5 font-display text-xl font-bold">Urgent request</h2>
          <p className="mt-1.5 flex-1 text-sm text-white/90 sm:text-base">Alert every verified member right now.</p>
          <span className="mt-4 text-sm font-bold">Send alert &rarr;</span>
        </button>
      </section>

      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-navy-deep via-navy to-[#0a4766] p-6 text-white shadow-soft">
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-yellow/25 blur-3xl" />
          <div className="relative flex items-center gap-6">
            <Ring score={t.score} />
            <div className="min-w-0">
              <p className="ss-eyebrow text-[11px] text-white/60">Your trust standing</p>
              <p className="font-display text-3xl font-extrabold">{t.label}</p>
              <p className="mt-1 text-sm text-white/70">Calculated from on-chain counters anyone can verify.</p>
            </div>
          </div>
          <div className="relative mt-6 grid grid-cols-3 gap-3">
            {[["On-chain", s.verified ? "Verified" : "Pending"], ["Credits", String(s.credits)], ["Care rating", String(care)]].map(([k, v]) => (
              <div key={k} className="rounded-2xl bg-white/10 p-3 ring-1 ring-white/10">
                <p className="text-xs text-white/60">{k}</p>
                <p className="text-lg font-bold">{v}</p>
              </div>
            ))}
          </div>
        </section>

        <section className={card}>
          <h2 className="mb-4 font-display text-xl font-bold text-navy">On-chain track record</h2>
          <div className="grid grid-cols-3 gap-4 text-center">
            {[["Borrowed", s.stats.completed], ["On time", s.stats.onTime], ["Damaged", s.stats.damaged], ["Lent", s.stats.lent], ["Disputes lost", s.stats.disputesLost], ["Care", care]].map(([k, v]) => (
              <div key={k as string}><p className="font-display text-3xl font-extrabold text-navy">{v}</p><p className="text-xs text-muted">{k}</p></div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <section className="space-y-3">
          <div className="flex items-end justify-between">
            <h2 className="font-display text-2xl font-bold text-navy">Nearby resources</h2>
            <Link href="/resources" className="ss-link text-sm font-bold text-orange-deep">View all</Link>
          </div>
          {nearby.length === 0 && <p className="rounded-2xl bg-white p-5 text-muted shadow-card">Nothing is available right now. Be the first to <Link href="/resources/new" className="font-bold text-navy underline">register an item</Link>.</p>}
          {nearby.map((it) => {
            const mine = lc(it.owner?.address) === lc(me);
            return (
              <div key={it.id} className="ss-lift flex items-center gap-4 rounded-3xl bg-white p-3 shadow-card ring-1 ring-black/5">
                <img loading="lazy" src={`/api/resources/image?id=${it.id}`} alt="" className="h-24 w-24 shrink-0 rounded-2xl bg-stone-100 object-cover" />
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-display text-lg font-bold">{it.title}</h3>
                  <p className="truncate text-sm text-muted">{it.owner?.name} - {it.deposit} credits deposit</p>
                  <p className="mt-1 flex items-center gap-1 truncate text-sm text-muted"><Icon name="pin" size={14} className="shrink-0 text-orange-deep" />{it.location}</p>
                </div>
                {mine ? <span className="pr-3 text-sm text-muted">Yours</span> : (
                  <button onClick={() => borrow(it.id)} className="ss-btn rounded-xl bg-navy px-5 py-2.5 font-bold text-sand-light shadow-glow">Borrow</button>
                )}
              </div>
            );
          })}
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-2xl font-bold text-navy">Community alerts</h2>
          {alerts.length === 0 && <p className="rounded-2xl bg-white p-5 text-muted shadow-card">All quiet. No active alerts.</p>}
          {alerts.slice(0, 4).map((a) => (
            <div key={a.id} className="flex items-start gap-3 rounded-2xl border border-red/25 bg-red/10 p-4">
              <span className="ss-eyebrow mt-0.5 rounded-full bg-red px-2.5 py-0.5 text-[10px] text-white">{a.kind}</span>
              <div className="min-w-0 flex-1">
                <p className="break-words">{a.note || "Help needed nearby."}</p>
                <p className="mt-0.5 text-sm text-muted">{a.username} - {timeAgo(a.ts)}</p>
              </div>
            </div>
          ))}
        </section>
      </div>

      {sheet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy-deep/60 backdrop-blur-sm sm:items-center" onClick={() => setSheet(false)}>
          <div className="w-full max-w-md rounded-t-3xl bg-white p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-2xl font-extrabold text-navy">Send an urgent request</h3>
            <p className="mb-4 text-muted">Every verified member sees this on their home screen.</p>
            <div className="mb-4 flex flex-wrap gap-2">
              {KINDS.map((k) => (
                <button key={k} onClick={() => setKind(k)} className={`rounded-full px-4 py-2 font-semibold ${kind === k ? "bg-red text-white" : "bg-sand text-navy"}`}>{k}</button>
              ))}
            </div>
            <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={140} aria-label="What do you need" placeholder="What do you need and where? (optional)" className="mb-3 w-full rounded-xl border-2 border-navy/10 bg-white px-4 py-3 text-base outline-none focus:border-navy" />
            {sheetErr && <p className="mb-3 rounded-xl bg-red/10 px-3 py-2 text-sm text-red" role="alert">{sheetErr}</p>}
            <button disabled={busy} onClick={sendAlert} className="ss-btn w-full rounded-xl bg-red py-3 font-bold text-white shadow-danger disabled:opacity-50">{busy ? "Sending..." : "Send alert"}</button>
            <button onClick={() => setSheet(false)} className="mt-2 w-full py-2 text-muted">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}