/**
 * Facts about where this site lives, in one place.
 *
 * Several things need an absolute address — the sitemap, the canonical link,
 * and the Open Graph card, because a social preview is fetched by a server
 * somewhere else and a relative path means nothing to it.
 *
 * Vercel sets VERCEL_PROJECT_PRODUCTION_URL on every deployment, which keeps
 * preview builds from announcing themselves as the real site. The literal is
 * the fallback for building locally.
 */
export const SITE_URL = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "https://patina-steel-nine.vercel.app";

export const SITE_NAME = "Patina";

export const SITE_TAGLINE = "Turn your photos into old master oil paintings";

export const SITE_DESCRIPTION =
  "Patina repaints your photographs as 19th-century oil paintings, entirely in your browser. No account, no upload, no cost — your photo never leaves your device.";
