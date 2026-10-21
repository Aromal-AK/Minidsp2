import { detectRaw } from "./detectors";
import { mask } from "./mask";
import { riskRank, type Finding, type FindingType, type Risk, type ScanResult } from "./types";

export type { Finding, FindingType, Risk, ScanResult } from "./types";

export function scan(text: string): ScanResult {
  const byType = new Map<FindingType, Finding>();
  for (const m of detectRaw(text)) {
    const f = byType.get(m.type);
    if (f) f.count++;
    else byType.set(m.type, { type: m.type, risk: m.risk, count: 1, maskedExample: mask(m.type, m.value) });
  }
  const findings = [...byType.values()].sort((a, b) => riskRank(b.risk) - riskRank(a.risk));
  const fileRisk: Risk = findings[0]?.risk ?? "None";
  return { fileRisk, findings };
}
