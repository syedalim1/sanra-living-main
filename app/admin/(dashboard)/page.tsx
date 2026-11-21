import { redirect } from "next/navigation";
import { connection } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";

export const instant = false;

export default async function AdminIndexPage() {
  await connection();
  await requireAdmin();
  redirect("/admin/rates");
}
