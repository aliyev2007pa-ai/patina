import type { Metadata } from "next";
import ComingSoon from "@/components/ComingSoon";

export const metadata: Metadata = {
  title: "Gallery — Patina",
  description: "Your saved paintings, framed and labelled.",
};

export default function GalleryPage() {
  return (
    <ComingSoon
      phase="Being built"
      title="Your gallery"
      body="Once accounts exist, the paintings you choose to keep will hang here in gold frames with their own plaques. Saving will always be optional — downloading never needs an account."
    />
  );
}
