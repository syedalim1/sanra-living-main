import type { Metadata } from "next";
import LoginForm from "@/app/admin/login/LoginForm";

export const metadata: Metadata = {
  title: "SANRA Staff Access",
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="text-lg font-black uppercase tracking-tight text-[#111111]">
            SANRA LIVING
          </p>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-500 mt-1">
            Internal Factory Console
          </p>
        </div>

        <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-6 sm:p-7">
          <h1 className="text-base font-bold text-[#111111] mb-1">Staff sign in</h1>
          <p className="text-xs text-neutral-500 mb-5">
            Authorized factory staff only.
          </p>
          <LoginForm />
        </div>

        <p className="text-center text-[11px] text-neutral-400 mt-6">
          SANRA LIVING • SIDCO Coimbatore
        </p>
      </div>
    </div>
  );
}
