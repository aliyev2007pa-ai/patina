import type { Metadata } from "next";
import Studio from "@/components/Studio";

export const metadata: Metadata = {
  title: "Studio",
  description:
    "Choose a photograph and repaint it as an old master oil painting, entirely in your browser.",
};

export default function StudioPage() {
  return <Studio />;
}
