import Link from "next/link";
import AuthStatus from "./AuthStatus";
import Mark from "./Mark";

/**
 * Site header: wordmark on the left, navigation on the right.
 *
 * Below 640px the two stack instead of squeezing, so the layout survives a
 * 320px screen without a hamburger menu and without any JavaScript.
 *
 * "Sign in" is a link for now; FAZ 4 turns it into real session state.
 */
const links = [
  { href: "/studio", label: "Studio" },
  { href: "/gallery", label: "Gallery" },
  { href: "/about", label: "About" },
];

export default function Header() {
  return (
    <header className="border-b border-white/10">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-3 px-4 py-4 sm:flex-row sm:justify-between sm:gap-6 sm:px-6">
        {/* Mark and wordmark as one lockup. The gap is tight on purpose —
            any wider and they read as two separate things sitting near each
            other rather than one logo. */}
        <Link
          href="/"
          aria-label="Patina, home"
          className="flex items-center gap-2.5 text-paper transition-colors duration-200 hover:text-white"
        >
          <Mark size={26} />
          <span className="font-serif text-2xl tracking-[0.18em]">PATINA</span>
        </Link>

        <nav className="flex items-center gap-4 sm:gap-6">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-muted transition-colors duration-200 hover:text-white"
            >
              {link.label}
            </Link>
          ))}
          <AuthStatus />
        </nav>
      </div>
    </header>
  );
}
