import Link from "next/link";
import { Icon } from "./Icon";

export default function EmptyState({
  title, text, href, cta, icon = "package",
}: { title: string; text: string; href?: string; cta?: string; icon?: string }) {
  return (
    <div className="rounded-3xl bg-white p-8 text-center shadow-card ring-1 ring-stone-100">
      <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-light text-primary">
        <Icon name={icon} size={26} />
      </span>
      <p className="font-display text-lg font-bold">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted">{text}</p>
      {href && cta && (
        <Link href={href} className="ss-btn mt-4 inline-block rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-glow">
          {cta}
        </Link>
      )}
    </div>
  );
}