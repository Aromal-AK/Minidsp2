export const RISK_ORDER = ["None", "Low", "Medium", "High", "Critical"] as const;
export type Risk = (typeof RISK_ORDER)[number];

export type FindingType = "email" | "uk_phone" | "uk_nino" | "payment_card";

export interface Finding {
  type: FindingType;
  risk: Exclude<Risk, "None">;
  count: number;
  maskedExample: string;
}

export interface ScanResult {
  fileRisk: Risk;
  findings: Finding[];
}

export const riskRank = (r: Risk): number => RISK_ORDER.indexOf(r);
