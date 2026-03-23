import type { Metadata } from "next";
import MarketingLanding from "@/components/marketing-ref/MarketingLanding";
import "./protexi-marketing.css";

export const metadata: Metadata = {
  title: "Protexi — Sponsor Compliance, Simplified",
  description:
    "UK Sponsor Compliance SaaS — visa expiry tracking, document checklists, UKVI-ready audit trails, and automated alerts for sponsor licence holders.",
};

export default function Home() {
  return <MarketingLanding />;
}
