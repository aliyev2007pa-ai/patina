import type { Metadata } from "next";
import ComingSoon from "@/components/ComingSoon";

export const metadata: Metadata = {
  title: "Studio — Patina",
  description: "Upload a photograph and repaint it, entirely in your browser.",
};

export default function StudioPage() {
  return (
    <ComingSoon
      phase="Being built"
      title="The studio"
      body="This is where you will drop a photograph, pick a style and watch it turn into a painting without anything leaving your device. The oil paint engine is the next thing being built."
    />
  );
}
