import ReportPageClient from "../components/report-page-client";
import { fetchTopCopyReport } from "../actions";
import type { ColumnDef, TopCopyRow } from "@/types/reports";

const columns: ColumnDef<TopCopyRow>[] = [
  { key: "body", label: "Ad Copy", format: "truncate", width: "300px" },
  { key: "adCount", label: "Ads", format: "number" },
  { key: "spend", label: "Spend", format: "currency" },
  { key: "revenue", label: "Revenue", format: "currency" },
  { key: "roas", label: "ROAS", format: "multiplier" },
  { key: "impressions", label: "Impressions", format: "number" },
  { key: "clicks", label: "Clicks", format: "number" },
  { key: "ctr", label: "CTR", format: "percentage" },
];

export default function TopCopyPage() {
  return (
    <ReportPageClient<TopCopyRow>
      title="Top Copy"
      description="Ad body copy grouped and ranked by aggregated performance."
      columns={columns}
      defaultSortKey="roas"
      fetchAction={fetchTopCopyReport}
    />
  );
}
