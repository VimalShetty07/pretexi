export type PlanKey = "starter" | "growth" | "enterprise";

export interface PricingPlan {
  key: PlanKey;
  name: string;
  priceMonthlyGBP: number | null;
  subtitle: string;
  ctaLabel: string;
  featured?: boolean;
  limits: {
    maxSponsoredWorkers: number | null;
    maxUsers: number | null;
  };
  features: {
    visaExpiryTracking: boolean;
    bgVerification: boolean;
    documentAutomation: boolean;
    complianceCalendar: boolean;
    cosForecasting: boolean;
    advancedReports: boolean;
    dedicatedSupport: boolean;
  };
}

// Single source of truth for marketing pricing UI.
// Update this file when plans/prices/features change.
export const PRICING_PLANS: PricingPlan[] = [
  {
    key: "starter",
    name: "Starter",
    priceMonthlyGBP: 99,
    subtitle: "For small teams starting sponsor compliance",
    ctaLabel: "Start Starter",
    limits: {
      maxSponsoredWorkers: 25,
      maxUsers: 5,
    },
    features: {
      visaExpiryTracking: true,
      bgVerification: false,
      documentAutomation: true,
      complianceCalendar: true,
      cosForecasting: false,
      advancedReports: false,
      dedicatedSupport: false,
    },
  },
  {
    key: "growth",
    name: "Growth",
    priceMonthlyGBP: 249,
    subtitle: "For growing sponsor organisations",
    ctaLabel: "Start Growth",
    featured: true,
    limits: {
      maxSponsoredWorkers: 150,
      maxUsers: 25,
    },
    features: {
      visaExpiryTracking: true,
      bgVerification: true,
      documentAutomation: true,
      complianceCalendar: true,
      cosForecasting: true,
      advancedReports: true,
      dedicatedSupport: false,
    },
  },
  {
    key: "enterprise",
    name: "Enterprise",
    priceMonthlyGBP: null,
    subtitle: "For multi-entity and high-scale operations",
    ctaLabel: "Contact Sales",
    limits: {
      maxSponsoredWorkers: null,
      maxUsers: null,
    },
    features: {
      visaExpiryTracking: true,
      bgVerification: true,
      documentAutomation: true,
      complianceCalendar: true,
      cosForecasting: true,
      advancedReports: true,
      dedicatedSupport: true,
    },
  },
];

export const FEATURE_LABELS: Record<keyof PricingPlan["features"], string> = {
  visaExpiryTracking: "Visa expiry tracking",
  bgVerification: "Background verification workflow",
  documentAutomation: "Document checklist automation",
  complianceCalendar: "Compliance calendar",
  cosForecasting: "CoS forecast and projection",
  advancedReports: "Advanced reporting",
  dedicatedSupport: "Dedicated support",
};
