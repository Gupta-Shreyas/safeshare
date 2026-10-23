import Link from "next/link";

export const metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <main className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden px-6 text-center">
      <div className="ss-drift pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-sea/50 blur-2xl" />
      <div className="ss-drift pointer-events-none absolute -bottom-32 -left-24 h-96 w-96 rounded-full bg-navy/20 blur-2xl" />
      <p className="relative font-display text-8xl font-bold text-navy sm:text-9xl">404</p>
      <h1 className="relative mt-2 font-display text-2xl font-bold text-ink">This page wandered off</h1>
      <p className="relative mt-2 max-w-sm text-muted">The link may be old or mistyped. Let&apos;s get you back to safe ground.</p>
      <div className="relative mt-6 flex gap-3">
        <Link href="/" className="ss-btn rounded-xl bg-navy px-6 py-3 font-bold text-beige shadow-glow">Go home</Link>
        <Link href="/login" className="ss-btn rounded-xl bg-white px-6 py-3 font-bold text-navy shadow-card ring-1 ring-navy/10">Log in</Link>
      </div>
    </main>
  );
}