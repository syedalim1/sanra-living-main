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
import {
  checkSharedRateLimitStatus,
  resetSharedRateLimit,
} from "@/lib/rateLimit";

interface LoginState {
  error?: string;
}

const LoginSchema = z.object({
  email: z.string().trim().email().max(200),
  password: z.string().min(1).max(200),
});

function getClientIp(headerStore: Headers): string {
  return (
    headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headerStore.get("x-real-ip") ||
    "127.0.0.1"
  );
}

async function failDelay(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 1000));
}

export async function loginAction(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  let signedIn = false;

  try {
    const headerStore = await headers();
    const ip = getClientIp(headerStore);

    const rateLimit = await checkSharedRateLimitStatus({
      scope: "admin-login",
      ip,
      limit: 5,
      windowMs: 15 * 60 * 1000,
    });

    if (rateLimit === "limited") {
      return { error: "Too many attempts. Please try again later." };
    }

    if (rateLimit === "unavailable") {
      console.error(
        "Admin sign-in blocked: shared rate limiter unavailable. Verify SUPABASE_SERVICE_ROLE_KEY and migration 008_rate_limits.sql."
      );
      return { error: "Sign-in is temporarily unavailable. Please try again later." };
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

    if (error || !data.user) {
      console.warn(
        `Admin sign-in failed at Supabase Auth: ${error?.code ?? error?.name ?? "no-user"} (status ${error?.status ?? "n/a"}).`
      );
      await failDelay();
      return { error: "Invalid credentials" };
    }

    if (!isAdminEmail(data.user.email)) {
      await supabase.auth.signOut();
      console.warn(
        process.env.ADMIN_EMAIL
          ? "Admin sign-in rejected: authenticated user email does not match ADMIN_EMAIL."
          : "Admin sign-in rejected: ADMIN_EMAIL is not configured."
      );
      await failDelay();
      return { error: "Invalid credentials" };
    }

    await resetSharedRateLimit("admin-login", ip);
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
