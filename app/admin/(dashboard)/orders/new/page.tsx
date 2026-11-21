import Link from "next/link";
import { connection } from "next/server";
import { ArrowLeft } from "lucide-react";
import { requireAdmin } from "@/lib/admin/auth";
import OrderForm from "@/app/admin/(dashboard)/orders/OrderForm";

export const metadata = {
  title: "Create Order | SANRA Internal",
};

export const instant = false;

export default async function NewOrderPage() {
  await connection();
  await requireAdmin();

  return (
    <div className="space-y-6 pb-12">
      <div className="space-y-3">
        <Link
          href="/admin/orders"
          className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-500 hover:text-black"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to orders
        </Link>
        <div>
          <h1 className="text-2xl font-black text-[#111111] tracking-tight">
            Create Order
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            The tracking code is generated randomly by the database. Full customer
            details stay private.
          </p>
        </div>
      </div>

      <OrderForm mode="create" />
    </div>
  );
}
