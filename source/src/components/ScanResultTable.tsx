import type { Finding } from "../lib/detection/types";
import { TYPE_LABELS } from "../lib/ui/labels";
import { CellText, RiskBadge, Table } from "./lp";

export function ScanResultTable({ findings }: { findings: Finding[] }) {
  return (
    <Table
      caption="Findings in this file"
      rows={findings}
      rowKey={(f) => f.type}
      columns={[
        { key: "type", header: "Type", cell: (f) => <CellText>{TYPE_LABELS[f.type]}</CellText> },
        { key: "risk", header: "Risk", cell: (f) => <RiskBadge risk={f.risk} /> },
        { key: "count", header: "Count", cell: (f) => <CellText>{f.count}</CellText> },
        { key: "masked", header: "Masked example", cell: (f) => <CellText>{f.maskedExample}</CellText> },
      ]}
    />
  );
}
