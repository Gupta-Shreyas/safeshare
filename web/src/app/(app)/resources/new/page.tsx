"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const CATS = ["Power", "Water", "Medical", "Shelter", "Transport", "Tools", "Other"];
const COND = ["", "Poor", "Fair", "Good", "Very good", "Like new"];

export default function NewResource() {
  const router = useRouter();
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    setErr("");
    const res = await fetch("/api/resources", { method: "POST", body: fd });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      router.push("/resources");
      router.refresh();
    } else {
      setErr(data.error ?? "Failed to add resource");
      setBusy(false);
    }
  }

  const field = "w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 outline-none focus:border-emerald-500";
  return (
    <div className="max-w-xl space-y-4">
      <h1 className="text-2xl font-bold">Add a resource</h1>
      <p className="text-sm text-slate-400">
        The details stay in the database. Only their cryptographic hashes (plus deposit and condition) go on-chain, so any later
        edit to the details or the photo is detectable.
      </p>
      <form onSubmit={submit} className="space-y-4">
        <input name="title" className={field} placeholder="Title (e.g. Portable generator 2 kW)" />
        <select name="category" className={field} defaultValue="Power">
          {CATS.map((c) => <option key={c}>{c}</option>)}
        </select>
        <textarea name="description" rows={3} className={field} placeholder="Description" />
        <input name="location" className={field} placeholder="Pickup location (e.g. Ward 4 community hall)" />
        <div className="grid grid-cols-2 gap-4">
          <label className="text-sm text-slate-400">
            Deposit (credits)
            <input name="deposit" type="number" min={1} max={100} defaultValue={20} className={field} />
          </label>
          <label className="text-sm text-slate-400">
            Condition now
            <select name="condition" defaultValue="4" className={field}>
              {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} - {COND[n]}</option>)}
            </select>
          </label>
        </div>
        <label className="block text-sm text-slate-400">
          Photo (JPG, PNG or WebP, max 2 MB)
          <input
            name="photo"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className={field}
            onChange={(e) => {
              const f = e.target.files?.[0];
              setPreview(f ? URL.createObjectURL(f) : "");
            }}
          />
        </label>
        {preview && <img src={preview} alt="preview" className="h-40 rounded-lg object-cover" />}
        {err && <p className="rounded-lg bg-red-950 text-red-300 px-3 py-2 text-sm">{err}</p>}
        <button disabled={busy} className="rounded-lg bg-emerald-600 hover:bg-emerald-500 px-5 py-2 font-semibold disabled:opacity-50">
          {busy ? "Writing to blockchain..." : "Register on-chain"}
        </button>
      </form>
    </div>
  );
}