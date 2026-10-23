"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactElement, ReactNode } from "react";
import { Icon } from "./Icon";
import { LogoMark, Wordmark } from "./Logo";
import { SITE, telHref } from "@/lib/site";

const WORDS = ["Generators", "Water pumps", "First-aid kits", "Oxygen cylinders", "Boats", "Tents", "Torches", "Life jackets"];

const STEPS = [
  { n: "01", icon: "user", tile: "bg-yellow text-navy", t: "Join and get verified", d: "Create an account. An admin verifies you on the blockchain before you can borrow." },
  { n: "02", icon: "package", tile: "bg-orange text-navy", t: "List or request an item", d: "Register what you can lend, or ask for what you need. Owners approve every request." },
  { n: "03", icon: "qr", tile: "bg-navy text-yellow", t: "Scan to hand over", d: "The borrower shows a QR code, the owner scans it, and the handover is written on-chain." },
  { n: "04", icon: "shield", tile: "bg-red text-white", t: "Return and build trust", d: "On-time, careful returns raise your trust score for everyone to see." },
];

const FEATURES = [
  { k: "members", tag: "Access", icon: "shield", c: "#FCBF49", ic: "#001d2e", span: "lg:col-span-3", t: "Verified members only", d: "Admins verify every account on-chain, so a stranger can never borrow your pump." },
  { k: "qr", tag: "Handover", icon: "qr", c: "#F77F00", ic: "#001d2e", span: "lg:col-span-3", t: "Signed QR handovers", d: "Every handover and return uses a time-limited QR that only works for that borrower and that item." },
  { k: "hash", tag: "Integrity", icon: "link", c: "#D62828", ic: "#ffffff", span: "lg:col-span-2", t: "Tamper-evident records", d: "Details and photos are hashed on-chain. Edit one and the item shows as tampered." },
  { k: "trust", tag: "Reputation", icon: "activity", c: "#FCBF49", ic: "#001d2e", span: "lg:col-span-2", t: "A live trust score", d: "Built from on-time returns, condition and care ratings that anyone can recompute." },
  { k: "alert", tag: "Alerts", icon: "alert", c: "#D62828", ic: "#ffffff", span: "lg:col-span-2", t: "Urgent requests", d: "One tap alerts every verified member when water, power or medicine runs short." },
  { k: "deposit", tag: "Deposits", icon: "package", c: "#F77F00", ic: "#001d2e", span: "lg:col-span-6", t: "Deposits and disputes", d: "Credits are held as a deposit and returned when the item comes back in good shape. If there is a disagreement, an admin decides the split." },
];

function QrArt({ size = 80 }: { size?: number }) {
  const n = 21;
  const cells: ReactElement[] = [];
  const inFinder = (x: number, y: number) => (x < 8 && y < 8) || (x >= n - 8 && y < 8) || (x < 8 && y >= n - 8);
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++)
      if (!inFinder(x, y) && (x * 7 + y * 13 + x * y) % 5 < 2) cells.push(<rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} />);
  const finder = (x: number, y: number) => (
    <g key={`f${x}${y}`}>
      <rect x={x} y={y} width={7} height={7} />
      <rect x={x + 1} y={y + 1} width={5} height={5} fill="#fff" />
      <rect x={x + 2} y={y + 2} width={3} height={3} />
    </g>
  );
  return (
    <svg width={size} height={size} viewBox={`0 0 ${n} ${n}`} fill="#003049" aria-hidden="true">
      {cells}
      {finder(0, 0)}
      {finder(n - 7, 0)}
      {finder(0, n - 7)}
    </svg>
  );
}

function Blob({ className, fill }: { className: string; fill: string }) {
  return (
    <svg viewBox="0 0 500 500" className={className} aria-hidden="true">
      <path fill={fill} d="M250 20C360 10 470 90 480 210C490 330 400 470 270 480C140 490 20 400 20 280C20 160 140 30 250 20Z" />
    </svg>
  );
}

