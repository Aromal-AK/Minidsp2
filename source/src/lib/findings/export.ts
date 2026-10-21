import type { FindingType, Risk } from "../detection/types";
import { TYPE_LABELS } from "../ui/labels";
import type { FindingFilters } from "./filters";

export interface FindingExportRow {
  type: FindingType;
  risk: Exclude<Risk, "None">;
  count: number;
  masked_example: string;
  scans: { file_name: string; created_at: string } | null;
}

const HEADER = ["File", "Scanned (UTC)", "Type", "Risk", "Count", "Masked example"];

/** Quotes per RFC 4180 and defuses spreadsheet formulas in user-controlled text (CSV injection). */
export function csvCell(value: string | number): string {
  let s = String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Same ordering as the Findings table: newest scan first. */
export function findingsToCsv(rows: FindingExportRow[]): string {
  const sorted = [...rows].sort((a, b) => (b.scans?.created_at ?? "").localeCompare(a.scans?.created_at ?? ""));
  const lines = [HEADER, ...sorted.map((r) => [
    r.scans?.file_name ?? "",
    r.scans?.created_at ?? "",
    TYPE_LABELS[r.type] ?? r.type,
    r.risk,
    r.count,
    r.masked_example,
  ])];
  return lines.map((cells) => cells.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

/** Filter values are whitelisted upstream, so the name is always header-safe ASCII. */
export function exportFilename(filters: FindingFilters, now: Date = new Date()): string {
  const parts = ["findings", filters.type, filters.risk?.toLowerCase(), now.toISOString().slice(0, 10)];
  return `${parts.filter(Boolean).join("-")}.csv`;
}

export function buildFindingsExportHref(filters: FindingFilters): string {
  const qs = new URLSearchParams();
  if (filters.type) qs.set("type", filters.type);
  if (filters.risk) qs.set("risk", filters.risk);
  const s = qs.toString();
  return s ? `/api/findings/export?${s}` : "/api/findings/export";
}
