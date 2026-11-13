import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/**
 * The sitemap.
 *
 * Three pages, and the two left out are left out on purpose — the same two
 * that `robots.ts` disallows, because a sitemap that advertises what robots
 * forbids is just a contradiction for a crawler to resolve. `/login` leads
 * nowhere while accounts are off (PROJECT.md 2.3), and `/gallery` is empty
 * from the outside: every painting is in the visitor's own browser.
 */
/**
 * A fixed date rather than `new Date()`.
 *
 * Two reasons. Next treats a sitemap that reads the clock as dynamic, so it
 * is rendered per request instead of being a file on the CDN. And a sitemap
 * that claims every page changed the moment it was fetched is simply untrue —
 * `lastModified` is meant to tell a crawler when the content last changed, so
 * this gets bumped when the content does.
 */
const LAST_CHANGED = "2026-11-13";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = [
    { path: "", priority: 1 },
    { path: "/studio", priority: 0.9 },
    { path: "/about", priority: 0.7 },
  ];

  return pages.map(({ path, priority }) => ({
    url: `${SITE_URL}${path}`,
    lastModified: LAST_CHANGED,
    changeFrequency: "monthly" as const,
    priority,
  }));
}
