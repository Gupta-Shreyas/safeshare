"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center px-6 text-center">
      <h1 className="font-display text-3xl font-bold text-navy">Something went wrong</h1>
      <p className="mt-2 max-w-sm text-muted">
        We hit an unexpected problem. If you are running locally, check that the Hardhat node and the dev server are still running.
      </p>
      <button onClick={reset} className="ss-btn mt-6 rounded-xl bg-navy px-6 py-3 font-bold text-beige shadow-glow">
        Try again
      </button>
    </main>
  );
}