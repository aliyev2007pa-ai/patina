import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/**
 * robots.txt.
 *
 * Everything is open except `/login`, which exists but leads nowhere while
 * accounts are off, and `/gallery`, which is worth saying something about:
 * a crawler that fetches it gets an empty wall, because every painting lives
 * in the visitor's own browser and there is nothing on the server to index.
 * Keeping it out of search results spares people a result that will always
 * look broken from the outside.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/login", "/gallery"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
