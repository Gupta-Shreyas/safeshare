import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import Nav from "@/components/Nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const s = await getSession();
  if (!s) redirect("/login");
  return (
    <div className="min-h-screen">
      <Nav username={s.username} role={s.role} />
      <main className="mx-auto max-w-6xl p-6">{children}</main>
    </div>
  );
}