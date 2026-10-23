"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { trustScore, Stats } from "@/lib/trust";
import { Icon } from "./Icon";
import { LogoMark, Wordmark } from "./Logo";

export default function AppHeader({ username }: { username: string }) {
  const [score, setScore] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const r = await api("/api/me/status");
      if (alive && r.ok) setScore(trustScore(r.data.stats as Stats).score);
    };
    load();
    const t = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, 20000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  return (
    <header className="sticky top-0 z-20 border-b border-white/60 bg-white/70 px-5 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-xl lg:px-10 lg:py-4">
      <div className="mx-auto flex max-w-6xl items-center justify-between">
        <div className="flex items-center gap-3 lg:hidden">
          <LogoMark size={40} />
          <Wordmark className="text-lg" />
        </div>
        <p className="hidden text-sm text-muted lg:block">
          Welcome back, <b className="text-ink">{username}</b>
        </p>
        <div className="flex items-center gap-2 rounded-full bg-primary-light px-3.5 py-1.5 text-primary ring-1 ring-primary/10">
          <Icon name="shield" size={14} />
          <span className="text-sm font-bold">{score ?? "--"}/100</span>
          <span className="hidden text-xs font-medium text-primary/70 sm:inline">Trust score</span>
        </div>
      </div>
    </header>
  );
}