"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { trustScore } from "@/lib/trust";
import { Icon } from "@/components/Icon";

export default function ProfilePage() {
  const router = useRouter();
  const [s, setS] = useState<any>(null);

  useEffect(() => {
    api("/api/me/status").then((r) => r.ok && setS(r.data));
  }, []);

  async function logout() {
    await api("/api/auth/logout", "POST");
    router.push("/login");
    router.refresh();
  }

  const card = "rounded-2xl bg-white p-4 shadow-card";
  const t = s ? trustScore(s.stats) : null;

  return (<div className="mx-auto max-w-xl space-y-5">
      <div className={`${card} flex items-center gap-4`}>
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-light text-2xl font-bold text-primary">
          {s ? s.username[0].toUpperCase() : "?"}
        </div>
        <div>
          <p className="text-lg font-bold">{s?.username ?? "..."}</p>
          <p className="text-xs uppercase text-muted">{s?.role}</p>
          {s && (
            <p className={`text-sm font-semibold ${s.verified ? "text-emerald-600" : "text-amber-600"}`}>
              {s.blacklisted ? "Blacklisted" : s.verified ? "Verified on-chain" : "Not verified yet"}
            </p>
          )}
        </div>
      </div>

      {s && t && (
        <div className="grid grid-cols-2 gap-3">
          <div className={card}><p className="text-xs text-muted">Credits</p><p className="text-lg font-bold">{s.credits}</p></div>
          <div className={card}><p className="text-xs text-muted">Trust score</p><p className="text-lg font-bold">{t.score}/100</p></div>
        </div>
      )}

      {s && (
        <div className={card}>
          <p className="text-xs text-muted">Your blockchain account</p>
          <p className="break-all font-mono text-xs">{s.address}</p>
        </div>
      )}

      {s?.role === "admin" && (
        <Link href="/admin" className={`${card} flex items-center justify-between font-semibold`}>
          Admin panel <Icon name="shield" size={18} className="text-primary" />
        </Link>
      )}

      <button onClick={logout} className="flex w-full items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white py-3 font-semibold active:bg-stone-50">
        <Icon name="logout" size={18} /> Log out
      </button>

      <p className="pt-2 text-center text-xs text-muted">
        SafeShare: Building trust when it matters most.
        <br />
        Trust in every transaction, help in every crisis.
      </p>
    </div>
  );
}