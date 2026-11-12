import Link from "next/link";

const REPO_URL = "https://github.com/aliyev2007pa-ai/patina";

/**
 * Footer. The last line is a promise, not decoration: the project ships no
 * analytics, no ads and no third-party tracking (PROJECT.md 6, rule 7).
 */
export default function Footer() {
  return (
    <footer className="border-t border-white/10">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-3 px-4 py-8 text-center text-xs text-muted sm:flex-row sm:justify-between sm:px-6 sm:text-left">
        <Link
          href={REPO_URL}
          target="_blank"
          rel="noreferrer"
          className="transition-colors duration-200 hover:text-white"
        >
          Source on GitHub
        </Link>
        <p>Made with Next.js, Supabase &amp; Vercel</p>
        <p className="text-gold/80">100% free, no ads, no tracking</p>
      </div>
    </footer>
  );
}
