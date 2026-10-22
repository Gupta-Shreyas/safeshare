"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<{ type: "err" | "ok"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    if (mode === "register") {
      const r = await api("/api/auth/register", "POST", { username, email, password });
      if (r.ok) {
        setMode("login");
        setMsg({ type: "ok", text: "Account created. Ask an admin to verify you, then log in." });
      } else setMsg({ type: "err", text: r.data.error ?? "Registration failed" });
    } else {
      const r = await api("/api/auth/login", "POST", { username, password });
      if (r.ok) {
        router.push("/dashboard");
        router.refresh();
      } else setMsg({ type: "err", text: r.data.error ?? "Login failed" });
    }
    setBusy(false);
  }

  const input = "w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 outline-none focus:border-emerald-500";

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950 p-8 shadow-xl">
        <h1 className="text-3xl font-bold text-emerald-400">SafeShare</h1>
        <p className="text-slate-400 mb-6">Community emergency resource network on the blockchain</p>

        <div className="flex mb-6 rounded-lg bg-slate-900 p-1">
          {(["login", "register"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => { setMode(m); setMsg(null); }}
              className={`flex-1 rounded-md py-2 text-sm font-medium capitalize ${mode === m ? "bg-emerald-600 text-white" : "text-slate-400"}`}
            >
              {m}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-4">
          <input className={input} placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
          {mode === "register" && (
            <input className={input} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          )}
          <input
            className={input}
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
          />
          {mode === "register" && (
            <p className="text-xs text-slate-500">Password: 8+ characters with an uppercase letter, a lowercase letter and a number.</p>
          )}
          {msg && (
            <p className={`text-sm rounded-lg px-3 py-2 ${msg.type === "err" ? "bg-red-950 text-red-300" : "bg-emerald-950 text-emerald-300"}`}>
              {msg.text}
            </p>
          )}
          <button disabled={busy} className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-500 py-2 font-semibold disabled:opacity-50">
            {busy ? "Please wait..." : mode === "login" ? "Log in" : "Create account"}
          </button>
        </form>
      </div>
    </div>
  );
}