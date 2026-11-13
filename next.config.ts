import type { NextConfig } from "next";

/**
 * Content Security Policy — PROJECT.md 6, rule 6.
 *
 * One honest admission first: `script-src` carries `'unsafe-inline'`, and
 * that is not laziness. Next's App Router streams the page down as inline
 * `<script>` tags, so a strict policy needs a nonce, and a nonce has to be
 * generated per request — which means every page in this site would be
 * rendered on demand instead of being a file on a CDN. For a site whose
 * whole argument is that it runs on the visitor's machine, that is a bad
 * trade for a policy that is already defence in depth rather than a patch
 * over a known hole: nothing here renders HTML from anywhere but React,
 * which escapes it, and the only text a visitor controls is a file name.
 *
 * What the policy still buys, and it is not nothing: an injected script
 * cannot *load* anything — no external source, no object, no frame — it
 * cannot retarget a form, it cannot rewrite the base URL to redirect every
 * relative link, and the page cannot be framed by anyone.
 *
 * The specific allowances:
 * - `img-src` needs `blob:` and `data:` because every painting on screen is
 *   an object URL made from a canvas. This is the whole site working.
 * - `style-src` needs `'unsafe-inline'` for the font and critical-CSS tags
 *   Next injects.
 * - `font-src 'self'` and no Google domain anywhere: `next/font` downloads
 *   the two fonts at build time and serves them from this origin, so no
 *   visitor's browser ever talks to Google.
 * - `connect-src 'self'` is all that is needed because there is no API to
 *   call. If Supabase is ever switched on (PROJECT.md 2.3), its project URL
 *   has to be added here or every request will be blocked.
 * - `worker-src 'self'` for the compatibility-mode CPU engine.
 * - `'unsafe-eval'` in development only, for Next's hot reloading.
 */
const dev = process.env.NODE_ENV === "development";

const csp = [
  "default-src 'self'",
  // 'unsafe-eval' is Next's hot reloading, and only in development.
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self'",
  // `ws:` in development for the hot-reload socket. `'self'` ought to cover
  // a same-origin WebSocket and does not in every browser, and in any case
  // `upgrade-insecure-requests` below would rewrite ws:// to wss:// — which
  // the dev server does not speak. Both are dropped in production, where
  // this site opens no sockets at all.
  `connect-src 'self'${dev ? " ws:" : ""}`,
  "worker-src 'self' blob:",
  "media-src 'none'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(dev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },

  // Redundant next to `frame-ancestors`, and kept anyway: it is one line and
  // it still protects anyone on a browser old enough to ignore CSP.
  { key: "X-Frame-Options", value: "DENY" },

  // Stops a browser from deciding a file is something other than what it was
  // served as — the trick that turns an uploaded "image" into a script.
  { key: "X-Content-Type-Options", value: "nosniff" },

  // No referrer at all, which PROJECT.md 6.6 asks for and this site can
  // afford: it links outward exactly once, to the repository.
  { key: "Referrer-Policy", value: "no-referrer" },

  // Patina needs none of these. Saying so means a browser will refuse them
  // even if something on the page asks.
  {
    key: "Permissions-Policy",
    value: [
      "camera=()",
      "microphone=()",
      "geolocation=()",
      "payment=()",
      "usb=()",
      "midi=()",
      "magnetometer=()",
      "accelerometer=()",
      "gyroscope=()",
    ].join(", "),
  },

  // Two years, subdomains included. No `preload`: that is a one-way door on
  // a domain this project does not own.
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains",
  },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
