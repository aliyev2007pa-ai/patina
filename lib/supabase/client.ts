import { createBrowserClient } from "@supabase/ssr";

/**
 * The Supabase client for code running in the browser.
 *
 * Only two values reach the browser: the project URL and the anonymous key.
 * Both are public by design — the anon key is in every page this site
 * serves, and that is fine, because it grants nothing on its own. What it
 * can reach is decided entirely by the row level security policies on the
 * database (PROJECT.md 6, rule 2).
 *
 * Which also means: **a table without RLS is a public table.** The anon key
 * is a name, not a password. Every table this project creates has RLS
 * enabled before it holds a single row.
 *
 * The service role key, which really is a password, is never used here and
 * is not needed anywhere in this project.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

/**
 * Whether the project has been given its Supabase settings yet.
 *
 * The site is meant to work without an account and without Supabase at all
 * (PROJECT.md 1.2): painting and downloading never touch a server. So rather
 * than crashing when the keys are missing, the pages that need them say so
 * and the rest of the site carries on.
 */
export function isConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
