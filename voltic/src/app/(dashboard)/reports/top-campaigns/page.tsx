import ReportPageClient from "../components/report-page-client";
import { fetchTopCampaignsReport } from "../actions";
import type { ColumnDef, TopCampaignRow } from "@/types/reports";

const columns: ColumnDef<TopCampaignRow>[] = [
  { key: "name", label: "Campaign", format: "text", width: "220px" },
  { key: "status", label: "Status", format: "text", sortable: false },
  { key: "objective", label: "Objective", format: "text", sortable: false },
  { key: "spend", label: "Spend", format: "currency" },
  { key: "revenue", label: "Revenue", format: "currency" },
  { key: "roas", label: "ROAS", format: "multiplier" },
  { key: "impressions", label: "Impressions", format: "number" },
  { key: "clicks", label: "Clicks", format: "number" },
  { key: "ctr", label: "CTR", format: "percentage" },
  { key: "purchases", label: "Purchases", format: "number" },
];

export default function TopCampaignsPage() {
  return (
    <ReportPageClient<TopCampaignRow>
      title="Top Campaigns"
      description="Campaign performance ranked by key metrics."
      columns={columns}
      defaultSortKey="roas"
      fetchAction={fetchTopCampaignsReport}
    />
  );
}
