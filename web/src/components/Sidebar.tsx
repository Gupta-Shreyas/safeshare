"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { Icon } from "./Icon";
import { LogoMark, Wordmark } from "./Logo";

export default function Sidebar({ username, role }: { username: string; role: string }) {
  const path = usePathname();
  const router = useRouter();
  const links = [
    { href: "/dashboard", label: "Home", icon: "home" },
    { href: "/resources", label: "Items", icon: "list" },
    { href: "/scan", label: "Scan & My QR", icon: "qr" },
    { href: "/chain", label: "Activity", icon: "activity" },
    { href: "/profile", label: "Profile", icon: "user" },
    ...(role === "admin" ? [{ href: "/admin", label: "Admin", icon: "shield" }] : []),
  ];

  async function logout() {
    await api("/api/auth/logout", "POST");
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="sticky top-0 hidden h-screen flex-col justify-between overflow-hidden bg-gradient-to-b from-navy via-navy to-navy-deep p-6 text-sand-light lg:flex">
      <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-yellow/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-red/20 blur-3xl" />

      <div className="relative">
        <Link href="/dashboard" className="flex items-center gap-3">
          <LogoMark size={56} />
          <Wordmark dark className="text-2xl" />
        </Link>
        <nav className="mt-10 space-y-1.5">
          {links.map((l) => {
            const active = path.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 font-semibold transition ${
                  active ? "bg-yellow text-navy shadow-gold" : "text-sand-light/70 hover:bg-white/10 hover:text-sand-light"
                }`}
              >
                <Icon name={l.icon} size={18} />
                {l.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="relative space-y-4">
        <p className="px-1 font-serif text-lg italic leading-snug text-sand-light/80">
          Building trust when it matters most.
          <br />
          <span className="text-yellow">Trust in every transaction, help in every crisis.</span>
        </p>
        <div className="flex items-center gap-3 rounded-2xl bg-white/10 p-3 ring-1 ring-white/10">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow font-display font-extrabold text-navy">
            {username[0]?.toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">{username}</p>
            <p className="ss-eyebrow text-[10px] text-sand-light/55">{role}</p>
          </div>
          <button onClick={logout} aria-label="Log out" className="rounded-lg p-2 text-sand-light/70 hover:bg-white/10 hover:text-sand-light">
            <Icon name="logout" size={18} />
          </button>
        </div>
      </div>
    </aside>
  );
}