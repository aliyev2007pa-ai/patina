import type { Metadata } from "next";
import ComingSoon from "@/components/ComingSoon";

export const metadata: Metadata = {
  title: "Sign in — Patina",
  description: "Sign in to keep your paintings. Everything else works without an account.",
};

export default function LoginPage() {
  return (
    <ComingSoon
      phase="Being built"
      title="Sign in"
      body="An account will only ever be needed to save paintings to a gallery. Painting them and downloading them works without one, and always will."
    />
  );
}
