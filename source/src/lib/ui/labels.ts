import type { FindingType, Risk } from "../detection/types";

export const FINDING_TYPES: FindingType[] = ["email", "uk_phone", "uk_nino", "payment_card"];
export const FINDING_RISKS: Exclude<Risk, "None">[] = ["Low", "Medium", "High", "Critical"];
export const ALL_RISKS: Risk[] = ["None", "Low", "Medium", "High", "Critical"];

export const TYPE_LABELS: Record<FindingType, string> = {
  email: "Email",
  uk_phone: "UK phone",
  uk_nino: "National Insurance number",
  payment_card: "Payment card",
};

// Badge has five documented variants; the risk text always accompanies the colour.
export const RISK_BADGE: Record<Risk, "neutral" | "success" | "warning" | "error"> = {
  None: "neutral",
  Low: "success",
  Medium: "warning",
  High: "error",
  Critical: "error",
};

export const isFindingType = (v: unknown): v is FindingType =>
  typeof v === "string" && (FINDING_TYPES as string[]).includes(v);
export const isFindingRisk = (v: unknown): v is Exclude<Risk, "None"> =>
  typeof v === "string" && (FINDING_RISKS as string[]).includes(v);

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(iso)) + " UTC";
}
