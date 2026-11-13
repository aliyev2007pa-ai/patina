"use client";

import { useEffect } from "react";
import Button from "@/components/Button";

/**
 * The error boundary for everything under the root layout.
 *
 * Two deliberate choices here.
 *
 * It does not print the error. React gives the browser a generic message in
 * production anyway, but the habit matters: an error message is written for
 * whoever wrote the code, and it tends to mention paths, versions and
 * internals that a stranger has no reason to be told (PROJECT.md 6, rule 9).
 * The digest is shown because it is the one thing that is safe and useful —
 * it identifies the error in the server log without describing it.
 *
 * And `reset()` is offered before any link away. Most failures here would be
 * a render that went wrong once; trying again is cheaper than navigating,
 * and it keeps whatever state the page still holds.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // No analytics service to report to, and none is wanted (PROJECT.md 10).
    // The console is where a developer would look, so that is where it goes.
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-24 text-center sm:px-6 lg:py-32">
      <p className="text-[11px] uppercase tracking-[0.3em] text-turquoise">
        Patina
      </p>
      <h1 className="mt-5 text-balance font-serif text-3xl text-paper sm:text-4xl">
        Something went wrong
      </h1>
      <div className="mx-auto mt-5 h-px w-20 bg-gold" />

      <p className="mt-6 text-sm leading-relaxed text-muted">
        This page stopped working. Nothing you uploaded was lost or sent
        anywhere — it never left your device in the first place.
      </p>

      <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
        <Button onClick={reset} size="lg">
          Try again
        </Button>
        <Button href="/" variant="secondary" size="lg">
          Back to the entrance
        </Button>
      </div>

      {error.digest && (
        <p className="mt-10 text-[11px] text-muted">
          Reference <span className="text-paper">{error.digest}</span>
        </p>
      )}
    </div>
  );
}
