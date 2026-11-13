import type { Metadata } from "next";
import Button from "@/components/Button";

export const metadata: Metadata = {
  title: "Not found",
};

/**
 * 404.
 *
 * Written as a museum would write it rather than as a server would. The point
 * of this page is not to apologise but to get somebody back to the two things
 * this site does, so both are one click away.
 */
export default function NotFound() {
  return (
    <div className="mx-auto w-full max-w-xl px-4 py-24 text-center sm:px-6 lg:py-32">
      <p className="text-[11px] uppercase tracking-[0.3em] text-turquoise">
        Patina
      </p>
      <h1 className="mt-5 text-balance font-serif text-3xl text-paper sm:text-4xl">
        This wall is empty
      </h1>
      <div className="mx-auto mt-5 h-px w-20 bg-gold" />

      <p className="mt-6 text-sm leading-relaxed text-muted">
        There is nothing hanging at this address. It may have been taken down,
        or the link may have been copied incompletely.
      </p>

      <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
        <Button href="/studio" size="lg">
          Paint a photograph
        </Button>
        <Button href="/" variant="secondary" size="lg">
          Back to the entrance
        </Button>
      </div>
    </div>
  );
}
