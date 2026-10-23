"use client";
import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";

// Live camera QR scanner. Needs https or localhost (browser rule for camera access).
export default function QrScanner({ onResult }: { onResult: (text: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const cb = useRef(onResult);
  const [err, setErr] = useState("");

  useEffect(() => {
    cb.current = onResult;
  });

  useEffect(() => {
    let stream: MediaStream | null = null;
    let raf = 0;
    let stopped = false;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setErr("Live camera scanning needs https or localhost on this device. Use \u201cTake a photo of the QR\u201d below instead.");
        return;
      }
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (stopped) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        stream = s;
        const v = videoRef.current!;
        v.srcObject = s;
        v.setAttribute("playsinline", "true");
        await v.play();

        let last = 0;
        const tick = (now: number) => {
          if (stopped) return;
          if (now - last > 120 && v.readyState >= 2 && v.videoWidth && ctx) {
            last = now;
            const scale = Math.min(1, 640 / v.videoWidth);
            canvas.width = Math.round(v.videoWidth * scale);
            canvas.height = Math.round(v.videoHeight * scale);
            ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
            const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(img.data, img.width, img.height, { inversionAttempts: "dontInvert" });
            if (code?.data) {
              stopped = true;
              cb.current(code.data);
              return;
            }
          }
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      } catch {
        setErr("Could not open the camera. Allow camera access, or use \u201cTake a photo of the QR\u201d below.");
      }
    }

    start();
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <div className="relative overflow-hidden rounded-2xl bg-black">
      <video ref={videoRef} muted playsInline className="aspect-square w-full object-cover" />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-3/5 w-3/5 rounded-2xl border-4 border-white/80" />
      </div>
      {err && <p className="absolute inset-x-0 bottom-0 bg-black/70 p-3 text-xs text-white">{err}</p>}
    </div>
  );
}