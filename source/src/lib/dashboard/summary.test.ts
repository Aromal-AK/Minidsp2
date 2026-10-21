import { describe, expect, it } from "vitest";
import { summarizeScans, type ScanRow } from "./summary";

const row = (id: string, file_risk: ScanRow["file_risk"], total_findings: number, created_at: string): ScanRow => ({
  id,
  file_name: `${id}.csv`,
  file_risk,
  total_findings,
  created_at,
});

describe("summarizeScans", () => {
  it("returns zeros for no rows", () => {
    expect(summarizeScans([])).toEqual({
      files: 0,
      totalFindings: 0,
      highOrCriticalFiles: 0,
      distribution: { None: 0, Low: 0, Medium: 0, High: 0, Critical: 0 },
      recent: [],
    });
  });

  it("totals and risk distribution match the given rows", () => {
    const rows = [
      row("a", "Critical", 5, "2026-10-21T08:00:00Z"),
      row("b", "High", 2, "2026-10-21T09:00:00Z"),
      row("c", "None", 0, "2026-10-21T07:00:00Z"),
      row("d", "Low", 3, "2026-10-21T10:00:00Z"),
      row("e", "Critical", 1, "2026-10-20T10:00:00Z"),
      row("f", "Medium", 4, "2026-10-19T10:00:00Z"),
    ];
    const s = summarizeScans(rows, 3);
    expect(s.files).toBe(6);
    expect(s.totalFindings).toBe(15);
    expect(s.highOrCriticalFiles).toBe(3);
    expect(s.distribution).toEqual({ None: 1, Low: 1, Medium: 1, High: 1, Critical: 2 });
    expect(Object.values(s.distribution).reduce((a, b) => a + b, 0)).toBe(s.files);
    expect(s.recent.map((r) => r.id)).toEqual(["d", "b", "a"]);
  });
});
