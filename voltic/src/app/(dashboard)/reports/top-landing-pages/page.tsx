import ReportPageClient from "../components/report-page-client";
import { fetchTopLandingPagesReport } from "../actions";
import type { ColumnDef, TopLandingPageRow } from "@/types/reports";

const columns: ColumnDef<TopLandingPageRow>[] = [
  { key: "landingPageUrl", label: "Landing Page", format: "truncate", width: "280px" },
  { key: "spend", label: "Spend", format: "currency" },
  { key: "revenue", label: "Revenue", format: "currency" },
  { key: "roas", label: "ROAS", format: "multiplier" },
  { key: "impressions", label: "Impressions", format: "number" },
  { key: "clicks", label: "Clicks", format: "number" },
  { key: "ctr", label: "CTR", format: "percentage" },
];

export default function TopLandingPagesPage() {
  return (
    <ReportPageClient<TopLandingPageRow>
      title="Top Landing Pages"
      description="Landing page URLs ranked by ROAS and conversion metrics."
      columns={columns}
      defaultSortKey="roas"
      fetchAction={fetchTopLandingPagesReport}
    />
  );
}
