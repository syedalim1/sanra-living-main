import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient as createSupabaseSsrClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import {
  ADMIN_IDLE_MS,
  ADMIN_LAST_SEEN_COOKIE,
  ADMIN_LOGIN_PATH,
  isAdminEmail,
  isAdminSessionExpired,
} from "@/lib/admin/guard";

export interface AdminSession {
  email: string;
  user: User;
}

function getAuthEnv(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Missing Supabase auth environment.");
  }

  return { url, anonKey };
}

export async function createAdminAuthServerClient() {
  const { url, anonKey } = getAuthEnv();
  const cookieStore = await cookies();

  return createSupabaseSsrClient(url, anonKey, {
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    },
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, {
              ...options,
              httpOnly: true,
              secure: process.env.NODE_ENV === "production",
              sameSite: "lax",
              path: "/",
            });
          });
        } catch {
          // Server Components cannot write cookies; route/action handlers can.
        }
      },
    },
  });
}

async function readLastSeenMs(): Promise<number | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(ADMIN_LAST_SEEN_COOKIE)?.value;
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const supabase = await createAdminAuthServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user || !isAdminEmail(user.email)) {
    if (user) {
      await supabase.auth.signOut();
    }
    return null;
  }

  const lastSeenMs = await readLastSeenMs();
  if (isAdminSessionExpired(lastSeenMs)) {
    await supabase.auth.signOut();
    return null;
  }

  return { email: user.email!, user };
}

export async function requireAdmin(): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) {
    redirect(ADMIN_LOGIN_PATH);
  }
  return session;
}

export async function requireAdminApi(): Promise<AdminSession | null> {
  return await getAdminSession();
}

export async function setAdminLastSeenCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_LAST_SEEN_COOKIE, String(Date.now()), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(ADMIN_IDLE_MS / 1000),
  });
}

export async function clearAdminLastSeenCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_LAST_SEEN_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
