"use client";

import { useActionState } from "react";
import { Lock, Mail, Loader2 } from "lucide-react";
import { loginAction } from "@/app/admin/login/actions";

const initialState: { error?: string } = {};

export default function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <label
          htmlFor="email"
          className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600"
        >
          Email
        </label>
        <div className="relative">
          <Mail className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="username"
            className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="password"
          className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600"
        >
          Password
        </label>
        <div className="relative">
          <Lock className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>
      </div>

      {state.error && (
        <div
          aria-live="polite"
          className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs font-semibold text-red-800"
        >
          {state.error}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-[#111111] hover:bg-black text-white text-xs font-bold uppercase tracking-wider disabled:bg-neutral-400 transition-colors"
      >
        {pending && <Loader2 className="w-4 h-4 animate-spin" />}
        {pending ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
