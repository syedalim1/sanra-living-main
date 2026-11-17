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
  checkSharedRateLimit,
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

    const allowed = await checkSharedRateLimit({
      scope: "admin-login",
      ip,
      limit: 5,
      windowMs: 15 * 60 * 1000,
      failClosed: true,
    });

    if (!allowed) {
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
