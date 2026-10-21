"use client";

import { useRouter } from "next/navigation";
import { buildFindingsHref, type FindingFilters } from "../lib/findings/filters";
import { FINDING_RISKS, FINDING_TYPES, TYPE_LABELS, isFindingRisk, isFindingType } from "../lib/ui/labels";
import { Dropdown } from "./lp/Dropdown";

const TYPE_OPTIONS = [{ value: "", label: "All types" }, ...FINDING_TYPES.map((t) => ({ value: t, label: TYPE_LABELS[t] }))];
const RISK_OPTIONS = [{ value: "", label: "All risks" }, ...FINDING_RISKS.map((r) => ({ value: r, label: r }))];

export function FindingsFilters({ filters }: { filters: FindingFilters }) {
  const router = useRouter();
  const go = (next: FindingFilters) => router.push(buildFindingsHref(next));

  return (
    <div className="toolbar" role="group" aria-label="Filter findings">
      <Dropdown
        placeholder="Filter by type"
        options={TYPE_OPTIONS}
        value={filters.type ?? ""}
        onChange={(v) => go({ ...filters, type: isFindingType(v) ? v : undefined })}
      />
      <Dropdown
        placeholder="Filter by risk"
        options={RISK_OPTIONS}
        value={filters.risk ?? ""}
        onChange={(v) => go({ ...filters, risk: isFindingRisk(v) ? v : undefined })}
      />
      {(filters.type || filters.risk) && (
        <button type="button" className="lp-button lp-button--secondary lp-button--md" onClick={() => go({})}>
          Clear filters
        </button>
      )}
    </div>
  );
}
