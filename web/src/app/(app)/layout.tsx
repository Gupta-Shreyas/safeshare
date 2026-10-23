import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import Sidebar from "@/components/Sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const s = await getSession();
  if (!s) redirect("/login");
  return (
    <div className="min-h-[100dvh] lg:grid lg:grid-cols-[272px_1fr]">
      <Sidebar username={s.username} role={s.role} />
      <div className="min-w-0">
        <AppHeader username={s.username} />
        <main className="mx-auto w-full max-w-6xl px-5 pb-32 pt-6 lg:px-10 lg:pb-12 lg:pt-8">{children}</main>
      </div>
      <BottomNav />
    </div>
  );
}