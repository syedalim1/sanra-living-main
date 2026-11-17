"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  clearAdminLastSeenCookie,
  createAdminAuthServerClient,
  setAdminLastSeenCookie,
} from "@/lib/admin/auth";
import { isAdminEmail } from "@/lib/admin/guard";

interface LoginState {
  error?: string;
}

const LoginSchema = z.object({
  email: z.string().trim().email().max(200),
  password: z.string().min(1).max(200),
});

const attempts = new Map<string, { count: number; resetTime: number }>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function getClientIp(headerStore: Headers): string {
  return (
    headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headerStore.get("x-real-ip") ||
    "127.0.0.1"
  );
}

function canAttempt(ip: string): boolean {
  const now = Date.now();
  const entry = attempts.get(ip);

  if (!entry || now > entry.resetTime) {
    attempts.set(ip, { count: 1, resetTime: now + WINDOW_MS });
    return true;
  }

  if (entry.count >= MAX_ATTEMPTS) return false;
  entry.count += 1;
  return true;
}

function resetAttempts(ip: string): void {
  attempts.delete(ip);
}

async function failDelay(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 1000));
}

export async function loginAction(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  let signedIn = false;

  try {
    const headerStore = await headers();
    const ip = getClientIp(headerStore);

    if (!canAttempt(ip)) {
      return { error: "Too many attempts. Please try again later." };
    }

    const parsed = LoginSchema.safeParse({
      email: formData.get("email"),
      password: formData.get("password"),
    });

    if (!parsed.success) {
      await failDelay();
      return { error: "Invalid credentials" };
    }

    const supabase = await createAdminAuthServerClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });

    if (error || !data.user || !isAdminEmail(data.user.email)) {
      if (data.user) {
        await supabase.auth.signOut();
      }
      await failDelay();
      return { error: "Invalid credentials" };
    }

    resetAttempts(ip);
    await setAdminLastSeenCookie();
    signedIn = true;
  } catch {
    await failDelay();
    return { error: "Invalid credentials" };
  }

  if (signedIn) {
    redirect("/admin/rates");
  }

  return { error: "Invalid credentials" };
}

export async function logoutAction(): Promise<void> {
  try {
    const supabase = await createAdminAuthServerClient();
    await supabase.auth.signOut();
  } catch {
    // Always clear local admin state even if the auth provider is unavailable.
  }

  await clearAdminLastSeenCookie();
  redirect("/admin/login");
}
