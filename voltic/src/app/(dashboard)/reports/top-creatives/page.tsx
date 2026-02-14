import ReportPageClient from "../components/report-page-client";
import { fetchTopCreativesReport } from "../actions";
import type { ColumnDef, TopCreativeRow } from "@/types/reports";

const columns: ColumnDef<TopCreativeRow>[] = [
  { key: "name", label: "Creative", format: "text", width: "220px" },
  { key: "format", label: "Format", format: "text", sortable: false },
  { key: "spend", label: "Spend", format: "currency" },
  { key: "revenue", label: "Revenue", format: "currency" },
  { key: "roas", label: "ROAS", format: "multiplier" },
  { key: "impressions", label: "Impressions", format: "number" },
  { key: "clicks", label: "Clicks", format: "number" },
  { key: "ctr", label: "CTR", format: "percentage" },
];

export default function TopCreativesPage() {
  return (
    <ReportPageClient<TopCreativeRow>
      title="Top Creatives"
      description="Creative assets ranked by performance metrics."
      columns={columns}
      defaultSortKey="roas"
      fetchAction={fetchTopCreativesReport}
    />
  );
}
