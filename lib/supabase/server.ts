import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * The Supabase client for code running on the server.
 *
 * The difference from the browser client is where the session lives. In the
 * browser it sits in cookies the JavaScript can reach; on the server it has
 * to be read out of the request's cookies and any refreshed token written
 * back into the response. `@supabase/ssr` does that plumbing as long as it
 * is handed something that can read and write cookies, which is what the
 * two functions below are.
 *
 * The `setAll` wrapped in try/catch is not laziness. Server Components are
 * not allowed to set cookies — by the time one runs, the response headers
 * may already be on their way. Refreshing there would throw. It is safe to
 * swallow because `middleware.ts` refreshes the session on every request
 * before any page runs, so the token is already fresh by the time we get
 * here.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // A Server Component cannot set cookies. The middleware already
            // refreshed the session, so there is nothing to lose here.
          }
        },
      },
    }
  );
}

export function isConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
