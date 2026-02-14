import ReportPageClient from "../components/report-page-client";
import { fetchTopAdsReport } from "../actions";
import type { ColumnDef, TopAdRow } from "@/types/reports";

const columns: ColumnDef<TopAdRow>[] = [
  { key: "name", label: "Ad Name", format: "text", width: "200px" },
  { key: "headline", label: "Headline", format: "truncate" },
  { key: "format", label: "Format", format: "text", sortable: false },
  { key: "spend", label: "Spend", format: "currency" },
  { key: "revenue", label: "Revenue", format: "currency" },
  { key: "roas", label: "ROAS", format: "multiplier" },
  { key: "impressions", label: "Impressions", format: "number" },
  { key: "clicks", label: "Clicks", format: "number" },
  { key: "ctr", label: "CTR", format: "percentage" },
  { key: "purchases", label: "Purchases", format: "number" },
];

export default function TopAdsPage() {
  return (
    <ReportPageClient<TopAdRow>
      title="Top Ads"
      description="Top performing ads ranked by metrics across all campaigns."
      columns={columns}
      defaultSortKey="roas"
      fetchAction={fetchTopAdsReport}
    />
  );
}
