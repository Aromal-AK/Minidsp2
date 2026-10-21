import { describe, expect, it } from "vitest";
import { buildFindingsExportHref, csvCell, exportFilename, findingsToCsv, type FindingExportRow } from "./export";

const row = (over: Partial<FindingExportRow> = {}): FindingExportRow => ({
  type: "email",
  risk: "Low",
  count: 2,
  masked_example: "a***@example.test",
  scans: { file_name: "mix.csv", created_at: "2026-10-21T08:00:00.000Z" },
  ...over,
});

describe("csvCell", () => {
  it("leaves plain values alone and quotes commas, quotes and newlines", () => {
    expect(csvCell("plain")).toBe("plain");
    expect(csvCell(3)).toBe("3");
    expect(csvCell("a,b")).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell("line1\nline2")).toBe('"line1\nline2"');
  });

  it.each(["=SUM(A1:A9)", "+1+1", "-2+3", "@cmd", "\tx", "\rx"])("defuses formula-like value %j", (v) => {
    expect(csvCell(v).replace(/^"/, "").startsWith("'")).toBe(true);
  });
});

describe("findingsToCsv", () => {
  it("writes a header and one CRLF-terminated line per finding", () => {
    const csv = findingsToCsv([row()]);
    expect(csv).toBe(
      "File,Scanned (UTC),Type,Risk,Count,Masked example\r\n" +
        "mix.csv,2026-10-21T08:00:00.000Z,Email,Low,2,a***@example.test\r\n",
    );
  });

  it("uses readable type labels and orders newest scan first", () => {
    const older = row({ type: "payment_card", risk: "Critical", masked_example: "************1111", scans: { file_name: "old.txt", created_at: "2026-10-01T00:00:00.000Z" } });
    const lines = findingsToCsv([older, row()]).trim().split("\r\n");
    expect(lines[1].startsWith("mix.csv")).toBe(true);
    expect(lines[2]).toBe("old.txt,2026-10-01T00:00:00.000Z,Payment card,Critical,2,************1111");
  });

  it("neutralises formulas in user-controlled file names", () => {
    const csv = findingsToCsv([row({ scans: { file_name: "=HYPERLINK(\"x\").csv", created_at: "2026-10-21T08:00:00.000Z" } })]);
    expect(csv).toContain("\"'=HYPERLINK(\"\"x\"\").csv\"");
  });

  it("handles a finding whose scan is missing and an empty list", () => {
    expect(findingsToCsv([row({ scans: null })]).trim().split("\r\n")[1]).toBe(",,Email,Low,2,a***@example.test");
    expect(findingsToCsv([])).toBe("File,Scanned (UTC),Type,Risk,Count,Masked example\r\n");
  });
});

describe("export naming and links", () => {
  const now = new Date("2026-10-21T10:00:00Z");

  it("builds a descriptive, header-safe filename", () => {
    expect(exportFilename({}, now)).toBe("findings-2026-10-21.csv");
    expect(exportFilename({ type: "uk_nino", risk: "High" }, now)).toBe("findings-uk_nino-high-2026-10-21.csv");
  });

  it("carries the active filters into the export link", () => {
    expect(buildFindingsExportHref({})).toBe("/api/findings/export");
    expect(buildFindingsExportHref({ type: "email" })).toBe("/api/findings/export?type=email");
    expect(buildFindingsExportHref({ type: "uk_nino", risk: "High" })).toBe("/api/findings/export?type=uk_nino&risk=High");
  });
});
