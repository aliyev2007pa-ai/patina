import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Keeps the session alive, and guards the pages that need one.
 *
 * Supabase access tokens are short-lived on purpose: a stolen one is only
 * useful for an hour. The price of that is somebody has to exchange the
 * refresh token for a new one, and a Server Component cannot — it is not
 * allowed to set cookies. Middleware runs before any of them and can, so
 * this is the one place the refresh can happen reliably.
 *
 * `supabase.auth.getUser()` looks like a wasted round trip but is not. It
 * asks the Supabase server to verify the token, where reading the session
 * from the cookie would only decode what the browser sent — and the browser
 * is not a trustworthy narrator of who it is. It is also what triggers the
 * refresh.
 *
 * Note the care with the response object. Cookies set by the refresh have to
 * end up on the response that is actually returned, so a redirect copies
 * them across rather than starting from a clean one. Getting this wrong
 * logs people out at random, which is miserable to debug.
 */
const PROTECTED = ["/gallery"];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Without Supabase settings there is no session to refresh and nothing to
  // guard. The rest of the site works regardless (PROJECT.md 1.2).
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  if (!user && PROTECTED.some((prefix) => path.startsWith(prefix))) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = "/login";
    // So the login page can send them where they were going.
    redirect.searchParams.set("next", path);

    const guarded = NextResponse.redirect(redirect);
    for (const cookie of response.cookies.getAll()) {
      guarded.cookies.set(cookie);
    }
    return guarded;
  }

  return response;
}

export const config = {
  // Everything except Next's own assets and image files. Running the refresh
  // on every icon request would be a lot of pointless work.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
