// The logo is 1:1, so it fills a true square edge to edge. No padding, no plate.
export function LogoMark({ size = 40, className = "" }: { size?: number; className?: string }) {
  return (
    <span
      className={`relative inline-block shrink-0 overflow-hidden bg-white shadow-card ring-1 ring-black/10 ${className}`}
      style={{ width: size, height: size, borderRadius: Math.round(size * 0.24) }}
    >
      <img
        src="/logo.png"
        alt="SafeShare"
        width={size}
        height={size}
        decoding="async"
        className="absolute inset-0 block h-full w-full object-cover"
      />
    </span>
  );
}

export function Wordmark({ className = "", dark = false }: { className?: string; dark?: boolean }) {
  return (
    <span className={`font-display font-extrabold tracking-tight ${className}`}>
      <span className={dark ? "text-sand-light" : "text-navy"}>Safe</span>
      <span className={dark ? "text-yellow" : "text-orange-deep"}>Share</span>
    </span>
  );
}