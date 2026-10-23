"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { LogoMark } from "@/components/Logo";
import { Icon } from "@/components/Icon";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<{ type: "err" | "ok"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("mode") === "register") setMode("register");
  }, []);

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

  const input =
    "w-full rounded-xl border-2 border-navy/10 bg-white px-4 py-3 text-base text-ink outline-none transition placeholder:text-navy/40 focus:border-navy focus:ring-4 focus:ring-yellow/40";

  return (
    <div className="min-h-[100dvh] lg:grid lg:grid-cols-[1.1fr_1fr]">
      {/* brand panel (laptop) */}
      <section className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-navy via-navy to-navy-deep p-14 text-sand-light lg:flex">
        <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-yellow/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 h-80 w-80 rounded-full bg-red/25 blur-3xl" />
        <div className="relative flex items-center gap-5">
          <LogoMark size={104} />
          <div>
            <p className="ss-eyebrow text-yellow">Community emergency network</p>
            <p className="mt-1 font-display text-4xl font-extrabold">SafeShare</p>
          </div>
        </div>
        <div className="relative">
          <h1 className="font-display text-6xl font-extrabold leading-[0.98] tracking-tight">
            Building trust
            <span className="block font-serif text-[1.18em] font-normal italic leading-[0.98] tracking-normal text-yellow">when it matters most.</span>
          </h1>
          <p className="mt-6 max-w-md text-lg text-sand-light/75">
            Share generators, pumps, first-aid kits and boats with verified neighbours. Every handover is signed by QR and recorded on the blockchain.
          </p>
          <ul className="mt-6 flex flex-wrap gap-2">
            {["Verified members", "QR handovers", "On-chain records"].map((t) => (
              <li key={t} className="ss-eyebrow flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] ring-1 ring-white/10">
                <Icon name="check" size={13} className="text-yellow" />
                {t}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative font-serif text-2xl italic text-sand-light/80">Trust in every transaction, help in every crisis.</p>
      </section>

      {/* form */}
      <section className="flex min-h-[100dvh] flex-col justify-center px-5 py-8 sm:px-8 lg:min-h-0 lg:px-16">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-6 flex flex-col items-center text-center lg:hidden">
            <LogoMark size={96} />
            <h1 className="mt-4 font-display text-3xl font-extrabold leading-tight text-navy">
              Building trust
              <span className="block font-serif text-[1.15em] font-normal italic tracking-normal text-red">when it matters most.</span>
            </h1>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-soft ring-1 ring-black/5 sm:p-8">
            <h2 className="font-display text-3xl font-extrabold text-navy">{mode === "login" ? "Welcome back" : "Join your community"}</h2>
            <p className="mb-5 mt-1 text-muted">{mode === "login" ? "Log in to borrow, lend and help." : "Create an account, then an admin verifies you."}</p>

            <div className="mb-5 flex rounded-xl bg-sand p-1">
              {(["login", "register"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setMode(m);
                    setMsg(null);
                  }}
                  className={`flex-1 rounded-lg py-2.5 font-bold capitalize transition ${mode === m ? "bg-navy text-sand-light shadow-glow" : "text-navy/70"}`}
                >
                  {m}
                </button>
              ))}
            </div>

            <form onSubmit={submit} className="space-y-4">
              <input
                className={input}
                aria-label="Username"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
              {mode === "register" && (
                <input
                  className={input}
                  aria-label="Email"
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoCapitalize="none"
                  autoCorrect="off"
                />
              )}
              <input
                className={input}
                aria-label="Password"
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
              />
              {mode === "register" && <p className="text-sm text-muted">Password: 8+ characters with an uppercase letter, a lowercase letter and a number.</p>}
              {msg && (
                <p className={`rounded-xl px-3 py-2.5 text-sm font-medium ${msg.type === "err" ? "bg-red/10 text-red" : "bg-yellow/30 text-navy"}`} role={msg.type === "err" ? "alert" : "status"}>
                  {msg.text}
                </p>
              )}
              <button disabled={busy} className="ss-btn w-full rounded-xl bg-navy py-3.5 text-base font-bold text-sand-light shadow-glow disabled:opacity-50">
                {busy ? "Please wait..." : mode === "login" ? "Log in" : "Create account"}
              </button>
            </form>
          </div>
          <p className="mt-6 text-center font-serif text-xl italic text-navy lg:hidden">Trust in every transaction, help in every crisis.</p>
        </div>
      </section>
    </div>
  );
}