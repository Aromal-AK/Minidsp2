import { ALL_RISKS } from "../ui/labels";
import type { Risk } from "../detection/types";

export interface ScanRow {
  id: string;
  file_name: string;
  file_risk: Risk;
  total_findings: number;
  created_at: string;
}

export interface DashboardSummary {
  files: number;
  totalFindings: number;
  highOrCriticalFiles: number;
  distribution: Record<Risk, number>;
  recent: ScanRow[];
}

export function summarizeScans(rows: ScanRow[], recentLimit = 5): DashboardSummary {
  const distribution = Object.fromEntries(ALL_RISKS.map((r) => [r, 0])) as Record<Risk, number>;
  let totalFindings = 0;
  for (const r of rows) {
    distribution[r.file_risk]++;
    totalFindings += r.total_findings;
  }
  const recent = [...rows].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, recentLimit);
  return {
    files: rows.length,
    totalFindings,
    highOrCriticalFiles: distribution.High + distribution.Critical,
    distribution,
    recent,
  };
}
