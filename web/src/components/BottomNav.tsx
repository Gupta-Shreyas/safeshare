"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./Icon";

function Tab({ href, label, icon, active }: { href: string; label: string; icon: string; active: boolean }) {
  return (
    <Link href={href} className="flex w-16 flex-col items-center gap-1" aria-current={active ? "page" : undefined}>
      <span className={`flex h-8 w-14 items-center justify-center rounded-full transition ${active ? "bg-yellow text-navy" : "text-navy/55"}`}>
        <Icon name={icon} size={20} />
      </span>
      <span className={`text-[10px] font-bold ${active ? "text-navy" : "text-navy/55"}`}>{label}</span>
    </Link>
  );
}

export default function BottomNav() {
  const path = usePathname();
  const on = (h: string) => path.startsWith(h);
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-navy/10 bg-sand-light/90 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-12px_30px_rgba(0,29,46,0.08)] backdrop-blur-xl lg:hidden">
      <div className="mx-auto flex max-w-md items-center justify-between px-3">
        <Tab href="/dashboard" label="Home" icon="home" active={on("/dashboard")} />
        <Tab href="/resources" label="Items" icon="list" active={on("/resources")} />
        <Link
          href="/scan"
          aria-label="Scan or show QR code"
          className="relative -top-6 flex h-14 w-14 items-center justify-center rounded-full border-4 border-sand-light bg-navy text-yellow shadow-glow transition active:scale-95"
        >
          <Icon name="qr" size={24} />
        </Link>
        <Tab href="/chain" label="Activity" icon="activity" active={on("/chain")} />
        <Tab href="/profile" label="Profile" icon="user" active={on("/profile") || on("/admin")} />
      </div>
    </nav>
  );
}