import { Suspense } from "react";
import { FindingsFilters } from "../../../components/FindingsFilters";
import { Card, CellText, EmptyState, ErrorMessage, RiskBadge, Spinner, Table } from "../../../components/lp";
import type { FindingType, Risk } from "../../../lib/detection/types";
import { parseFindingFilters } from "../../../lib/findings/filters";
import { requireUser } from "../../../lib/supabase/require-user";
import { TYPE_LABELS, formatDate } from "../../../lib/ui/labels";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

interface FindingRow {
  id: string;
  type: FindingType;
  risk: Exclude<Risk, "None">;
  count: number;
  masked_example: string;
  scans: { file_name: string; created_at: string } | null;
}

async function FindingsContent({ searchParams }: { searchParams: SearchParams }) {
  const filters = parseFindingFilters(await searchParams);
  const { supabase } = await requireUser();

  let query = supabase
    .from("findings")
    .select("id, type, risk, count, masked_example, scans(file_name, created_at)")
    .limit(1000);
  if (filters.type) query = query.eq("type", filters.type);
  if (filters.risk) query = query.eq("risk", filters.risk);
  const { data, error } = await query;

  const filtered = Boolean(filters.type || filters.risk);
  const rows = ((data ?? []) as unknown as FindingRow[]).sort((a, b) =>
    (b.scans?.created_at ?? "").localeCompare(a.scans?.created_at ?? ""),
  );

  return (
    <>
      <FindingsFilters filters={filters} />
      {error ? (
        <ErrorMessage title="Findings could not be loaded." body="Refresh the page to try again." />
      ) : rows.length === 0 ? (
        <Card title="Findings">
          <EmptyState
            message={
              filtered
                ? "No findings match these filters. Change or clear the filters to see more results."
                : "No findings yet. Upload a synthetic file to see masked findings here."
            }
          />
        </Card>
      ) : (
        <Card title={`Findings (${rows.length})`}>
          <Table<FindingRow>
            caption="Findings"
            rows={rows}
            rowKey={(r) => r.id}
            columns={[
              { key: "file", header: "File", cell: (r) => <CellText>{r.scans?.file_name ?? "—"}</CellText> },
              { key: "date", header: "Scanned", cell: (r) => <CellText>{r.scans ? formatDate(r.scans.created_at) : "—"}</CellText> },
              { key: "type", header: "Type", cell: (r) => <CellText>{TYPE_LABELS[r.type]}</CellText> },
              { key: "risk", header: "Risk", cell: (r) => <RiskBadge risk={r.risk} /> },
              { key: "count", header: "Count", cell: (r) => <CellText>{r.count}</CellText> },
              { key: "masked", header: "Masked example", cell: (r) => <CellText>{r.masked_example}</CellText> },
            ]}
          />
        </Card>
      )}
    </>
  );
}

export default function FindingsPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <>
      <header className="page-header">
        <h1 className="page-title">Findings</h1>
      </header>
      <Suspense fallback={<Spinner label="Loading findings…" />}>
        <FindingsContent searchParams={searchParams} />
      </Suspense>
    </>
  );
}
