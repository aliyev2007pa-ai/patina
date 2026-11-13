import type { Metadata } from "next";
import { Suspense } from "react";
import AuthForm from "@/components/AuthForm";

export const metadata: Metadata = {
  title: "Sign in",
  alternates: { canonical: "/login" },
  description:
    "Sign in to keep your paintings. Everything else works without an account.",
};

/**
 * The form reads `?next=` to send people back where they were going, and
 * reading search params is something only the browser can settle. Suspense
 * keeps that from forcing the whole page to be rendered per request.
 */
export default function LoginPage() {
  return (
    <div className="mx-auto w-full max-w-md px-4 py-16 sm:px-6 lg:py-24">
      <p className="text-[11px] uppercase tracking-[0.3em] text-turquoise">
        Patina
      </p>
      <h1 className="mt-5 text-balance font-serif text-3xl text-paper sm:text-4xl">
        Keep your paintings
      </h1>
      <div className="mt-5 h-px w-20 bg-gold" />

      <p className="mt-6 text-sm leading-relaxed text-muted">
        An account exists for one reason: so the paintings you choose to keep
        can hang somewhere. Nothing else on this site asks for one.
      </p>

      <div className="mt-8">
        <Suspense
          fallback={<div className="h-72 animate-pulse rounded-sm bg-surface/50" />}
        >
          <AuthForm />
        </Suspense>
      </div>
    </div>
  );
}
