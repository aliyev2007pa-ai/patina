"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Button from "./Button";
import { createClient, isConfigured } from "@/lib/supabase/client";

/** PROJECT.md 6, rule 8. Supabase enforces this too; this is the kind half. */
const MIN_PASSWORD = 8;

type Mode = "signin" | "signup";

/**
 * Sign in and create account, as two tabs over one form (PROJECT.md 4).
 *
 * Two things worth saying about the error handling.
 *
 * Messages are rewritten rather than passed through. Supabase's own text is
 * accurate but says more than a stranger should hear — which rows exist,
 * what the database thought — and PROJECT.md 6 rule 9 asks for none of that.
 *
 * And signing up with an address that already has an account does not say
 * so. Supabase returns success with an empty identities list, and this
 * shows the same "check your email" screen either way. That is deliberate:
 * a form that distinguishes the two is a tool for finding out who has an
 * account here, and the real owner gets an email about it either way.
 */
export default function AuthForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/gallery";

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const configured = isConfigured();

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (password.length < MIN_PASSWORD) {
      setError(`Passwords need at least ${MIN_PASSWORD} characters.`);
      return;
    }

    setBusy(true);
    try {
      const supabase = createClient();

      if (mode === "signup") {
        const { error: cause } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/login?verified=1`,
          },
        });

        if (cause) {
          setError(
            cause.message.toLowerCase().includes("rate")
              ? "Too many attempts just now. Try again in a few minutes."
              : "That account could not be created. Check the address and try again."
          );
          return;
        }

        setSent(true);
        return;
      }

      const { error: cause } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (cause) {
        setError(
          cause.message.toLowerCase().includes("not confirmed")
            ? "That address has not been confirmed yet. Check your email for the link."
            : "That email and password do not match an account."
        );
        return;
      }

      router.push(next);
      router.refresh();
    } catch {
      setError("Something went wrong signing in. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  if (!configured) {
    return (
      <p className="rounded-sm border border-gold-d/60 bg-gold/5 px-4 py-3 text-sm leading-relaxed text-paper">
        Accounts are not switched on for this copy of Patina yet. Painting and
        downloading work without one — they always will.
      </p>
    );
  }

  if (sent) {
    return (
      <div className="rounded-sm border border-turquoise/40 bg-turquoise/5 px-5 py-5">
        <h2 className="font-serif text-xl text-paper">Check your email</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          If that address can have an account, a confirmation link is on its
          way to <span className="text-paper">{email}</span>. Open it and you
          will be able to sign in.
        </p>
        <button
          type="button"
          onClick={() => {
            setSent(false);
            setMode("signin");
          }}
          className="mt-5 text-xs text-turquoise underline-offset-4 hover:underline"
        >
          Back to sign in
        </button>
      </div>
    );
  }

  return (
    <div>
      <div
        role="tablist"
        aria-label="Sign in or create an account"
        className="flex gap-1 rounded-sm border border-white/10 bg-surface/50 p-1"
      >
        {(
          [
            ["signin", "Sign in"],
            ["signup", "Create account"],
          ] as [Mode, string][]
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={mode === value}
            onClick={() => {
              setMode(value);
              setError(null);
            }}
            className={`flex-1 rounded-sm px-4 py-2 text-sm transition-colors duration-200 ${
              mode === value
                ? "bg-turquoise/15 text-turquoise"
                : "text-muted hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="email" className="text-xs tracking-wide text-muted">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-2 w-full rounded-sm border border-white/10 bg-surface-2 px-3 py-2.5 text-sm text-paper outline-none transition-colors duration-200 focus:border-turquoise"
          />
        </div>

        <div>
          <label htmlFor="password" className="text-xs tracking-wide text-muted">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={MIN_PASSWORD}
            autoComplete={
              mode === "signup" ? "new-password" : "current-password"
            }
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-2 w-full rounded-sm border border-white/10 bg-surface-2 px-3 py-2.5 text-sm text-paper outline-none transition-colors duration-200 focus:border-turquoise"
          />
          {mode === "signup" && (
            <p className="mt-1.5 text-[11px] text-muted">
              At least {MIN_PASSWORD} characters.
            </p>
          )}
        </div>

        {error !== null && (
          <p
            role="alert"
            className="rounded-sm border border-gold-d/60 bg-gold/5 px-3 py-2.5 text-xs text-paper"
          >
            {error}
          </p>
        )}

        <Button type="submit" size="lg" disabled={busy} className="w-full">
          {busy
            ? "One moment…"
            : mode === "signup"
              ? "Create account"
              : "Sign in"}
        </Button>
      </form>

      <p className="mt-6 text-xs leading-relaxed text-muted">
        An account is only ever needed to keep paintings in a gallery.
        Painting a photograph and downloading it needs nothing at all.
      </p>
    </div>
  );
}
