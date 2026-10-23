"use client";
import { useCallback, useEffect, useState } from "react";
import jsQR from "jsqr";
import QrScanner from "@/components/QrScanner";
import MyQr from "@/components/MyQr";
import { Icon } from "@/components/Icon";
import { api } from "@/lib/client";

const COND = ["", "Poor", "Fair", "Good", "Very good", "Like new"];
const lc = (a?: string) => (a ?? "").toLowerCase();

// Reads the item number and step out of the QR text for display only. The server verifies the signature.
function peek(token: string): { r: number; k: "checkout" | "return" } | null {
  try {
    const data = token.trim().split(".")[0].replace(/-/g, "+").replace(/_/g, "/");
    const p = JSON.parse(atob(data + "=".repeat((4 - (data.length % 4)) % 4)));
    return typeof p.r === "number" && (p.k === "checkout" || p.k === "return") ? { r: p.r, k: p.k } : null;
  } catch {
    return null;
  }
}

export default function ScanPage() {
  const [tab, setTab] = useState<"scan" | "qr">("scan");
  const [cam, setCam] = useState(false);
  const [token, setToken] = useState("");
  const [item, setItem] = useState<any>(null);
  const [waiting, setWaiting] = useState<any[]>([]);
  const [cond, setCond] = useState(4);
  const [care, setCare] = useState(5);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (window.location.hash === "#qr") setTab("qr");
  }, []);

  const info = peek(token);
  const rid = info?.r ?? 0;

  useEffect(() => {
    api("/api/resources").then((r) => {
      if (!r.ok) return;
      setWaiting(r.data.items.filter((x: any) => lc(x.owner?.address) === lc(r.data.me) && [2, 3, 4].includes(x.status)));
      if (rid) setItem(r.data.items.find((x: any) => x.id === rid) ?? null);
    });
    if (!rid) setItem(null);
  }, [rid, msg]);

  const accept = useCallback((text: string) => {
    setCam(false);
    setMsg(null);
    setToken(text.trim());
  }, []);

  async function fromPhoto(file: File) {
    setMsg(null);
    try {
      const bmp = await createImageBitmap(file);
      const scale = Math.min(1, 1400 / Math.max(bmp.width, bmp.height));
      const c = document.createElement("canvas");
      c.width = Math.round(bmp.width * scale);
      c.height = Math.round(bmp.height * scale);
      const ctx = c.getContext("2d", { willReadFrequently: true })!;
      ctx.drawImage(bmp, 0, 0, c.width, c.height);
      const img = ctx.getImageData(0, 0, c.width, c.height);
      const code = jsQR(img.data, img.width, img.height);
      if (code?.data) accept(code.data);
      else setMsg({ ok: false, text: "No QR code found in that photo. Move closer, keep it sharp and try again." });
    } catch {
      setMsg({ ok: false, text: "Could not read that photo." });
    }
  }

  async function confirm() {
    if (!info) return;
    setBusy(true);
    setMsg(null);
    const body =
      info.k === "checkout"
        ? { id: info.r, action: "checkout", conditionBefore: cond, token }
        : { id: info.r, action: "confirmReturn", conditionAfter: cond, careRating: care, token };
    const r = await api("/api/resources/action", "POST", body);
    setMsg(r.ok ? { ok: true, text: `Confirmed on-chain. Transaction ${r.data.txHash}` } : { ok: false, text: `Blocked: ${r.data.error}` });
    if (r.ok) { setToken(""); setItem(null); }
    setBusy(false);
  }

  const field = "w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-base";
  const card = "rounded-3xl bg-white p-5 shadow-card ring-1 ring-stone-100";

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold">QR handover</h1>
        <p className="text-sm text-muted">Borrowers show a code. Owners scan it. The handover is signed and written to the blockchain.</p>
      </div>

      <div className="flex rounded-2xl bg-white p-1 shadow-card ring-1 ring-stone-100">
        {([["scan", "Scan a code"], ["qr", "My QR"]] as const).map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)} className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition ${tab === k ? "bg-gradient-to-r from-[#003049] to-[#0a4766] text-white shadow-glow" : "text-muted"}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === "qr" && <MyQr />}

      {tab === "scan" && (
        <>
          {waiting.length > 0 && (
            <div className="rounded-2xl border border-accent/30 bg-accent/10 p-3 text-sm text-primary">
              <b>Waiting on you:</b> {waiting.map((w) => `${w.title} (${w.borrower?.name ?? "?"})`).join(", ")}. Ask the borrower to open <b>My QR</b>.
            </div>
          )}

          {cam ? (
            <div className="space-y-2">
              <QrScanner onResult={accept} />
              <button onClick={() => setCam(false)} className="w-full rounded-xl bg-stone-100 py-2 text-sm font-semibold">Stop camera</button>
            </div>
          ) : (
            <button onClick={() => setCam(true)} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#003049] to-[#0a4766] py-4 font-bold text-white shadow-glow transition hover:brightness-110 active:scale-95">
              <Icon name="camera" size={20} /> Start camera scan
            </button>
          )}

          <label className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-white py-3 text-sm font-semibold shadow-card ring-1 ring-stone-100 active:bg-stone-50">
            <Icon name="camera" size={18} /> Take a photo of the QR
            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) fromPhoto(f); e.target.value = ""; }} />
          </label>

          <div>
            <p className="mb-1 text-xs text-muted">Or paste the code text</p>
            <textarea rows={2} value={token} onChange={(e) => setToken(e.target.value)} placeholder="Paste the borrower's code here" className="w-full rounded-xl border border-stone-200 bg-white p-3 font-mono text-xs" />
          </div>

          {token && !info && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">That does not look like a SafeShare QR code.</p>}

          {info && (
            <div className={`${card} space-y-3`}>
              <p className="text-xs font-bold uppercase tracking-wider text-accent">{info.k === "checkout" ? "Handover (checkout)" : "Return"} - item #{info.r}</p>
              {item && (
                <div className="flex items-center gap-3">
                  <img loading="lazy" src={`/api/resources/image?id=${item.id}`} alt="" className="h-14 w-14 rounded-xl bg-stone-100 object-cover" />
                  <div className="min-w-0 text-sm">
                    <p className="truncate font-bold">{item.title}</p>
                    <p className="text-xs text-muted">Borrower: {item.borrower?.name ?? "-"}{item.borrowerTrust && <> - Trust {item.borrowerTrust.score}/100</>}</p>
                  </div>
                </div>
              )}
              <label className="block text-sm text-muted">
                {info.k === "checkout" ? "Condition now (before lending)" : "Condition after return"}
                <select className={`${field} mt-1`} value={cond} onChange={(e) => setCond(Number(e.target.value))}>
                  {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} - {COND[n]}</option>)}
                </select>
              </label>
              {info.k === "return" && (
                <label className="block text-sm text-muted">
                  Care rating for the borrower
                  <select className={`${field} mt-1`} value={care} onChange={(e) => setCare(Number(e.target.value))}>
                    {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} - {COND[n]}</option>)}
                  </select>
                </label>
              )}
              <button disabled={busy} onClick={confirm} className="w-full rounded-xl bg-primary py-3 font-bold text-white shadow-glow transition hover:bg-primary-hover active:scale-95 disabled:opacity-50">
                {busy ? "Writing to blockchain..." : "Confirm on blockchain"}
              </button>
            </div>
          )}

          {msg && <p className={`break-all rounded-xl p-3 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{msg.text}</p>}
        </>
      )}
    </div>
  );
}