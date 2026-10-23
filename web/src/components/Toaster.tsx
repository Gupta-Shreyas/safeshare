"use client";
import { useEffect, useState } from "react";
import { Icon } from "./Icon";

type T = { id: number; text: string; type: "ok" | "error" };

export default function Toaster() {
  const [list, setList] = useState<T[]>([]);

  useEffect(() => {
    let n = 0;
    const h = (e: Event) => {
      const d = (e as CustomEvent).detail as { text: string; type: "ok" | "error" };
      const id = ++n;
      setList((l) => [...l.slice(-2), { id, ...d }]);
      setTimeout(() => setList((l) => l.filter((x) => x.id !== id)), 4200);
    };
    window.addEventListener("ss-toast", h);
    return () => window.removeEventListener("ss-toast", h);
  }, []);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-[max(1rem,env(safe-area-inset-top))] z-[100] flex flex-col items-center gap-2 px-4 lg:inset-x-auto lg:bottom-6 lg:right-6 lg:top-auto lg:items-end"
    >
      {list.map((t) => (
        <div
          key={t.id}
          role={t.type === "error" ? "alert" : "status"}
          className={`ss-toast pointer-events-auto flex max-w-sm items-start gap-2 rounded-2xl px-4 py-3 text-sm font-semibold shadow-soft ${
            t.type === "ok" ? "bg-navy text-beige" : "bg-white text-danger ring-1 ring-danger/30"
          }`}
        >
          <Icon name={t.type === "ok" ? "check" : "alert"} size={18} className="mt-0.5 shrink-0" />
          <span className="break-words">{t.text}</span>
        </div>
      ))}
    </div>
  );
}