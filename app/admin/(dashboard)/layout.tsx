import { connection } from "next/server";
import AdminShell from "@/components/admin/AdminShell";
import { requireAdmin } from "@/lib/admin/auth";
import { createServerClient } from "@/lib/supabase/server";

export const instant = false;

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await connection();
  const session = await requireAdmin();
  const db = createServerClient();

  let newLeadCount = 0;

  try {
    const { count } = await db
      .from("leads")
      .select("*", { count: "exact", head: true })
      .eq("status", "NEW")
      .eq("archived", false);

    newLeadCount = count ?? 0;
  } catch {
    newLeadCount = 0;
  }

  return (
    <AdminShell email={session.email} newLeadCount={newLeadCount}>
      {children}
    </AdminShell>
  );
}
