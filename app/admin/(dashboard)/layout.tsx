import { connection } from "next/server";
import AdminShell from "@/components/admin/AdminShell";
import { requireAdmin } from "@/lib/admin/auth";

export const instant = false;

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await connection();
  const session = await requireAdmin();
  return <AdminShell email={session.email}>{children}</AdminShell>;
}