// The accent word: serif italic inside a sans heading. This pairing is the signature of the page.
function Em({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <em className={`font-serif text-[1.12em] font-normal italic tracking-normal ${className}`}>{children}</em>;
}

function Tilt({ children, className = "", style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  function move(e: React.PointerEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el || e.pointerType === "touch") return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(900px) rotateX(${-y * 8}deg) rotateY(${x * 10}deg)`;
    el.style.setProperty("--gx", `${(x + 0.5) * 100}%`);
    el.style.setProperty("--gy", `${(y + 0.5) * 100}%`);
  }
  function leave() {
    if (ref.current) ref.current.style.transform = "";
  }
  return (
    <div ref={ref} onPointerMove={move} onPointerLeave={leave} style={style} className={`ss-tilt ${className}`}>
      {children}
    </div>
  );
}

function Visual({ k }: { k: string }) {
  if (k === "members")
    return (
      <div className="mt-6 space-y-2 text-sm font-semibold">
        <div className="flex items-center justify-between rounded-xl bg-white/10 px-4 py-2.5"><span>alice</span><span className="ss-eyebrow rounded-full bg-yellow px-3 py-0.5 text-[10px] text-navy-deep">Verified</span></div>
        <div className="flex items-center justify-between rounded-xl bg-white/10 px-4 py-2.5"><span>bob</span><span className="ss-eyebrow rounded-full bg-orange px-3 py-0.5 text-[10px] text-navy-deep">Pending</span></div>
      </div>
    );
  if (k === "qr")
    return (
      <div className="mt-6 flex items-center gap-4">
        <div className="rounded-2xl bg-white p-2.5"><QrArt size={96} /></div>
        <p className="text-sm text-sand-light/70">Valid for 10 minutes.<br />One borrower. One item.</p>
      </div>
    );
  if (k === "hash")
    return (
      <div className="mt-6 rounded-xl bg-black/30 p-3 font-mono text-xs text-sand-light/80">
        <p>on-chain&nbsp; 0x9f3a...c1d2</p>
        <p>database&nbsp; 0x9f3a...c1d2</p>
        <p className="mt-1 font-bold text-yellow">&#10003; match, untouched</p>
      </div>
    );
  if (k === "trust")
    return (
      <div className="mt-6">
        <div className="h-3 rounded-full bg-white/10"><div className="h-3 w-[82%] rounded-full bg-gradient-to-r from-yellow to-orange" /></div>
        <p className="mt-2 font-mono text-xs text-sand-light/60">on-time - care - disputes</p>
      </div>
    );
  if (k === "alert")
    return (
      <div className="mt-6 flex flex-wrap gap-2">
        {["Water", "Medical", "Power", "Shelter"].map((x) => (
          <span key={x} className="ss-eyebrow rounded-full bg-red px-3 py-1 text-[10px] text-white">{x}</span>
        ))}
      </div>
    );
  return (
    <div className="mt-6 flex flex-wrap gap-2 text-sm font-semibold">
      <span className="rounded-full bg-white/10 px-4 py-2">Deposit held: 20 credits</span>
      <span className="rounded-full bg-yellow px-4 py-2 text-navy-deep">Returned on time: refunded</span>
      <span className="rounded-full bg-orange px-4 py-2 text-navy-deep">Dispute: admin decides</span>
    </div>
  );
}

const d = (s: string) => ({ "--d": s } as CSSProperties);

export default function Landing() {
  const [open, setOpen] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const hasContact = !!(SITE.email || SITE.phone);
  const nav: string[][] = [
    ["How it works", "#how"],
    ["Features", "#features"],
    ...(hasContact ? [["Contact", "#contact"]] : []),
  ];

  useEffect(() => {
    document.documentElement.classList.add("ss-js");
    const els = Array.from(document.querySelectorAll(".ss-reveal"));
    if (!("IntersectionObserver" in window)) {
      els.forEach((e) => e.classList.add("ss-in"));
      return () => document.documentElement.classList.remove("ss-js");
    }
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("ss-in"); io.unobserve(e.target); } }),
      { threshold: 0.12 }
    );
    els.forEach((e) => io.observe(e));
    return () => { io.disconnect(); document.documentElement.classList.remove("ss-js"); };
  }, []);

  function onMove(e: React.PointerEvent<HTMLElement>) {
    if (e.pointerType === "touch" || !stage.current) return;
    const r = e.currentTarget.getBoundingClientRect();
    stage.current.style.setProperty("--rx", `${((e.clientX - r.left) / r.width - 0.5) * 28}deg`);
    stage.current.style.setProperty("--ry", `${-((e.clientY - r.top) / r.height - 0.5) * 20}deg`);
  }
  function onLeave() {
    stage.current?.style.setProperty("--rx", "0deg");
    stage.current?.style.setProperty("--ry", "0deg");
  }

  const faces: [string, string, string][] = [
    ["ss-f1", "ss-bg-navy", "shield"], ["ss-f2", "ss-bg-red", "alert"], ["ss-f3", "ss-bg-orange", "package"],
    ["ss-f4", "ss-bg-yellow", "qr"], ["ss-f5", "ss-bg-sand", "link"], ["ss-f6", "ss-bg-deep", "pin"],
  ];

  return (
    <div className="overflow-x-clip">
      {/* NAV */}
      <header className="fixed inset-x-0 top-0 z-40 px-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="mx-auto max-w-6xl rounded-2xl bg-sand-light/85 px-4 py-2.5 shadow-card ring-1 ring-navy/10 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5">
              <LogoMark size={38} />
              <Wordmark className="text-2xl" />
            </Link>
            <nav className="hidden items-center gap-8 md:flex">
              {nav.map(([label, href]) => (
                <a key={href} href={href} className="ss-link font-semibold text-ink/80 hover:text-navy">{label}</a>
              ))}
            </nav>
            <div className="hidden items-center gap-4 md:flex">
              <Link href="/login" className="ss-link font-semibold text-navy">Log in</Link>
              <Link href="/login?mode=register" className="ss-btn rounded-xl bg-navy px-5 py-2.5 font-bold text-sand-light shadow-glow">Join now</Link>
            </div>
            <button className="rounded-lg p-2 text-navy md:hidden" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen(!open)}>
              {open ? <Icon name="x" size={24} /> : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
              )}
            </button>
          </div>
          {open && (
            <div className="mt-3 space-y-1 border-t border-navy/10 pt-3 md:hidden">
              {nav.map(([label, href]) => (
                <a key={href} href={href} onClick={() => setOpen(false)} className="block rounded-xl px-3 py-3 text-lg font-semibold text-ink hover:bg-navy/5">{label}</a>
              ))}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <Link href="/login" className="rounded-xl bg-white py-3 text-center font-bold text-navy ring-1 ring-navy/15">Log in</Link>
                <Link href="/login?mode=register" className="rounded-xl bg-navy py-3 text-center font-bold text-sand-light">Join now</Link>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* HERO */}
      <section onPointerMove={onMove} onPointerLeave={onLeave} className="relative overflow-hidden pb-16 pt-32 lg:pb-28 lg:pt-44">
        <Blob className="ss-drift pointer-events-none absolute -right-40 -top-40 h-[36rem] w-[36rem] opacity-60" fill="#FCBF49" />
        <Blob className="ss-drift pointer-events-none absolute -bottom-56 -left-40 h-[34rem] w-[34rem] opacity-25" fill="#F77F00" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <span className="ss-rise ss-eyebrow inline-flex items-center gap-2 rounded-full bg-white/70 px-4 py-1.5 text-[11px] text-navy ring-1 ring-navy/15 backdrop-blur" style={d("0s")}>
              <span className="h-2 w-2 rounded-full bg-red" /> Blockchain community emergency network
            </span>
            <h1 className="mt-6 font-display text-[length:clamp(3rem,9vw,6.5rem)] font-extrabold leading-[0.95] tracking-tight text-navy">
              <span className="ss-rise block" style={d("0.1s")}>Building trust</span>
              <span className="ss-rise block bg-gradient-to-r from-red via-red to-orange bg-clip-text pr-2 font-serif text-[1.18em] font-normal italic leading-[0.95] tracking-normal text-transparent" style={d("0.25s")}>
                when it matters most.
              </span>
            </h1>
            <p className="ss-rise mt-7 font-serif text-3xl italic leading-tight text-navy sm:text-4xl" style={d("0.4s")}>
              &ldquo;Trust in every transaction, <span className="text-orange-deep">help in every crisis.</span>&rdquo;
            </p>
            <p className="ss-rise mt-5 max-w-xl text-lg leading-relaxed text-muted sm:text-xl" style={d("0.5s")}>
              Share generators, water pumps, first-aid kits and boats with verified neighbours. Every handover is signed by QR and recorded on the blockchain, so nobody has to wonder who has what.
            </p>
            <div className="ss-rise mt-8 flex flex-wrap gap-3" style={d("0.6s")}>
              <Link href="/login?mode=register" className="ss-btn rounded-2xl bg-navy px-8 py-4 text-lg font-bold text-sand-light shadow-glow">Join your community</Link>
              <Link href="/login" className="ss-btn rounded-2xl bg-yellow px-8 py-4 text-lg font-bold text-navy shadow-gold">Log in</Link>
            </div>
            <ul className="ss-rise mt-8 flex flex-wrap gap-x-6 gap-y-2 font-semibold text-ink/80" style={d("0.7s")}>
              {["Admin-verified members", "QR handovers", "Works on phone and laptop"].map((x) => (
                <li key={x} className="flex items-center gap-2"><Icon name="check" size={18} className="text-orange-deep" />{x}</li>
              ))}
            </ul>
          </div>

          <div className="ss-scene relative mx-auto h-[400px] w-full max-w-[540px] sm:h-[500px]">
            <div ref={stage} className="ss-stage absolute inset-0">
              <div className="absolute inset-8 rounded-full bg-yellow/50 blur-3xl" />
              <div className="ss-3d absolute inset-0 flex items-center justify-center">
                <div className="ss-cube">
                  {faces.map(([pos, bg, icon]) => (
                    <div key={pos} className={`ss-face ${pos} ${bg}`}><Icon name={icon} size={50} /></div>
                  ))}
                </div>
              </div>
              <div className="ss-3d absolute left-0 top-2 sm:left-2" style={{ transform: "translateZ(120px)" }}>
                <div className="ss-float rounded-2xl bg-white p-3 shadow-soft ring-1 ring-navy/10">
                  <QrArt size={78} />
                  <p className="ss-eyebrow mt-1.5 text-center text-[10px] text-navy">Handover QR</p>
                </div>
              </div>
              <div className="ss-3d absolute right-0 top-14" style={{ transform: "translateZ(160px)" }}>
                <div className="ss-float flex items-center gap-2 rounded-2xl bg-yellow px-4 py-2.5 font-bold text-navy shadow-soft" style={{ animationDelay: "-2s" }}>
                  <Icon name="check" size={16} /> Verified on-chain
                </div>
              </div>
              <div className="ss-3d absolute bottom-6 left-1 sm:left-4" style={{ transform: "translateZ(80px)" }}>
                <div className="ss-float w-44 rounded-2xl bg-white p-3 shadow-soft ring-1 ring-navy/10" style={{ animationDelay: "-4s" }}>
                  <p className="ss-eyebrow text-[10px] text-muted">Trust score</p>
                  <div className="mt-1.5 h-2.5 rounded-full bg-sand"><div className="h-2.5 w-[88%] rounded-full bg-gradient-to-r from-navy to-orange" /></div>
                  <p className="mt-1.5 text-xs font-semibold text-navy">Builds with every return</p>
                </div>
              </div>
              <div className="ss-3d absolute bottom-16 right-0" style={{ transform: "translateZ(140px)" }}>
                <div className="ss-float flex items-center gap-2 rounded-2xl bg-red px-4 py-2.5 font-bold text-white shadow-danger" style={{ animationDelay: "-1s" }}>
                  <Icon name="alert" size={16} /> Urgent: water needed
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MARQUEE */}
      <div className="overflow-hidden bg-navy py-5 text-sand-light" aria-hidden="true">
        <div className="ss-marquee flex w-max">
          {[0, 1].map((k) => (
            <div key={k} className="flex shrink-0 gap-10 pr-10">
              {WORDS.map((w) => (
                <span key={w + k} className="flex items-center gap-10 font-serif text-3xl italic">
                  {w} <span className="text-yellow">&#10022;</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* HOW */}
      <section id="how" className="scroll-mt-20 bg-sand-light">
        <div className="mx-auto max-w-6xl px-5 py-24">
          <div className="ss-reveal max-w-3xl">
            <p className="ss-eyebrow text-orange-deep">01 / How it works</p>
            <h2 className="mt-3 font-display text-[length:clamp(2.2rem,5vw,3.75rem)] font-extrabold leading-[1.02] text-navy">
              Four steps from stranger to <Em className="text-red">trusted neighbour</Em>
            </h2>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <div key={s.n} className="ss-reveal" style={{ transitionDelay: `${i * 90}ms` }}>
                <Tilt className="h-full rounded-3xl bg-white p-7 shadow-card ring-1 ring-black/5">
                  <div className="ss-pop">
                    <div className="flex items-center justify-between">
                      <span className={`flex h-14 w-14 items-center justify-center rounded-2xl ${s.tile}`}><Icon name={s.icon} size={26} /></span>
                      <span className="font-display text-6xl font-extrabold leading-none text-navy/10">{s.n}</span>
                    </div>
                    <h3 className="mt-6 font-display text-2xl font-bold leading-snug text-navy">{s.t}</h3>
                    <p className="mt-2 text-base leading-relaxed text-muted">{s.d}</p>
                  </div>
                </Tilt>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="relative scroll-mt-20 overflow-hidden bg-navy-deep py-24 text-sand-light">
        <Blob className="ss-drift pointer-events-none absolute -left-40 top-10 h-[30rem] w-[30rem] opacity-20" fill="#F77F00" />
        <Blob className="ss-drift pointer-events-none absolute -right-40 bottom-0 h-[30rem] w-[30rem] opacity-20" fill="#FCBF49" />
        <div className="relative mx-auto max-w-6xl px-5">
          <div className="ss-reveal max-w-3xl">
            <p className="ss-eyebrow text-yellow">02 / Features</p>
            <h2 className="mt-3 font-display text-[length:clamp(2.2rem,5vw,3.75rem)] font-extrabold leading-[1.02]">
              Trust that is <Em className="text-yellow">checked, not assumed</Em>
            </h2>
            <p className="mt-4 text-lg text-sand-light/70 sm:text-xl">Six things SafeShare does so you never have to take a stranger&apos;s word for it.</p>
          </div>
          <div className="mt-12 grid gap-5 lg:grid-cols-6">
            {FEATURES.map((f, i) => (
              <div key={f.t} className={`ss-reveal ${f.span}`} style={{ transitionDelay: `${(i % 3) * 90}ms` }}>
                <Tilt className="ss-feat h-full rounded-3xl p-7 ring-1 ring-white/10" style={{ "--c": f.c, "--ic": f.ic } as CSSProperties}>
                  <div className="ss-pop relative">
                    <div className="flex items-center justify-between">
                      <span className="ss-ico flex h-14 w-14 items-center justify-center rounded-2xl"><Icon name={f.icon} size={26} /></span>
                      <span className="ss-eyebrow text-[11px]" style={{ color: f.c === "#D62828" ? "#ff8a8a" : f.c }}>{f.tag}</span>
                    </div>
                    <h3 className="mt-6 font-display text-2xl font-bold sm:text-3xl">{f.t}</h3>
                    <p className="mt-2 text-base leading-relaxed text-sand-light/70 sm:text-lg">{f.d}</p>
                    <Visual k={f.k} />
                  </div>
                </Tilt>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-5 py-24">
        <div className="ss-reveal relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-gradient-to-br from-yellow to-orange px-6 py-20 text-center text-navy-deep shadow-gold">
          <Blob className="ss-drift pointer-events-none absolute -right-24 -top-24 h-80 w-80 opacity-30" fill="#D62828" />
          <Blob className="ss-drift pointer-events-none absolute -bottom-28 -left-20 h-80 w-80 opacity-25" fill="#003049" />
          <h2 className="relative font-display text-[length:clamp(2.4rem,6vw,4.5rem)] font-extrabold leading-[1]">
            Be ready before the <Em>next emergency.</Em>
          </h2>
          <p className="relative mx-auto mt-4 max-w-xl font-serif text-2xl italic text-navy-deep/85 sm:text-3xl">Trust in every transaction, help in every crisis.</p>
          <div className="relative mt-9 flex flex-wrap justify-center gap-3">
            <Link href="/login?mode=register" className="ss-btn rounded-2xl bg-navy px-8 py-4 text-lg font-bold text-sand-light shadow-glow">Create your account</Link>
            <Link href="/login" className="ss-btn rounded-2xl bg-sand-light px-8 py-4 text-lg font-bold text-navy">Log in</Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer id="contact" className="bg-navy px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-14 text-sand-light/75">
        <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-3">
              <LogoMark size={48} />
              <Wordmark dark className="text-2xl" />
            </div>
            <p className="mt-5 max-w-xs font-serif text-2xl italic text-sand-light">Building trust when it matters most.</p>
            <p className="mt-1 max-w-xs text-base text-sand-light/55">Trust in every transaction, help in every crisis.</p>
          </div>
          <div className="space-y-2.5">
            <p className="ss-eyebrow text-yellow">Explore</p>
            {nav.filter(([, h]) => h !== "#contact").map(([label, href]) => (
              <a key={href} href={href} className="ss-link block w-fit hover:text-sand-light">{label}</a>
            ))}
            <Link href="/login" className="ss-link block w-fit hover:text-sand-light">Log in</Link>
            <Link href="/login?mode=register" className="ss-link block w-fit hover:text-sand-light">Join now</Link>
          </div>
          {hasContact && (
            <div className="space-y-2.5">
              <p className="ss-eyebrow text-yellow">Contact</p>
              {SITE.email && <a href={`mailto:${SITE.email}`} className="ss-link block w-fit break-all hover:text-sand-light">{SITE.email}</a>}
              {SITE.phone && <a href={telHref(SITE.phone)} className="ss-link block w-fit hover:text-sand-light">{SITE.phone}</a>}
            </div>
          )}
        </div>
        <p className="mx-auto mt-12 max-w-6xl border-t border-sand-light/10 pt-6 font-mono text-xs text-sand-light/45">&copy; {new Date().getFullYear()} SafeShare. A community emergency resource network.</p>
      </footer>
    </div>
  );
}