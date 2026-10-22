"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { api } from "@/lib/client";

export default function Nav({ username, role }: { username: string; role: string }) {
  const path = usePathname();
  const router = useRouter();
  const links = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/resources", label: "Resources" },
    { href: "/chain", label: "Blockchain" },
    ...(role === "admin" ? [{ href: "/admin", label: "Admin" }] : []),
  ];

  async function logout() {
    await api("/api/auth/logout", "POST");
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="border-b border-slate-800 bg-slate-950">
      <div className="mx-auto max-w-6xl flex items-center gap-6 px-6 py-3">
        <span className="text-xl font-bold text-emerald-400">SafeShare</span>
        <nav className="flex gap-1 flex-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-md px-3 py-1.5 text-sm ${path.startsWith(l.href) ? "bg-slate-800 text-white" : "text-slate-400 hover:text-white"}`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <span className="text-sm text-slate-400">
          {username} <span className="ml-1 rounded bg-slate-800 px-2 py-0.5 text-xs uppercase">{role}</span>
        </span>
        <button onClick={logout} className="rounded-md border border-slate-700 px-3 py-1.5 text-sm hover:bg-slate-800">
          Log out
        </button>
      </div>
    </header>
  );
}