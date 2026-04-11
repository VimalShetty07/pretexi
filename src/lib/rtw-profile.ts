/**
 * Maps employer RTW category labels to UI behaviour (visa / sponsorship / BRP blocks).
 * Labels are normalised loosely so tenant-specific wording still works.
 */

export type RtwUiKind =
  | "british_irish"
  | "ilr_settled"
  | "pre_settled"
  | "non_sponsored_visa"
  | "sponsored_visa"
  | "unknown";

export type RtwUiProfile = {
  kind: RtwUiKind;
  /** Visa route, expiry, “days to expiry” */
  showVisaImmigration: boolean;
  /** Sponsorship number, CoS assignment date */
  showSponsorshipCos: boolean;
  /** BRP reference / issue / expiry */
  showBrpFields: boolean;
};

function norm(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

export function getRtwUiProfile(category: string | null | undefined): RtwUiProfile {
  const fallback: RtwUiProfile = {
    kind: "unknown",
    showVisaImmigration: true,
    showSponsorshipCos: true,
    showBrpFields: true,
  };

  if (!category?.trim()) return fallback;

  const n = norm(category);

  if (n.includes("pre-settled") || n.includes("pre settled")) {
    return {
      kind: "pre_settled",
      showVisaImmigration: true,
      showSponsorshipCos: false,
      showBrpFields: true,
    };
  }

  if (n.includes("british") || (n.includes("irish") && n.includes("citizen"))) {
    return {
      kind: "british_irish",
      showVisaImmigration: false,
      showSponsorshipCos: false,
      showBrpFields: false,
    };
  }

  if (n.includes("ilr") || (n.includes("settled") && !n.includes("pre"))) {
    return {
      kind: "ilr_settled",
      showVisaImmigration: false,
      showSponsorshipCos: false,
      showBrpFields: false,
    };
  }

  if (n.includes("non-sponsored") || n.includes("non sponsored")) {
    return {
      kind: "non_sponsored_visa",
      showVisaImmigration: true,
      showSponsorshipCos: false,
      showBrpFields: true,
    };
  }

  if (n.includes("sponsored")) {
    return {
      kind: "sponsored_visa",
      showVisaImmigration: true,
      showSponsorshipCos: true,
      showBrpFields: true,
    };
  }

  return fallback;
}
