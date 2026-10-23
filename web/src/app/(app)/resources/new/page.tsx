"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/client";

const CATS = ["Power", "Water", "Medical", "Shelter", "Transport", "Tools", "Other"];
const COND = ["", "Poor", "Fair", "Good", "Very good", "Like new"];

// Phone photos are several MB. Shrink to a 1280 px JPEG before upload (the server accepts up to 2 MB).
async function shrink(file: File): Promise<File> {
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 1280 / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * scale);
    c.height = Math.round(bmp.height * scale);
    c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise<Blob | null>((res) => c.toBlob(res, "image/jpeg", 0.82));
    return blob ? new File([blob], "photo.jpg", { type: "image/jpeg" }) : file;
  } catch {
    return file;
  }
}

export default function NewResource() {
  const router = useRouter();
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setBusy(true);
    setErr("");
    const fd = new FormData(form);
    const photo = fd.get("photo");
    if (photo instanceof File && photo.size > 0) fd.set("photo", await shrink(photo));
    const res = await fetch("/api/resources", { method: "POST", body: fd });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      toast("Item registered on the blockchain"); router.push("/resources");
      router.refresh();
    } else {
      setErr(data.error ?? "Failed to add resource");
      setBusy(false);
    }
  }

  const field =
    "w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-base text-ink outline-none placeholder:text-stone-400 focus:border-primary";

  return (<div className="mx-auto max-w-xl space-y-4">
      <h1 className="text-xl font-bold">Register an item</h1>
      <p className="text-sm text-muted">
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
          <label className="text-sm text-muted">
            Deposit (credits)
            <input name="deposit" type="number" min={1} max={100} defaultValue={20} className={`${field} mt-1`} />
          </label>
          <label className="text-sm text-muted">
            Condition now
            <select name="condition" defaultValue="4" className={`${field} mt-1`}>
              {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} - {COND[n]}</option>)}
            </select>
          </label>
        </div>
        <label className="block text-sm text-muted">
          Photo
          <input
            name="photo"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className={`${field} mt-1`}
            onChange={(e) => {
              const f = e.target.files?.[0];
              setPreview(f ? URL.createObjectURL(f) : "");
            }}
          />
        </label>
        {preview && <img src={preview} alt="preview" className="h-40 w-full rounded-2xl object-cover" />}
        {err && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}
        <button
          disabled={busy}
          className="w-full rounded-xl bg-primary py-3 text-base font-bold text-white shadow-glow transition hover:bg-primary-hover active:scale-95 disabled:opacity-50"
        >
          {busy ? "Writing to blockchain..." : "Register on-chain"}
        </button>
      </form>
    </div>
  );
}