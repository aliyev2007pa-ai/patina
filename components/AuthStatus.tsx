"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Button from "./Button";
import { createClient, isConfigured } from "@/lib/supabase/client";

/**
 * The right-hand end of the header: "Sign in", or who you are and a way out.
 *
 * This reads the session in the browser rather than on the server, and that
 * is a deliberate trade. Reading cookies in the root layout would make every
 * page in the site dynamic — the landing page, the about page, all of it —
 * for the sake of two words in a corner. Patina is a tool that runs on the
 * visitor's machine; its pages should be static files on a CDN.
 *
 * The cost is a flicker: the header renders signed-out and corrects itself a
 * moment later. `ready` keeps that from happening by showing nothing at all
 * until the answer is known, which reads as calm rather than as a glitch.
 */
export default function AuthStatus() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);

  // With no Supabase settings there is nobody to ask and nothing to wait
  // for, so the answer is known before the first render. Deciding it here
  // rather than in the effect also keeps React from rendering twice.
  const [ready, setReady] = useState(() => !isConfigured());

  useEffect(() => {
    if (!isConfigured()) return;

    const supabase = createClient();
    let active = true;

    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setEmail(data.user?.email ?? null);
      setReady(true);
    });

    // Signing in or out in another tab should be reflected here too.
    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!active) return;
        setEmail(session?.user?.email ?? null);
        setReady(true);
      }
    );

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setEmail(null);
    router.push("/");
    router.refresh();
  }

  // With no Supabase settings there are no accounts to sign in to, and a
  // "Sign in" button that leads to an apology is worse than no button. The
  // code below stays ready for the day settings arrive.
  if (!isConfigured()) return null;

  if (!ready) {
    // Same height as the button, so the header does not jump when it arrives.
    return <span aria-hidden className="block h-9 w-20" />;
  }

  if (!email) {
    return (
      <Button href="/login" variant="secondary" size="md">
        Sign in
      </Button>
    );
  }

  const initial = email.charAt(0).toUpperCase();

  return (
    <div className="flex items-center gap-3">
      <Link
        href="/gallery"
        title={email}
        className="flex h-8 w-8 items-center justify-center rounded-full border border-gold-d bg-surface-2 font-serif text-sm text-gold transition-colors duration-200 hover:border-gold"
      >
        {initial}
      </Link>
      <button
        type="button"
        onClick={signOut}
        className="text-sm text-muted transition-colors duration-200 hover:text-white"
      >
        Sign out
      </button>
    </div>
  );
}
