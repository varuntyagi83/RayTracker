import ReportPageClient from "../components/report-page-client";
import { fetchTopHeadlinesReport } from "../actions";
import type { ColumnDef, TopHeadlineRow } from "@/types/reports";

const columns: ColumnDef<TopHeadlineRow>[] = [
  { key: "headline", label: "Headline", format: "text", width: "280px" },
  { key: "adCount", label: "Ads", format: "number" },
  { key: "spend", label: "Spend", format: "currency" },
  { key: "revenue", label: "Revenue", format: "currency" },
  { key: "roas", label: "ROAS", format: "multiplier" },
  { key: "impressions", label: "Impressions", format: "number" },
  { key: "clicks", label: "Clicks", format: "number" },
  { key: "ctr", label: "CTR", format: "percentage" },
];

export default function TopHeadlinesPage() {
  return (
    <ReportPageClient<TopHeadlineRow>
      title="Top Headlines"
      description="Ad headlines grouped and ranked by aggregated performance."
      columns={columns}
      defaultSortKey="roas"
      fetchAction={fetchTopHeadlinesReport}
    />
  );
}
