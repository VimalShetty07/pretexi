export type Plan = {
  name: string;
  price: string;
  period: string;
  teamSize: string;
  description: string;
  cta: string;
  highlighted: boolean;
  badge?: string;
  features: string[];
  color: string;
  borderColor: string;
};

export const pricingPlans: Plan[] = [
  {
    name: "Starter",
    price: "£149",
    period: "/month",
    teamSize: "Up to 25 sponsored workers",
    description: "Perfect for small businesses taking their first step towards automated compliance.",
    cta: "Book a Demo",
    highlighted: false,
    features: [
      "Visa expiry tracking (up to 25)",
      "Document checklist automation",
      "Email deadline alerts",
      "Compliance calendar",
      "UKVI reporting templates",
      "Email support",
    ],
    color: "from-slate-800/60 to-slate-900/60",
    borderColor: "border-white/10",
  },
  {
    name: "Growth",
    price: "£349",
    period: "/month",
    teamSize: "Up to 100 sponsored workers",
    description: "The most popular plan for growing UK businesses with active sponsorship programmes.",
    cta: "Book a Demo",
    highlighted: true,
    badge: "Most Popular",
    features: [
      "Everything in Starter",
      "Background verification workflows",
      "CoS planning & analytics",
      "Multi-channel alerts (Slack, email)",
      "Role-based use cases (HR, Compliance)",
      "Audit readiness dashboard",
      "Priority email & chat support",
      "API access",
    ],
    color: "from-[#1657ad]/20 to-[#2d7ae0]/10",
    borderColor: "border-[#1657ad]/40",
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    teamSize: "Unlimited sponsored workers",
    description: "Full-scale compliance infrastructure for large organisations and legal teams.",
    cta: "Book a Demo",
    highlighted: false,
    features: [
      "Everything in Growth",
      "Unlimited visa holders",
      "Custom integrations (HRIS, ATS)",
      "Dedicated compliance manager",
      "SLA-backed uptime guarantee",
      "GDPR data processing agreement",
      "White-label options",
      "On-boarding & training sessions",
    ],
    color: "from-blue-900/20 to-slate-900/60",
    borderColor: "border-blue-500/20",
  },
];

export const featureMatrix = [
  { feature: "Visa Expiry Tracking", starter: true, growth: true, enterprise: true },
  { feature: "Document Automation", starter: true, growth: true, enterprise: true },
  { feature: "Compliance Calendar", starter: true, growth: true, enterprise: true },
  { feature: "UKVI Report Templates", starter: true, growth: true, enterprise: true },
  { feature: "Background Verification", starter: false, growth: true, enterprise: true },
  { feature: "CoS Planning Insights", starter: false, growth: true, enterprise: true },
  { feature: "Multi-channel Alerts", starter: false, growth: true, enterprise: true },
  { feature: "Audit Readiness Dashboard", starter: false, growth: true, enterprise: true },
  { feature: "API Access", starter: false, growth: true, enterprise: true },
  { feature: "Custom HRIS Integrations", starter: false, growth: false, enterprise: true },
  { feature: "Dedicated Manager", starter: false, growth: false, enterprise: true },
  { feature: "White-label Options", starter: false, growth: false, enterprise: true },
];
