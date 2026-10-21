import Link from "next/link";
import { Suspense } from "react";
import { Card, CellText, EmptyState, ErrorMessage, Progress, RiskBadge, Spinner, Table } from "../../components/lp";
import { summarizeScans, type ScanRow } from "../../lib/dashboard/summary";
import { requireUser } from "../../lib/supabase/require-user";
import { ALL_RISKS, formatDate } from "../../lib/ui/labels";

async function DashboardContent() {
  const { supabase } = await requireUser();
  // RLS limits rows to the signed-in user.
  const { data, error } = await supabase
    .from("scans")
    .select("id, file_name, file_risk, total_findings, created_at")
    .order("created_at", { ascending: false })
    .limit(1000);

  if (error) {
    return <ErrorMessage title="The dashboard could not be loaded." body="Refresh the page to try again." />;
  }

  const summary = summarizeScans((data ?? []) as ScanRow[]);

  if (summary.files === 0) {
    return (
      <Card title="No scans yet">
        <EmptyState
          message="No files have been scanned yet. Upload a synthetic CSV or TXT file to see results here."
          action={<Link className="lp-button lp-button--primary lp-button--md" href="/upload">Upload a file</Link>}
        />
      </Card>
    );
  }

  return (
    <>
      <div className="metric-grid">
        <Card title="Files scanned"><p className="metric-value">{summary.files}</p></Card>
        <Card title="Total findings"><p className="metric-value">{summary.totalFindings}</p></Card>
        <Card title="High or Critical files"><p className="metric-value">{summary.highOrCriticalFiles}</p></Card>
      </div>

      <Card title="Risk distribution">
        <div className="stack">
          {ALL_RISKS.map((r) => (
            <Progress
              key={r}
              label={`${r}: ${summary.distribution[r]} of ${summary.files} files`}
              value={(summary.distribution[r] / summary.files) * 100}
            />
          ))}
        </div>
      </Card>

      <Card title="Recent scans">
        <Table<ScanRow>
          caption="Recent scans"
          rows={summary.recent}
          rowKey={(r) => r.id}
          columns={[
            { key: "file", header: "File", cell: (r) => <CellText>{r.file_name}</CellText> },
            { key: "risk", header: "Classification", cell: (r) => <RiskBadge risk={r.file_risk} /> },
            { key: "findings", header: "Findings", cell: (r) => <CellText>{r.total_findings}</CellText> },
            { key: "date", header: "Scanned", cell: (r) => <CellText>{formatDate(r.created_at)}</CellText> },
          ]}
        />
      </Card>
    </>
  );
}

export default function DashboardPage() {
  return (
    <>
      <header className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <Link className="lp-button lp-button--primary lp-button--md" href="/upload">Upload a file</Link>
      </header>
      <Suspense fallback={<Spinner label="Loading dashboard…" />}>
        <DashboardContent />
      </Suspense>
    </>
  );
}
