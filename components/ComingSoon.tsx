import Button from "./Button";

/**
 * Placeholder for a route that the header already links to but a later phase
 * will build. Better an honest "not yet" than a 404 on a live site.
 *
 * /studio arrives in FAZ 2–3, /gallery and /login in FAZ 4–5.
 */
export default function ComingSoon({
  title,
  phase,
  body,
}: {
  title: string;
  phase: string;
  body: string;
}) {
  return (
    <section className="mx-auto flex w-full max-w-xl flex-col items-center px-4 py-24 text-center sm:px-6">
      <p className="text-[11px] uppercase tracking-[0.3em] text-turquoise">
        {phase}
      </p>
      <h1 className="mt-5 text-balance font-serif text-3xl text-paper sm:text-5xl">
        {title}
      </h1>
      <div className="mt-6 h-px w-20 bg-gold" />
      <p className="mt-6 text-sm leading-relaxed text-muted">{body}</p>
      <Button href="/" variant="secondary" size="lg" className="mt-9">
        Back to the wall
      </Button>
    </section>
  );
}
