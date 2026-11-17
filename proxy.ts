import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import {
  ADMIN_IDLE_MS,
  ADMIN_LAST_SEEN_COOKIE,
  ADMIN_LOGIN_PATH,
  decideAdminAccess,
  isAdminApiPath,
  isAdminPagePath,
} from "@/lib/admin/guard";
import { updateSession } from "@/utils/supabase/middleware";

const SECURITY_HEADERS: Record<string, string> = {
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "Cache-Control": "no-store",
};

function secure(response: NextResponse): NextResponse {
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

function clearSessionCookies(request: NextRequest, response: NextResponse): NextResponse {
  request.cookies
    .getAll()
    .filter((cookie) => cookie.name.startsWith("sb-") && cookie.name.includes("-auth-token"))
    .forEach((cookie) => {
      response.cookies.set(cookie.name, "", { maxAge: 0, path: "/" });
    });

  response.cookies.set(ADMIN_LAST_SEEN_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return response;
}

function reject(request: NextRequest, unauthorized: boolean): NextResponse {
  const response = unauthorized
    ? NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    : NextResponse.redirect(new URL(ADMIN_LOGIN_PATH, request.url));

  return secure(clearSessionCookies(request, response));
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === ADMIN_LOGIN_PATH) {
    return secure(await updateSession(request));
  }

  if (!isAdminPagePath(pathname) && !isAdminApiPath(pathname)) {
    return updateSession(request);
  }

  const unauthorized = isAdminApiPath(pathname);

  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !anonKey) {
      return reject(request, unauthorized);
    }

    let response = NextResponse.next({ request });

    const supabase = createServerClient(url, anonKey, {
      cookieOptions: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
      },
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, {
              ...options,
              httpOnly: true,
              secure: process.env.NODE_ENV === "production",
              sameSite: "lax",
              path: "/",
            });
          });
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const rawLastSeen = request.cookies.get(ADMIN_LAST_SEEN_COOKIE)?.value;
    const lastSeenMs = rawLastSeen ? Number(rawLastSeen) : null;

    const decision = decideAdminAccess({
      pathname,
      email: user?.email,
      lastSeenMs,
      adminEmail: process.env.ADMIN_EMAIL,
    });

    if (decision !== "allow") {
      if (user) {
        await supabase.auth.signOut();
      }
      return reject(request, unauthorized);
    }

    response.cookies.set(ADMIN_LAST_SEEN_COOKIE, String(Date.now()), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: Math.floor(ADMIN_IDLE_MS / 1000),
    });

    return secure(response);
  } catch {
    return reject(request, unauthorized);
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
