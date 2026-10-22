import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import AdminPanel from "./AdminPanel";

export default async function AdminPage() {
  const s = await getSession();
  if (!s || s.role !== "admin") redirect("/dashboard"); // broken-access-control defense
  return <AdminPanel />;
}